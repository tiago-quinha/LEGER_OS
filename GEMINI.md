# LEGER_OS // Personal Finance Mainframe

LEGER_OS is a high-precision personal finance tracking application and operating system designed to monitor expenses, budgets, and income cycles. It features a modern Next.js frontend and a Supabase (PostgreSQL) backend, with heavy reliance on Python scripts and real-time AI ingestion for data reconciliation.

## Tech Stack

- **Frontend:** Next.js 16.2.9 (App Router), React 19, Tailwind CSS 4, Lucide icons, Recharts, Shadcn UI.
- **Backend:** Supabase (Auth, Database, Storage).
- **AI Integration (Multi-Provider Bridge):** Powered by `src/lib/ai-bridge.ts`, supporting Google Gemini (`gemini-2.5-pro`, never use `1.5-flash`), OpenAI (`gpt-4o-mini`), Groq (`llama-3.3-70b-versatile`), and self-hosted Ollama (free local inference without API fees). Users configure their preferred provider and custom API keys in System Settings.
- **Data Ingestion:** Python scripts and in-app statement ingestion (Regex + AI parsing of bank extracts).

## Project Structure

- `src/app/`: Next.js application routes and logic.
    - `/leger-ai/`: Natural language assistant page leveraging `LegerAIPageView.tsx`.
    - `/system/`: Core configuration dashboard utilizing `SystemConfigView.tsx` for API provider keys, custom quotas, and system health checks.
    - `/analytics/`: Analytics view showing cash flow comparisons and category breakdowns.
- `src/components/`: Reusable React components.
    - `DashboardView.tsx`: Financial dashboard and daily projection engine simulator.
    - `ExpensesView.tsx`: Main transactions table and editing controls.
    - `OnboardingView.tsx`: Profile setup wizard for first-time login users.
    - `LegerAIAssistant.tsx`: Main AI query client and sidebar component.
- `src/lib/`: Utility libraries.
    - `ai-bridge.ts`: Handles requests across provider options (Gemini, Groq, OpenAI, local Ollama).
    - `server-telemetry.ts`: Diagnostic log aggregator for system health checks.
    - `server-auth.ts`: Middleware and context helpers for Supabase multi-tenant isolation.
- `Python Scripts` (root): A collection of tools for data management:
    - `import_transactions.py`: Parses Santander bank extracts and imports them to Supabase.
    - `audit_balances.py`: Reconciles bank statements and updates the `account_balance` snapshots.
    - `update_schema.py`: Manages the PostgreSQL schema and profile tables via direct connections.
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
- `profiles`: Extends user records linked directly to `auth.users(id)` via database triggers. Stores user preferences (currency, preferred `ai_provider`, `custom_api_key`), limits (`ai_quota_limit`, `ai_quota_usage`), target budgets (`target_monthly_income`, `target_monthly_spend`), and JSONB state objects (`projection_overrides`, `ai_journal`).
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
2.  **Schema Updates & PostgREST Cache Invalidation:** Use `update_schema.py` or similar scripts for database changes to keep everything in sync. All SQL migration scripts must end with `NOTIFY pgrst, 'reload schema';` to force Supabase's PostgREST API to immediately clear and reload its table schema cache. Note that on Supabase Cloud, propagation over direct connections (port 5432) can take 30–60 seconds; if a `PGRST204` (missing column in schema cache) error occurs in the browser after a migration, instruct the user to perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`) to clear cached client responses.
3.  **Data Importing:** Bank extracts are provided as `.txt` or `.pdf` files. Parsing logic is defined in `import_transactions.py` and `audit_balances.py`.
4.  **Categorization:** New transactions can be automatically categorized via the `/api/categorize` endpoint which interfaces with Gemini.
5.  **No Vibecoded Slop / Minimal UI Standard:** Do not generate unsolicited UI components, decorative math, speculative metrics, or overengineered abstractions. Keep UI button labels and typography clean, professional, and minimal—do NOT add conversational emojis (e.g., ⚡, 🤖) or decorative icon components inside action buttons unless explicitly requested. All code changes must be clean, minimal, robust, and strictly scoped to explicit user requirements—never add unprompted dashboard widgets, speculative analytics cards, or complex helper libraries unless explicitly requested.
6.  **Projection Engine Invariants:** Never simplify or remove the recency decay weighting or heavy current cycle alpha ($\alpha \ge 0.65$) in `DashboardView.tsx`. All adjustments to future cash forecasts must respect stored conversational overrides and preserve mathematical rigor over visual ornamentation.
7.  **Strict Rebranding Invariant (`LEGER_OS`):** Never use "money track" or legacy names anywhere in code, UI, or scripts. Always use `LEGER_OS` or `LEGER_OS // Personal Finance Mainframe`.
8.  **Multi-Provider AI & Free Alternatives:** All AI API endpoints (`/api/categorize`, `/api/analyze-cycle`, `/api/ingest/ai-parse`, `/api/leger-ai/query`) must utilize `generateAIContent` from `ai-bridge.ts` and respect client-passed `x-ai-provider` and `x-custom-api-key` headers. Always ensure users have free alternatives (like local Ollama or personal keys) without forced subscription paywalls for core data processing.
9.  **Freemium vs. PRO Monetization:** Preserve a free Core Base tier to maximize user adoption. Gate advanced predictive simulations and high-tier neural bridge features cleanly behind `isPro` / `subscriptionTier = 'pro'` in `SystemContext`.
11. **Mandatory Obsidian Vault Protocol (Vault-First Policy):** Before answering architecture questions or modifying logic, always check `LEGER_OS/` directives or call the Obsidian MCP server (`leger-obsidian-vault`). Update Obsidian directives (`01 - Directives (SOPs)/`) whenever new API behaviors, edge cases, or script flows are established.
12. **Strict Instruction Adherence & Ambiguity Handling:** Never make proactive code modifications, install components, or execute commands based on general queries or clarifying questions (e.g., "was this all?"). If a user message is a question, seeking confirmation, or otherwise ambiguous, respond with a direct explanation or ask for clarification first. Do not make code changes or run installations without explicit user directive.
13. **Mobile Layout Normalization Invariant:** Every subview page (e.g., `/leger-ai`, `/expenses`) must match the standard layout theme and outer wrapper spacing. The root wrapper of all subpages must use standard padding and centering options: `className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-24 md:pb-8 w-full"`. This ensures horizontal padding on mobile is never omitted, and layout width centers cleanly on desktop viewports.
14. **Optimistic UI updates:** Make standard user modifications (e.g., configuring context, deleting items) feel instant. Optimistically update local React state arrays, close dialog overlays, and show success feedback toasts immediately while executing network queries in the background. If a background write fails, catch the error, roll back local state to the original values, and show an error toast.
15. **Route-Specific Loading Skeletons:** To prevent visual layout shifts, do not rely on the global loading skeleton (`src/app/loading.tsx`) for distinct subpages. Define a folder-specific `loading.tsx` inside the page's subroute directory to duplicate its actual layout and components as skeleton blocks.
