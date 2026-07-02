import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

sql = """
-- 1. Add onboarding_completed to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
UPDATE profiles SET onboarding_completed = true WHERE role = 'super_user' OR is_admin = true;

-- 2. Add user_id column with default auth.uid() to all data tables
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['tracker_expense', 'budgets', 'account_balance', 'income', 'merchant_rules', 'categories']) LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();', tbl);
    END LOOP;
END $$;

-- 3. Backfill all existing transactions, budgets, balances, income, and rules to the oldest Admin/Super-User (Your Account!)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM profiles WHERE role = 'super_user' OR is_admin = true ORDER BY updated_at ASC LIMIT 1;
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM profiles ORDER BY updated_at ASC LIMIT 1;
    END IF;

    IF admin_id IS NOT NULL THEN
        UPDATE tracker_expense SET user_id = admin_id WHERE user_id IS NULL;
        UPDATE budgets SET user_id = admin_id WHERE user_id IS NULL;
        UPDATE account_balance SET user_id = admin_id WHERE user_id IS NULL;
        UPDATE income SET user_id = admin_id WHERE user_id IS NULL;
        UPDATE merchant_rules SET user_id = admin_id WHERE user_id IS NULL;
        RAISE NOTICE 'Backfilled existing records to user %', admin_id;
    END IF;
END $$;

-- 4. Enable Row Level Security on all tables
ALTER TABLE tracker_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any to prevent conflicts
DO $$ 
DECLARE
    tbl TEXT;
    pol TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['tracker_expense', 'budgets', 'account_balance', 'income', 'merchant_rules', 'categories']) LOOP
        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public' LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol, tbl);
        END LOOP;
    END LOOP;
END $$;

-- 6. Create strict RLS policies for private user tables
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['tracker_expense', 'budgets', 'account_balance', 'income', 'merchant_rules']) LOOP
        EXECUTE format('CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can insert own %s" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can update own %s" ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Users can delete own %s" ON %I FOR DELETE USING (auth.uid() = user_id);', tbl, tbl);
    END LOOP;
END $$;

-- 7. Create RLS policies for categories (allow viewing shared defaults where user_id IS NULL OR own categories)
CREATE POLICY "Users can view default or own categories" ON categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- 8. Update handle_new_user trigger function to set onboarding_completed = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, paycheck_keyword, role, is_admin, onboarding_completed)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'SALARY',
    'user',
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

try:
    print("Connecting to Supabase Database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    print("Executing multi-tenant RLS migration...")
    cur.execute(sql)
    conn.commit()
    print("SUCCESS: Multi-tenant database isolation and RLS policies applied successfully!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"ERROR executing migration: {e}")
