import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 1. Fetch current profiles
    cur.execute("SELECT id, username, full_name, role, is_admin, subscription_tier, ai_quota_limit FROM profiles;")
    rows = cur.fetchall()
    print("--- Current Profiles in Database ---")
    for r in rows:
        print(f"ID: {r[0]}, Username: {r[1]}, Role: {r[3]}, Admin: {r[4]}, Tier: {r[5]}, Quota: {r[6]}")
    
    # 2. Update all profiles (or admin profile) to PRO with unlimited quota
    cur.execute("""
        UPDATE profiles 
        SET 
            subscription_tier = 'PRO',
            is_admin = true,
            role = 'super_user',
            ai_quota_limit = 999999
        WHERE id IS NOT NULL;
    """)
    conn.commit()
    print(f"\nSuccessfully activated PRO status, super_user role, and 999999 AI quota for {cur.rowcount} profile(s).")
    
    # 3. Reload PostgREST schema cache
    cur.execute("NOTIFY pgrst, 'reload schema';")
    conn.commit()
    
    # 4. Verify updated profiles
    cur.execute("SELECT id, username, full_name, role, is_admin, subscription_tier, ai_quota_limit FROM profiles;")
    updated_rows = cur.fetchall()
    print("\n--- Updated Profiles ---")
    for r in updated_rows:
        print(f"ID: {r[0]}, Username: {r[1]}, Role: {r[3]}, Admin: {r[4]}, Tier: {r[5]}, Quota: {r[6]}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating profiles: {e}")
