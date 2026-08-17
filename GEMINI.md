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
To deploy application changes directly to live production on Vercel, merge your feature branch into `master` and execute the Vercel CLI directly in the terminal:
```bash
git checkout master && git merge <feature-branch>
npx vercel --prod --force --yes
```
**Note:** Do NOT rely on `git push` for triggering production deployments, as the local workspace repository does not maintain a configured remote tracking destination. Always merge feature changes into `master` prior to deployment. To set or assign production domain aliases, use `npx vercel alias set <target-url> leger-os.vercel.app`.

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
11. **Mandatory Obsidian Vault Protocol (Vault-First Policy):** Before answering architecture questions, searching the codebase, or modifying logic, always check `LEGER_OS/` directives or call the Obsidian MCP server (`leger-obsidian-vault`). Update Obsidian directives (`01 - Directives (SOPs)/`) whenever new API behaviors, edge cases, or script flows are established.
12. **Strict Instruction Adherence & Ambiguity Handling:** Never make proactive code modifications, install components, or execute commands based on general queries or clarifying questions (e.g., "was this all?"). If a user message is a question, seeking confirmation, or otherwise ambiguous, respond with a direct explanation or ask for clarification first. Do not make code changes or run installations without explicit user directive.
13. **Mobile Layout Normalization Invariant:** Every subview page (e.g., `/leger-ai`, `/expenses`) must match the standard layout theme and outer wrapper spacing. The root wrapper of all subpages must use standard padding and centering options: `className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full"`. This ensures horizontal padding on mobile is never omitted, content and footers sit cleanly above the fixed cycle bar and bottom navigation bar, and layout width centers cleanly on desktop viewports.
14. **Optimistic UI updates:** Make standard user modifications (e.g., configuring context, deleting items) feel instant. Optimistically update local React state arrays, close dialog overlays, and show success feedback toasts immediately while executing network queries in the background. If a background write fails, catch the error, roll back local state to the original values, and show an error toast.
15. **Route-Specific Loading Skeletons:** To prevent visual layout shifts, do not rely on the global loading skeleton (`src/app/loading.tsx`) for distinct subpages. Define a folder-specific `loading.tsx` inside the page's subroute directory to duplicate its actual layout and components as skeleton blocks.
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
To deploy application changes directly to live production on Vercel, merge your feature branch into `master` and execute the Vercel CLI directly in the terminal:
```bash
git checkout master && git merge <feature-branch>
npx vercel --prod --force --yes
```
**Note:** Do NOT rely on `git push` for triggering production deployments, as the local workspace repository does not maintain a configured remote tracking destination. Always merge feature changes into `master` prior to deployment. To set or assign production domain aliases, use `npx vercel alias set <target-url> leger-os.vercel.app`.

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
11. **Mandatory Obsidian Vault Protocol (Vault-First Policy):** Before answering architecture questions, searching the codebase, or modifying logic, always check `LEGER_OS/` directives or call the Obsidian MCP server (`leger-obsidian-vault`). Update Obsidian directives (`01 - Directives (SOPs)/`) whenever new API behaviors, edge cases, or script flows are established.
12. **Strict Instruction Adherence & Ambiguity Handling:** Never make proactive code modifications, install components, or execute commands based on general queries or clarifying questions (e.g., "was this all?"). If a user message is a question, seeking confirmation, or otherwise ambiguous, respond with a direct explanation or ask for clarification first. Do not make code changes or run installations without explicit user directive.
13. **Mobile Layout Normalization Invariant:** Every subview page (e.g., `/leger-ai`, `/expenses`) must match the standard layout theme and outer wrapper spacing. The root wrapper of all subpages must use standard padding and centering options: `className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full"`. This ensures horizontal padding on mobile is never omitted, content and footers sit cleanly above the fixed cycle bar and bottom navigation bar, and layout width centers cleanly on desktop viewports.
14. **Optimistic UI updates:** Make standard user modifications (e.g., configuring context, deleting items) feel instant. Optimistically update local React state arrays, close dialog overlays, and show success feedback toasts immediately while executing network queries in the background. If a background write fails, catch the error, roll back local state to the original values, and show an error toast.
15. **Route-Specific Loading Skeletons:** To prevent visual layout shifts, do not rely on the global loading skeleton (`src/app/loading.tsx`) for distinct subpages. Define a folder-specific `loading.tsx` inside the page's subroute directory to duplicate its actual layout and components as skeleton blocks.
16. **Viewport-Aware Render Invariant:** For tall mobile subpages and dashboard views, wrap below-the-fold layout sections in `[content-visibility:auto] [contain-intrinsic-size:1px_300px]`. This skips off-screen layout/paint rendering during horizontal swipe animations and scroll passes, maintaining 60fps gesture response.
17. **Standardized Emerald PRO Theme & Normalized `ProLockOverlay` Invariant:** Reserve Emerald Green (`text-emerald-500`, `bg-emerald-500/10`, `border-emerald-500/30`) strictly for PRO/Premium features. Non-PRO security/privacy indicators (e.g. Privacy Safe-Deposit mode, floating AI trigger lock badge) must use neutral monochrome styling (`text-muted-foreground bg-card border-border`). All locked PRO features across all views must use the standard `<ProLockOverlay />` component. On chart/graph overlays, wrap `ProLockOverlay` in an opaque/blurred `bg-background/95 backdrop-blur-md` backdrop so data is completely non-interactive and hidden.
18. **No Pseudo-Terminal Underscore Typography Invariant:** Ban pseudo-terminal uppercase underscore jargon in UI copy (e.g., `PRO_ACTIVE`, `CORE_FREE`, `PRO_LOCKED`, `HTTP_403_DENIED`, `SECURITY_GATEKEEPER`, `SUPER_USER`). Always use clean, professional natural English typography (e.g., `PRO Active`, `Core Free`, `PRO Locked`, `Access Forbidden`, `Security & Permissions`).
19. **Transparent Tax-Inclusive Pricing Invariant:** All Stripe payment sessions and intents MUST set `tax_behavior: "inclusive"`. The advertised price in the application (e.g. €4.99, €2.50, $5.50, £4.50) MUST match the exact final amount charged to the user with zero added tax surprises at checkout.
20. **Native Embedded Dark Payment Drawer Standard:** All payment, checkout, and billing management flows MUST use native in-app bottom slide-up drawers (`StripePaymentModal.tsx` and `StripeManageDrawer.tsx`) matching the LEGER_OS dark theme (`#09090b`), sharp borders (`border-border`), mono typography, and Emerald Green action buttons (`bg-emerald-600 text-white`). Include the official standard compliance footer: `🔒 256-BIT SSL ENCRYPTED · POWERED BY stripe`.
21. **Proactive AI Pill Banner & Empirical Detection Invariant:** Proactive AI pill banners MUST only display real, calculated telemetry data (uncategorized transactions, projected surplus/deficit, velocity multiplier, safe daily burn, net cash flow, top/lowest spend categories, active routine overrides, target budget %, recent purchase merchant & amount). NEVER output vague speculative suggestions, promotional prompts, or fake text ("Spot spending anomalies...", "Run AI Cleanse..."). Banner triggers must be event-driven (high priority on uncategorized items, velocity spikes >1.25x, budget >85%; throttled 35% chance on routine routes to save tokens). Banner clicks MUST initiate fresh chat sessions with an AI-originated message (`sender: "assistant"`), never a user auto-prompt. Ban all decorative emojis from AI banner titles, and never hardcode tenant-specific company or bank names (e.g. "Deloitte", "Santander").
22. **Transcript Recovery Invariant:** When a file is reported lost or reverted to a wrong state, ALWAYS recover it by reading `transcript_full.jsonl` from the relevant subagent or conversation log and extracting the exact `CodeContent` from the `write_to_file` step using Python. Write it directly to the file path. NEVER use `git stash`, `git checkout`, or manual rewrites from memory as recovery mechanisms — these destroy working incremental state.
23. **No Mid-Session Whole-File Rewrite Invariant:** During an active editing session, NEVER replace an entire file from a transcript step or backup while incremental edits have already been made. Always apply surgical `replace_file_content` / `multi_replace_file_content` changes to the live working file. The only exception is the very first recovery of a completely missing or wrong file at the start of a session.
24. **Memory Page Card Design Standard:** On `/memory` (`LegerAIPageView.tsx`): Input box must be plain — `Add memory` label + textarea + `Save` button, no Brain icons, no "Mainframe Ingestion", no emerald decorations. Active card footer: date left; right side = stacked column with projection impact text (`↓ X% Category`, plain `text-foreground/80 font-mono font-bold`, no emerald/badges) above `🕐 Expires in Xd` (amber if expiring soon). Expired memories: always visible as a separate section below active cards, faded + strikethrough, no collapse toggle. No Brain icon anywhere on the memory page.
25. **Strict Subpage UI & Typography Normalization Invariant**: Every subpage header and view layout MUST strictly match the app's established design language:
    - Header Eyebrow: `flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground` with standard Lucide icon + uppercase title.
    - Page Title: `<h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">` using Geist Sans (`font-sans`).
    - Executive Metric Cards: Wrap in `<Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">` with `<span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">`, monospaced values (`text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10`), and `<ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />`.
    - Tab Controls: `border border-border bg-card/20 text-xs font-mono` with active `bg-secondary text-foreground border-b-2 border-b-foreground` states.
    - Floating Add Button: White rounded-xl square FAB (`fixed bottom-20 right-4 z-50 h-12 w-12 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20`) on mobile routes.
    - Always inspect existing views (e.g. `ExpensesView.tsx`) BEFORE creating or updating any view to guarantee 100% visual consistency.
26. **Native Draggable Bottom Drawer Standard**: All input, edit, and configuration overlays across the application (Add Position, Add Transaction Entry, Stripe Payments, AI Query Drawer) MUST use native bottom slide-up drawers instead of standard center dialog modals. Drawers must feature a Framer Motion slide-up animation (`initial={{ y: "100%" }} animate={{ y: 0 }}`), top drag handle indicator (`w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2 cursor-grab active:cursor-grabbing`), draggable swipe-down dismiss gesture (`drag="y" dragConstraints={{ top: 0, bottom: 0 }}`), dark `#09090b` background, backdrop blur, and sharp borders.
27. **Anti-Gamification & Factual Finance Invariant**: Ban all gamified scorecards, arbitrary numerical grades (e.g. 84/100, "Excellent Financial Health"), arbitrary XP, level meters, and trophy badges. All data presentations must remain strictly factual, mathematical, and objective personal finance software without condescending gamification.
28. **Subscription Radar & Cadence Detection Invariant**: Recurring subscriptions are strictly categorized as "monthly" or "annual". All merchant titles, status badges, and filter pills MUST be in 100% CAPS LOCK (`SPOTIFY`, `NETFLIX`, `MONTHLY`, `ANNUAL`, `PRICE JUMP`). Omit monthly items inactive for >38 days and annual items inactive for >380 days. Strictly exclude brokerage/investment transfers (`XTB`, `DEGIRO`, `TRADE REPUBLIC`, `BINANCE`, `KRAKEN`, `SAVINGS`, `TRANSFERENCIA`). Price hike calculations must compare like-for-like cadence baselines to prevent false spikes when shifting between monthly and annual plans.
29. **Subpage Search Bar & Category Filter Tabs CSS Standard**: All subpage search inputs and category filter rows must match the Portfolio/Memory standard: Search input uses `h-8 pl-9 pr-3 text-xs bg-card border border-border/60 rounded-none font-sans text-foreground placeholder:text-muted-foreground/40`; Filter tabs use horizontal scroll rows with `px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0` with active inverted `bg-foreground border-foreground text-background font-black` and inactive `bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground`.
30. **SwipeCycleWrapper Inner Spacing & Metric Card Density Invariant**: When using `<SwipeCycleWrapper>`, always nest view sections in an inner container with `space-y-6 md:space-y-8` (or `space-y-10 md:space-y-12`) so Tailwind vertical spacing applies correctly across motion wrappers. Metric cards must use natural auto heights and compact text stacks (`p-5 md:p-6 space-y-2`), banning artificial `min-h` voids on mobile.



