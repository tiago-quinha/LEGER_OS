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

file_path = "extracto_conta_29-05.txt"

# Regex for the transaction lines
# Example: 04-05 04-05 COMPRA *6939 PINGO DOCE FARO PENHFARO -6,98 526,73
pattern = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+\d+,\d{2}$")

expenses = []
income_total = 0

with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        match = pattern.match(line)
        if match:
            date_str, desc, amount_str = match.groups()
            
            # Parse amount
            amount_val = Decimal(amount_str.replace(',', '.'))
            
            # Parse date (Year 2026 based on file header)
            day, month = date_str.split('-')
            date_obj = datetime(2026, int(month), int(day))
            
            if amount_val < 0:
                # It's an expense
                expenses.append({
                    "amount": str(abs(amount_val)),
                    "merchant": desc.strip(),
                    "date": date_obj.isoformat(),
                    "source": "Santander",
                    "raw_text": line
                })
            elif "ORDENADO" in desc or "TRF.IMED. DE" in desc:
                # It's income
                income_total += amount_val

print(f"Parsed {len(expenses)} expenses.")
print(f"Total parsed income: {income_total}")

# Batch insert expenses
if expenses:
    try:
        # Insert in chunks of 50 to avoid any Supabase limits
        for i in range(0, len(expenses), 50):
            chunk = expenses[i:i+50]
            supabase.table("tracker_expense").insert(chunk).execute()
        print("Successfully imported expenses to tracker_expense.")
    except Exception as e:
        print(f"Error importing expenses: {e}")

# Update monthly income for May 2026
if income_total > 0:
    try:
        supabase.table("income").upsert({
            "amount": str(income_total),
            "month": 5,
            "year": 2026
        }, on_conflict='month,year').execute()
        print("Successfully updated income for May 2026.")
    except Exception as e:
        print(f"Error updating income: {e}")
