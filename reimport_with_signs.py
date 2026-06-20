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

# Regex for the transaction lines
pattern = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$")

all_tx = []

# 1. Clear existing expenses
print("Clearing tracker_expense table...")
supabase.table("tracker_expense").delete().neq("id", 0).execute()

for file_path in files:
    if not os.path.exists(file_path):
        continue
    print(f"Processing {file_path}...")
    
    # Determine years from filename
    month_file = int(file_path.split('-')[-2].replace('extracto_conta_', ''))
    start_year = 2025 if month_file == 12 else 2026
    end_year = 2026
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            match = pattern.match(line)
            if match:
                date_str, desc, amount_str, saldo_str = match.groups()
                
                # Parse amount (KEEP THE SIGN!)
                amount_val = Decimal(amount_str.replace('.', '').replace(',', '.'))
                
                # Parse date
                day, month = map(int, date_str.split('-'))
                tx_year = start_year if month >= 11 else end_year
                date_obj = datetime(tx_year, month, day)
                
                all_tx.append({
                    "amount": str(amount_val), # Storing as signed string
                    "merchant": desc.strip(),
                    "date": date_obj.isoformat(),
                    "source": "Santander",
                    "raw_text": line
                })

print(f"Importing total of {len(all_tx)} transactions...")
for i in range(0, len(all_tx), 50):
    chunk = all_tx[i:i+50]
    supabase.table("tracker_expense").insert(chunk).execute()

print("Successfully re-imported all historical data with signs.")

# Ensure May income is exactly 500 for the Budget display
supabase.table("income").upsert({
    "amount": 500.00,
    "month": 5,
    "year": 2026
}, on_conflict='month,year').execute()
print("Set May Income (Salary) to 500.00")
