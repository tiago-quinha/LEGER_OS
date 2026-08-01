-- Migration: Add performance indexes for tracker_expense
-- 2026-08-01 - Improve query speed for per-user, date, and merchant searches

-- Ensure pg_trgm extension is available (requires appropriate DB privileges)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite index to speed up common per-user and date range queries and category filters
CREATE INDEX IF NOT EXISTS idx_tracker_expense_user_date_category ON tracker_expense (user_id, date, category_id);

-- GIN trigram index on merchant for fast ILIKE / fuzzy searches
CREATE INDEX IF NOT EXISTS idx_tracker_expense_merchant_trgm ON tracker_expense USING gin (merchant gin_trgm_ops);

-- Suggestion: After running migrations, notify PostgREST (Supabase) to refresh schema cache
-- NOTIFY pgrst, 'reload schema';
