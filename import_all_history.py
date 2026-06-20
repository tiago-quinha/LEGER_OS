import os
import re
from decimal import Decimal
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

files = [
    "extracto-conta-31-12.txt", # Dec 2025 (Period: 2025-11-29 to 2025-12-31)
    "extracto-conta-30-01.txt", # Jan 2026
    "extracto-conta-27-02.txt", # Feb 2026
    "extracto-conta-31-03.txt", # Mar 2026
    "extracto_conta_30-04.txt"  # Apr 2026
]

# Regex for the transaction lines
# Example: 02-12 02-12 COMPRA *6939 E0860 E.S. MONCHIQUE -1,40 408,11
pattern = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$")
balance_pattern = re.compile(r"Saldo Inicial EUR (\d+,\d{2})")
period_pattern = re.compile(r"PERÍODO DE (\d{4})-\d{2}-\d{2} A (\d{4})-\d{2}-\d{2}")

all_expenses = []
monthly_incomes = {} # (month, year) -> total_income

for file_path in files:
    print(f"Processing {file_path}...")
    
    current_year = 2026 # Default
    file_income = 0
    file_expenses = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
        # Determine year from period
        period_match = period_pattern.search(content)
        if period_match:
            # We use the start year mostly, but handle 12-month rollover
            start_year = int(period_match.group(1))
            end_year = int(period_match.group(2))
        else:
            start_year = 2026
            end_year = 2026

        # Get Saldo Inicial
        balance_match = balance_pattern.search(content)
        if balance_match:
            initial_balance = Decimal(balance_match.group(1).replace(',', '.'))
            # Determine date for initial balance (usually start of period)
            # For simplicity, we use the start date if found, or just the month
            if "31-12" in file_path:
                balance_date = "2025-11-29"
            elif "30-01" in file_path:
                balance_date = "2026-01-01"
            elif "27-02" in file_path:
                balance_date = "2026-02-01"
            elif "31-03" in file_path:
                balance_date = "2026-03-01"
            elif "30-04" in file_path:
                balance_date = "2026-04-01"
            
            try:
                supabase.table("account_balance").upsert({
                    "amount": str(initial_balance),
                    "date": balance_date
                }, on_conflict='date').execute()
                print(f"  Inserted Saldo Inicial: {initial_balance} on {balance_date}")
            except Exception as e:
                print(f"  Error inserting balance: {e}")

        # Parse transactions line by line
        f.seek(0)
        for line in f:
            line = line.strip()
            match = pattern.match(line)
            if match:
                date_str, desc, amount_str, saldo_str = match.groups()
                
                # Parse amount
                amount_val = Decimal(amount_str.replace(',', '.'))
                
                # Determine transaction year
                day, month = map(int, date_str.split('-'))
                tx_year = start_year if month >= 11 else end_year
                date_obj = datetime(tx_year, month, day)
                
                # Group income by month/year
                period_key = (month, tx_year)
                if period_key not in monthly_incomes:
                    monthly_incomes[period_key] = 0

                if amount_val < 0:
                    # It's an expense
                    file_expenses.append({
                        "amount": str(abs(amount_val)),
                        "merchant": desc.strip(),
                        "date": date_obj.isoformat(),
                        "source": "Santander",
                        "raw_text": line
                    })
                elif "ORDENADO" in desc or "TRF.IMED. DE" in desc or "REWARDS SANTANDER" in desc:
                    # It's income
                    monthly_incomes[period_key] += amount_val

    print(f"  Parsed {len(file_expenses)} expenses.")
    all_expenses.extend(file_expenses)

# Batch insert all expenses
if all_expenses:
    try:
        print(f"Importing total of {len(all_expenses)} expenses...")
        for i in range(0, len(all_expenses), 50):
            chunk = all_expenses[i:i+50]
            supabase.table("tracker_expense").insert(chunk).execute()
        print("Successfully imported all expenses.")
    except Exception as e:
        print(f"Error importing expenses: {e}")

# Upsert all monthly incomes
for (month, year), total_amount in monthly_incomes.items():
    if total_amount > 0:
        try:
            supabase.table("income").upsert({
                "amount": str(total_amount),
                "month": month,
                "year": year
            }, on_conflict='month,year').execute()
            print(f"Updated income for {month}/{year}: {total_amount}")
        except Exception as e:
            print(f"Error updating income for {month}/{year}: {e}")
