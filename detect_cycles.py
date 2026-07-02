import os
import re
from decimal import Decimal
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

# 1. Fetch all transactions that look like the Deloitte paycheck
print("Detecting paycheck cycles...")
res = supabase.table("tracker_expense")\
    .select("*")\
    .ilike("merchant", "%DELOITTE%")\
    .order("date", desc=False)\
    .execute()

paychecks = res.data
if not paychecks:
    print("No paychecks found! Please check your transactions.")
    exit()

# 2. Define cycles
# A cycle starts on the paycheck date and ends the day before the next paycheck
cycles = []
for i in range(len(paychecks)):
    start_date = paychecks[i]['date']
    # End date is day before next paycheck, or null if it's the current cycle
    end_date = paychecks[i+1]['date'] if i + 1 < len(paychecks) else None
    
    cycles.append({
        "name": f"Cycle {i+1} (Started {start_date[:10]})",
        "start_date": start_date,
        "end_date": end_date,
        "income_amount": paychecks[i]['amount']
    })

print(f"Detected {len(cycles)} paycheck cycles.")

# 3. Create table if not exists (via SQL would be better, but we'll use our script pattern)
# For this task, we will update the Dashboard logic to compute cycles on the fly 
# based on 'ORDENADO' entries, which is more 'Big Data' and dynamic.

for c in cycles:
    print(f" - {c['name']}: {c['start_date']} -> {c['end_date'] or 'Present'}")
