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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tracker_expense' AND column_name='is_anomaly') THEN
        ALTER TABLE tracker_expense ADD COLUMN is_anomaly BOOLEAN DEFAULT false;
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'FREE';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_api_key TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cached_telemetry JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"morning_outlook": true, "subscription_radar": true, "budget_alerts": true, "velocity_spikes": true, "payday_alerts": true, "cycle_closing": true, "portfolio_alerts": true, "preferred_hour": 8, "preferred_minute": 30}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscriptions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_radar_preferences JSONB DEFAULT '{"dismissed": [], "overrides": {}, "pinned": []}'::jsonb;

-- Create push_subscriptions table if not exists for scalable indexed lookups
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON public.profiles(timezone);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can view their own push subscriptions') THEN
        CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can insert their own push subscriptions') THEN
        CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can delete their own push subscriptions') THEN
        CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

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
  INSERT INTO public.profiles (id, username, full_name, paycheck_keyword, role, is_admin, onboarding_completed, target_monthly_income, target_monthly_spend, currency, language, subscription_tier, ai_provider, custom_api_key, decay_weight, ai_quota_usage, ai_quota_limit, projection_overrides)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'SALARY',
    'user',
    false,
    false,
    2500,
    1500,
    'EUR',
    'en-US',
    'FREE',
    'gemini',
    '',
    0.12,
    0,
    50,
    '[]'::jsonb
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



-- Add performance indexes for tracker_expense (ensure pg_trgm extension exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tracker_expense_user_date_category ON tracker_expense (user_id, date, category_id);
CREATE INDEX IF NOT EXISTS idx_tracker_expense_merchant_trgm ON tracker_expense USING gin (merchant gin_trgm_ops);

-- Expand source column to TEXT to prevent VARCHAR(20) truncation errors
ALTER TABLE tracker_expense ALTER COLUMN source TYPE TEXT;

-- Portfolio assets table
CREATE TABLE IF NOT EXISTS public.portfolio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    symbol TEXT,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('stock_etf', 'crypto', 'cash_equivalent', 'commodity', 'other')),
    quantity NUMERIC(18, 8) NOT NULL DEFAULT 0,
    buy_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    current_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    institution TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio historical valuation snapshots table
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_net_worth NUMERIC(14, 2) NOT NULL,
    liquid_cash NUMERIC(14, 2) NOT NULL,
    invested_capital NUMERIC(14, 2) NOT NULL,
    total_gain_loss NUMERIC(14, 2) NOT NULL,
    asset_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

-- Enable RLS on portfolio tables
ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio_assets if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assets' AND policyname = 'Users can view their own portfolio assets') THEN
        CREATE POLICY "Users can view their own portfolio assets" ON public.portfolio_assets FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assets' AND policyname = 'Users can insert their own portfolio assets') THEN
        CREATE POLICY "Users can insert their own portfolio assets" ON public.portfolio_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assets' AND policyname = 'Users can update their own portfolio assets') THEN
        CREATE POLICY "Users can update their own portfolio assets" ON public.portfolio_assets FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_assets' AND policyname = 'Users can delete their own portfolio assets') THEN
        CREATE POLICY "Users can delete their own portfolio assets" ON public.portfolio_assets FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_snapshots' AND policyname = 'Users can view their own portfolio snapshots') THEN
        CREATE POLICY "Users can view their own portfolio snapshots" ON public.portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_snapshots' AND policyname = 'Users can insert their own portfolio snapshots') THEN
        CREATE POLICY "Users can insert their own portfolio snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_snapshots' AND policyname = 'Users can update their own portfolio snapshots') THEN
        CREATE POLICY "Users can update their own portfolio snapshots" ON public.portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_snapshots' AND policyname = 'Users can delete their own portfolio snapshots') THEN
        CREATE POLICY "Users can delete their own portfolio snapshots" ON public.portfolio_snapshots FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- System Feedback table
CREATE TABLE IF NOT EXISTS public.system_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    category TEXT NOT NULL DEFAULT 'General Feedback',
    message TEXT NOT NULL,
    include_telemetry BOOLEAN DEFAULT false,
    telemetry JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_feedback
ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_feedback' AND policyname = 'Users can insert their own feedback') THEN
        CREATE POLICY "Users can insert their own feedback" ON public.system_feedback FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_feedback' AND policyname = 'Admins can view feedback') THEN
        CREATE POLICY "Admins can view feedback" ON public.system_feedback FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Reload PostgREST schema cache in Supabase so new columns and indexes are immediately recognized by the API
NOTIFY pgrst, 'reload schema';
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
