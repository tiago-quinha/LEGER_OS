# Growth Architecture & High-Retention Systems

> Specification and operational behavior for LEGER_OS's 3 Core High-Utility Systems:
> 1. WHOOP-Style Daily Financial Outlook Notifications
> 2. Natural Language Conversational Expense Ingestion (Interactive Confirmation Card)
> 3. Subscription & Silent Price Hike Radar

---

## 1. WHOOP-Style Daily Financial Outlook Notifications

### Philosophy
Inspired by WHOOP's unobtrusive, high-signal wearable coaching. Avoids generic notifications or empty motivational text; only delivers real, computed daily constraints.

### Notification Schedule & Payloads
- **8:30 AM — Daily Financial Outlook (Recovery & Target Equivalent)**:
  - *Formula*: $\text{Safe Daily Burn} = \frac{\text{Current Surplus/Runway}}{\text{Days Remaining}}$
  - *Copy*: `Your safe variable burn today is €28.40 to maintain your projected €410.00 cycle surplus.`
- **Real-Time — Transaction Ingested**:
  - *Copy*: `€14.50 at Starbucks logged. Dining budget is at 64%.`
- **8:30 PM — Evening Pace Recap**:
  - *Copy*: `Cycle Day 14/30 complete. Spending velocity is at 0.92x. Projected cash flow: +€410.00.`

### API Endpoint
- Route: `/api/notifications/daily-outlook`
- Query Params: `userId=<uuid>&type=morning|evening|transaction`

---

## 2. Natural Language Expense Ingestion (Interactive Confirmation Card)

### Intent Parsing & AI Protocol
When a user mentions or voices an expense in Leger AI (e.g. *"I spent 15€ at Starbucks"* or *"paid 40 for fuel at BP"*):
1. **Conversational Synthesis**: AI acknowledges the transaction in natural English.
2. **Structured Block**: Emits `[TRANSACTION_DRAFT:{"merchant":"Starbucks","amount":-15.00,"category":"Dining","categoryId":1,"date":"YYYY-MM-DD"}]` at the end of the message.
3. **Client-Side Widget**: `LegerAIAssistant.tsx` intercepts the draft tag, cleans the chat bubble text, and renders a native interactive `<TransactionDraftCard />` directly beneath the assistant's speech bubble.
4. **1-Tap Execution**: Tapping `Confirm & Add to Ledger` writes directly to `tracker_expense`, triggers `refreshData()`, and renders a clean `✓ Logged to Ledger` badge.

---

## 3. Subscription & Silent Price Hike Radar

### Detection Engine (`src/lib/cadence-detector.ts`)
- **4-Layer Ingestion Architecture**:
  1. Registry Instant Match (100+ global & Portuguese services: Netflix, Spotify, OpenAI, Claude, Cursor, EDP, Vodafone, etc.).
  2. Direct Debit / Institutional Keyword Triggers (`SEPA`, `DEBITO DIRECTO`, `DD`, `MENSALIDADE`, `QUOTA`, `PLANO`).
  3. Interval Clustering & Variance Analysis ($\Delta t \approx 30\text{d}$ for monthly, $\approx 365\text{d}$ for annual).
  4. User Overrides (`leger_subscription_cadence_overrides`) and Custom Pinned Overhead (`leger_pinned_subscriptions`).
- **Strict Invariants**:
  - Normalized strictly to `"monthly"` or `"annual"`.
  - 100% CAPS LOCK typography (`SPOTIFY`, `MONTHLY`, `ANNUAL`).
  - Recency drop thresholds ($>38\text{d}$ for monthly, $>380\text{d}$ for annual).
  - Outflow exclusion for brokerage/investments (`XTB`, `DEGIRO`, `TRADE REPUBLIC`, `BINANCE`, `KRAKEN`).

### Price Hike Radar
- Compares sequential charges for identical merchants across like-for-like cadences.
- Normalizes annualized baselines if cadence shifted from monthly to annual to avoid false percentage spikes.
- If $P_{\text{new}} > P_{\text{old}}$ by $\ge 5\%$ and $\Delta \ge €0.45$, flags as a **Silent Price Increase** (`AlertTriangle` amber badge) with exact before/after amounts and percentage jump tag.

### Dedicated Top-Level Route (`/radar`)
- Promoted to a dedicated top-level page with normalized Geist Sans `RADAR` header, `<Tilt>` executive metric cards (`MONTHLY RECURRING` and `ANNUAL PROJECTED`), amber alert banner, Portfolio-standard search bar & category filter tabs, 1-tap cadence toggling, and native draggable bottom drawer for `+ PIN RECURRING BILL`.

---

## 4. Conversational AI Quantitative Synthesis (Deprecation of Static Analytics)

### Architectural Decision & Rationale
- **Deprecated Route**: Static `/analytics` page (passive historical bar charts and category donuts) has been completely removed from the application.
- **Root Problem**: Passive charts force the user to perform mental calculus to figure out why cash velocity changed. They provide low utility compared to interactive forecasting.
- **Conversational Synthesis Model**:
  - Deep multi-cycle audits, habit leakage diagnosis, lifestyle drift detection, and what-if scenario simulations are routed directly into the **Conversational AI Bridge** (`/leger-ai` and slide-up AI drawer).
  - The AI synthesizes raw cycle telemetry, recency-decay velocity ($\lambda = 0.12$), category burn rates, and merchant line items into actionable root-cause explanations.
- **Monetization Alignment**:
  - Full multi-cycle quantitative audits and proactive risk simulations serve as high-utility **PRO Tier** features.
- **Focused Navigation Dock**:
  - App navigation is strictly streamlined to 7 action-driven core tools:
    `Dashboard` $\rightarrow$ `Ledger` $\rightarrow$ `Radar` $\rightarrow$ `Portfolio` $\rightarrow$ `Categories` $\rightarrow$ `Budgets` $\rightarrow$ `Memory`.

