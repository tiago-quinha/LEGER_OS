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
    "extracto-conta-31-12.txt",
    "extracto-conta-30-01.txt",
    "extracto-conta-27-02.txt",
    "extracto-conta-31-03.txt",
    "extracto-conta-30-04.txt",
    "extracto-conta-29-05.txt"
]

# Regex patterns
tx_pattern = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$")
balance_pattern = re.compile(r"Saldo Inicial EUR (\d+,\d{2})")
final_balance_pattern = re.compile(r"TOTAL\s+(\d+,\d{2})") # Usually at the top summary

print("--- BALANCE RECONCILIATION AUDIT ---")

for file_path in files:
    print(f"\nAnalyzing {file_path}...")
    
    file_expenses = []
    file_income = []
    start_bal = Decimal('0.00')
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        content = "".join(lines)
        
        # 1. Get Saldo Inicial
        match_start = balance_pattern.search(content)
        if match_start:
            start_bal = Decimal(match_start.group(1).replace(',', '.'))
            print(f"  [FOUND] Saldo Inicial: {start_bal}")
        
        # 2. Parse all transactions in this file to verify math
        calculated_balance = start_bal
        
        for line in lines:
            line = line.strip()
            match = tx_pattern.match(line)
            if match:
                date_str, desc, amount_str, saldo_str = match.groups()
                amount_val = Decimal(amount_str.replace(',', '.'))
                saldo_val = Decimal(saldo_str.replace(',', '.'))
                
                calculated_balance += amount_val
                
                if amount_val < 0:
                    file_expenses.append(amount_val)
                else:
                    file_income.append(amount_val)

        print(f"  [STATS] Expenses: {len(file_expenses)} items | Income: {len(file_income)} items")
        print(f"  [MATH] Start ({start_bal}) + Income ({sum(file_income)}) + Expenses ({sum(file_expenses)}) = {calculated_balance}")
        
        # 3. Update account_balance table for this specific date
        # Map specific snapshots to start of periods mentioned in files
        if "31-12" in file_path: snap_date = "2025-12-01"
        elif "30-01" in file_path: snap_date = "2026-01-01"
        elif "27-02" in file_path: snap_date = "2026-02-01"
        elif "31-03" in file_path: snap_date = "2026-03-01"
        elif "30-04" in file_path: snap_date = "2026-04-01"
        elif "29-05" in file_path: snap_date = "2026-05-01"
        else: snap_date = "2026-06-01"

        try:
            supabase.table("account_balance").upsert({
                "amount": str(start_bal),
                "date": snap_date
            }, on_conflict='date').execute()
            print(f"  [SYNC] Saved snapshot for {snap_date} to Supabase.")
        except Exception as e:
            print(f"  [ERROR] Sync failed: {e}")


print("\n--- AUDIT COMPLETE ---")
