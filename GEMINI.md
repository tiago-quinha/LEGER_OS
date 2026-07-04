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

### Projection Engine & Financial Analysis
The daily projection engine (`simulateExpertDailyProjection` in `DashboardView.tsx`) models future end-of-day balances using professional personal data analyst standards:
- **Recency Decay Weighting**: Variable spending is calculated using an exponential time-decay weighting ($\lambda = 0.12$, ~6-day half-life). Recent transactions carry exponentially higher weight than older transactions in the cycle, ensuring the algorithm adapts daily and expense-by-expense to lifestyle shifts.
- **Heavier Current Cycle Alpha**: When blending current cycle velocity with multi-month historical baselines, the weighting factor ($\alpha$) heavily favors the current cycle ($\alpha = \min(1.0, 0.65 + 0.35 \cdot (\text{days elapsed} / \text{total days}))$), recognizing that current cycle spending is the most accurate reflection of the user's present situation.
- **Conversational AI Overrides**: Users can set natural language assumptions in Leger AI (e.g., "I'm working hybrid, reduce gas spend by 30%"). These overrides are stored in `localStorage` (`leger_cycle_overrides`) and dynamically modify category burn rates inside the simulation without requiring visual UI widgets.

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

### Production Deployment
To deploy application changes directly to live production on Vercel, execute the Vercel CLI directly in the terminal:
```bash
npx vercel --prod --yes
```
**Note:** Do NOT rely on `git push` for triggering production deployments, as the local workspace repository does not maintain a configured remote tracking destination.

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
5.  **No Vibecoded Slop / Minimal UI Standard:** Do not generate unsolicited UI components, decorative math, speculative metrics, or overengineered abstractions. Keep UI button labels and typography clean, professional, and minimal—do NOT add conversational emojis (e.g., ⚡, 🤖) or decorative icon components inside action buttons unless explicitly requested. All code changes must be clean, minimal, robust, and strictly scoped to explicit user requirements—never add unprompted dashboard widgets, speculative analytics cards, or complex helper libraries unless explicitly requested.
6.  **Projection Engine Invariants:** Never simplify or remove the recency decay weighting or heavy current cycle alpha ($\alpha \ge 0.65$) in `DashboardView.tsx`. All adjustments to future cash forecasts must respect stored conversational overrides and preserve mathematical rigor over visual ornamentation.
