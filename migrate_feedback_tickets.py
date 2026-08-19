import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("No DATABASE_URL found in .env, checking fallback...")

sql = """
-- Ensure system_feedback table exists
CREATE TABLE IF NOT EXISTS public.system_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    category TEXT NOT NULL DEFAULT 'General Feedback',
    message TEXT NOT NULL,
    include_telemetry BOOLEAN DEFAULT false,
    telemetry JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open',
    admin_reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.system_feedback ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on system_feedback
ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.system_feedback;
    CREATE POLICY "Users can insert their own feedback" ON public.system_feedback FOR INSERT WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Users can view their own feedback" ON public.system_feedback;
    CREATE POLICY "Users can view their own feedback" ON public.system_feedback FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Admins full access to feedback" ON public.system_feedback;
    CREATE POLICY "Admins full access to feedback" ON public.system_feedback FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'super_admin' OR profiles.role = 'admin')
        )
    );
END $$;

NOTIFY pgrst, 'reload schema';
"""

try:
    if db_url:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("Successfully updated system_feedback schema with status and admin_reply columns!")
        cur.close()
        conn.close()
    else:
        print("Database connection string not configured directly.")
except Exception as e:
    print(f"Error updating system_feedback schema: {e}")
