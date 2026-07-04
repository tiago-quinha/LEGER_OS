import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT
);

-- Add default categories
INSERT INTO categories (name, color, icon) VALUES 
('Food', '#FF5733', 'Utensils'),
('Transport', '#3357FF', 'Car'),
('Housing', '#33FF57', 'Home'),
('Entertainment', '#F333FF', 'Tv'),
('Health', '#FF3333', 'Heart'),
('Other', '#888888', 'Plus')
ON CONFLICT (name) DO NOTHING;

-- Link expenses to categories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracker_expense' AND column_name='category_id') THEN
        ALTER TABLE tracker_expense ADD COLUMN category_id INTEGER REFERENCES categories(id);
    END IF;
END $$;

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    amount NUMERIC(10, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    UNIQUE(category_id, month, year)
);

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    full_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paycheck_keyword TEXT,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false
);

-- Add columns if table already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_monthly_income NUMERIC(10, 2) DEFAULT 2500;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_monthly_spend NUMERIC(10, 2) DEFAULT 1500;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, paycheck_keyword, role, is_admin, onboarding_completed, target_monthly_income, target_monthly_spend)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'SALARY',
    'user',
    false,
    false,
    2500,
    1500
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users who don't have profiles
INSERT INTO public.profiles (id, username, full_name, paycheck_keyword, role, is_admin)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'username', SPLIT_PART(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', ''),
  'SALARY',
  'super_user',
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE SET paycheck_keyword = 'SALARY' WHERE profiles.paycheck_keyword IS NULL;

-- Make sure existing users get admin testing flags
UPDATE profiles SET role = 'super_user', is_admin = true WHERE is_admin IS NOT true;
"""

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("Database schema updated successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating database: {e}")
