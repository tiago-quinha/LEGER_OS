# MoneyTrack Project Overview

MoneyTrack is a personal finance tracking application designed to monitor expenses, budgets, and income cycles. It features a modern Next.js frontend and a Supabase (PostgreSQL) backend, with heavy reliance on Python scripts for data ingestion and database reconciliation.

## Tech Stack

- **Frontend:** Next.js 16.2.9 (App Router), React 19, Tailwind CSS 4, Lucide icons, Recharts, Shadcn UI.
- **Backend:** Supabase (Auth, Database, Storage).
- **AI Integration:** Gemini 1.5 Flash for automatic transaction categorization.
- **Data Ingestion:** Python scripts (Regex-based text parsing of bank extracts).

## Project Structure

- `src/app/`: Next.js application routes and logic.
- `src/components/`: Reusable React components, including complex views like `DashboardView` and `ExpensesView`.
- `src/lib/`: Utility libraries, including the Supabase client.
- `Python Scripts` (root): A collection of tools for data management:
    - `import_transactions.py`: Parses Santander bank extracts and imports them to Supabase.
    - `audit_balances.py`: Reconciles bank statements and updates the `account_balance` snapshots.
    - `update_schema.py`: Manages the PostgreSQL schema via direct connections.
- `archive/`: Legacy Django-based implementation of the tracker.

## Key Concepts

### Paycheck Cycles
The application tracks finances based on "paycheck cycles" rather than strictly calendar months. A cycle typically starts when a "DELOITTE" paycheck is received and ends just before the next one arrives.

### Data Model
- `tracker_expense`: Stores individual transactions (legacy naming convention).
- `categories`: User-defined expense categories with colors and icons.
- `budgets`: Monthly budget targets per category.
- `income`: Tracks monthly income snapshots.
- `account_balance`: Periodic balance snapshots used for reconciliation.

## Building and Running

### Frontend
```bash
npm install
npm run dev
```

### Python Tools
Requires a Python environment with the following dependencies:
```bash
pip install supabase psycopg2 python-dotenv
```
Most scripts rely on a `.env` file containing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL` (Direct Postgres connection for schema updates)
- `GOOGLE_GEMINI_API_KEY`

## Development Conventions

1.  **Next.js 16.2.9 Notice:** This project uses a specialized version of Next.js. Refer to `AGENTS.md` for specific rules and breaking changes.
2.  **Schema Updates:** Use `update_schema.py` or similar scripts for database changes to keep everything in sync.
3.  **Data Importing:** Bank extracts are provided as `.txt` or `.pdf` files. Parsing logic is defined in `import_transactions.py` and `audit_balances.py`.
4.  **Categorization:** New transactions can be automatically categorized via the `/api/categorize` endpoint which interfaces with Gemini.
