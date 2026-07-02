import os
from decimal import Decimal
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

cycle_start = "2025-12-23T00:00:00.000Z"
cycle_end = "2026-01-27T00:00:00.000Z"

# 1. Get snapshot for Dec 1st
snapshot_res = supabase.table("account_balance").select("*").eq("date", "2025-12-01").single().execute()
snap_amount = Decimal(str(snapshot_res.data['amount']))
print(f"Snapshot Dec 1st: {snap_amount}")

# 2. Get transactions between Dec 1 and Dec 23
pre_cycle_tx = supabase.table("tracker_expense")\
    .select("*")\
    .gte("date", "2025-12-01T00:00:00.000Z")\
    .lt("date", cycle_start)\
    .execute()

pre_sum = sum(Decimal(str(tx['amount'])) for tx in pre_cycle_tx.data)
balance_at_start = snap_amount + pre_sum
print(f"Transactions Dec 1 to Dec 22: {pre_sum}")
print(f"Calculated Balance on Dec 23: {balance_at_start}")

# 3. Get transactions in the cycle (Dec 23 to Jan 26)
cycle_tx = supabase.table("tracker_expense")\
    .select("*")\
    .gte("date", cycle_start)\
    .lt("date", cycle_end)\
    .execute()

cycle_sum = sum(Decimal(str(tx['amount'])) for tx in cycle_tx.data)
calculated_end = balance_at_start + cycle_sum
print(f"Transactions Dec 23 to Jan 26: {cycle_sum}")
print(f"Calculated End Balance: {calculated_end}")
print(f"User expected: 11.52")
print(f"Difference: {calculated_end - Decimal('11.52')}")
