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
    "extracto-conta-31-12.txt", # Dec 2025
    "extracto-conta-30-01.txt", # Jan 2026
    "extracto-conta-27-02.txt", # Feb 2026
    "extracto-conta-31-03.txt", # Mar 2026
    "extracto-conta-30-04.txt", # Apr 2026
    "extracto-conta-29-05.txt"  # May 2026
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
    
    # DETERMINE YEAR LOGIC:
    # 31-12 file covers Nov 29 to Dec 31, 2025.
    # 30-01 file covers Jan 1 to Jan 30, 2026.
    # etc.
    if "31-12" in file_path:
        file_year = 2025
    else:
        file_year = 2026
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            match = pattern.match(line)
            if match:
                date_str, desc, amount_str, saldo_str = match.groups()
                
                # Parse amount
                amount_val = Decimal(amount_str.replace('.', '').replace(',', '.'))
                
                # Parse date
                day, month = map(int, date_str.split('-'))
                
                # Special case for the Dec file which starts in Nov
                tx_year = file_year
                if file_year == 2025 and month == 1 and day <= 5: # Safety check if file overlapped into Jan
                    tx_year = 2026
                
                # Use UTC ISO format to prevent Next.js timezone shifts
                date_obj = datetime(tx_year, month, day)
                
                all_tx.append({
                    "amount": str(amount_val),
                    "merchant": desc.strip(),
                    "date": date_obj.strftime("%Y-%m-%dT%H:%M:%S.000Z"), # Forced UTC
                    "source": "Santander",
                    "raw_text": line
                })

print(f"Importing total of {len(all_tx)} transactions...")
for i in range(0, len(all_tx), 50):
    chunk = all_tx[i:i+50]
    supabase.table("tracker_expense").insert(chunk).execute()

print("Successfully re-imported all historical data with CORRECT YEARS.")

# Reset Income for Dec 2025 (Salary)
supabase.table("income").upsert({
    "amount": 500.00,
    "month": 12,
    "year": 2025
}, on_conflict='month,year').execute()
print("Set Dec 2025 Income to 500.00")
