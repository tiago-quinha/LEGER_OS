# Leger_OS // Session Journal (LLM.md)

Welcome to the LEGER_OS mainframe! This journal tracks the exact structure, implementation details, conventions, and status of the project to ensure rapid context loading at the start of every session.

## System Context & Tech Stack
* **Frontend**: Next.js 16.2.9 (App Router / Turbopack), React 19, Tailwind CSS 4, Framer Motion, Recharts, Lucide Icons.
  * *Critical Notice*: Next.js 16.2.9 contains custom API conventions and deprecations (e.g., `"middleware"` is deprecated in favor of `"proxy"`). Consult `node_modules/next/dist/docs/` for framework specifics.
* **Backend**: Supabase (Postgres) Database, Storage, and GoTrue Auth.
* **AI Ingestion/Categorization**: Google Gemini (via `@google/generative-ai` SDK) using `gemini-2.5-pro` model (or configurable via `GEMINI_MODEL`).

## Main Architecture & Routing
All pages are authenticated using the client-side session checker [SystemGuard.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/components/SystemGuard.tsx) and wrapped in [SystemProvider](file:///C:/Users/Quinha/Documents/leger_os/src/lib/SystemContext.tsx) layout contexts.
The application layout is structured by [AppLayout.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/components/AppLayout.tsx) to control grid layouts:
* **Private Pages** (Dashboard `/`, LEGER_AI `/leger-ai`, Ledger `/expenses`, Budgets `/budgets`, Analytics `/analytics`): Render the cybernetic [Navigation](file:///C:/Users/Quinha/Documents/leger_os/src/components/Navigation.tsx) sidebar (desktop) / bottom navbar (mobile) and apply desktop content offset `md:pl-64`.
* **Public Pages** (`/login`, `/signup`): Render full-screen without sidebars or guards.

## Database Schema (PostgreSQL)
* **`tracker_expense`**: Individual transactions. Amounts are stored as **signed strings** (expenses are negative, income is positive).
  * Columns: `id` (int8/serial), `amount` (numeric/text), `merchant` (text), `date` (timestamp), `source` (text), `raw_text` (text), `category_id` (int REFERENCES categories).
* **`categories`**: User-defined transaction categories.
  * Columns: `id` (serial), `name` (text, unique), `color` (text), `icon` (text).
* **`budgets`**: Budget constraints defined per category per paycheck month/year.
  * Columns: `id` (serial), `category_id` (int), `amount` (numeric), `month` (int), `year` (int), `UNIQUE(category_id, month, year)`.
* **`income`**: Monthly income snapshots (primarily payroll).
  * Columns: `id` (serial), `amount` (numeric), `month` (int), `year` (int), `UNIQUE(month, year)`.
* **`account_balance`**: Bank statement reconciliation balance snapshots.
  * Columns: `id` (serial), `amount` (numeric), `date` (date, unique).
* **`profiles`**: User profile parameters.
  * Columns: `id` (uuid references auth.users), `username` (text), `full_name` (text), `updated_at` (timestamp), `paycheck_keyword` (text, defaults to `'DELOITTE'`).

## Key Business Logic
### 1. Paycheck Cycles
The database does not segment statistics strictly by calendar month. Rather, it calculates cycles starting from a user-customizable paycheck transaction (defined by `profiles.paycheck_keyword` e.g., `'DELOITTE'`) to the next paycheck. If no paycheck is found, it falls back to standard monthly calendar intervals.

### 2. High-Precision Opening Balance Calculation
To get the active balance at any specific timestamp in a cycle, the system finds the closest prior `account_balance` snapshot, and sums up all subsequent transactions in `tracker_expense` between that snapshot date and the cycle start date:
$$\text{Opening Balance} = \text{Snapshot Balance} + \sum \text{Transactions between Snapshot and Cycle Start}$$

## Implemented Modifications
1. **Dynamic App Wrapper Integration**: Mounted contexts and page layouts in [layout.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/app/layout.tsx) and built [AppLayout.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/components/AppLayout.tsx) to provide standard side/bottom navigation.
2. **Dashboard Assembly**: Wired up [page.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/app/page.tsx) to execute parallel queries for paycheck cycles, calculating starting balance snapshots and comparative metrics before rendering [DashboardView.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/components/DashboardView.tsx).
3. **AI Strategy Injection**: Embedded the `LegerAIIntelligence` strategy panel on the main homepage dashboard to display Gemini-driven risk analyses and savings plans in real-time.
4. **In-App Statement Ingestion**: Built a complete statement uploader and regex parser inside [ExpensesView.tsx](file:///C:/Users/Quinha/Documents/leger_os/src/components/ExpensesView.tsx) that replaces local Python workflows with an interactive drag-and-drop parsing dashboard.
5. **Production Ingestion API & Auto-Save**: Upgraded the `/api/ingest/ai-parse` route to support background transaction sync. Implemented multi-tenant database queries securely using the server-side Supabase Admin client, added a robust inline retry wrapper with exponential backoff for handling `429 Rate Limit` issues, and added an `autoSave: true` database writer that resolves categories and commits transaction records directly to `tracker_expense` upon notification ingestion.
6. **Database Security Hardening & RLS Optimization**: Dropped 10 orphaned Django legacy tables from the database to clear Supabase dashboard console warnings. Secured trigger functions (`handle_new_user`, `set_user_id`) by adding `SET search_path = public` to prevent search-path injection. Optimized RLS policies across all active tables by removing permissive anonymous (`anon`) write privileges and wrapping comparison expressions in cached `(select auth.uid())` subqueries to resolve Supabase "Auth RLS Initialization Plan" performance advisor warnings.
7. **AI Model Optimization & Diagnostic Suite**: Developed [scratch/test_all_endpoints.py](file:///C:/Users/Quinha/Documents/leger_os/scratch/test_all_endpoints.py) to run health audits on all server route integrations. Reconfigured `/api/analyze-cycle` and `/api/leger-ai/query` to target `modelType: "flash"`, eliminating `429 Rate Limit` errors during sequential requests and achieving a full `200 OK` health report for all core systems.




## Mobile Responsive Guidelines
* **Sidebar Layout**: Hides sidebar on screens smaller than `768px` (`md`). Renders bottom navigation bar instead.
* **Forms & Grid layouts**: Grid columns default to `grid-cols-1` on mobile, scaling to `md:grid-cols-2` or `lg:grid-cols-3` on desktop.
* **Overflow containers**: Transaction table outputs must be wrapped in `overflow-x-auto` to prevent viewport clipping.
* **Interactive sizing**: Checkbox hits, selectors, and buttons have size padding (e.g. `p-2` or `h-10`) to allow touch interactions.
