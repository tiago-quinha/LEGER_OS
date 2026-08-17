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

### Detection Engine
- Powered by `detectRecurringCadence` in `src/lib/cadence-detector.ts`.
- Groups transactions by normalized merchant aliases (`NETFLIX`, `SPOTIFY`, `EDP`, `MEO`, etc.).
- Compares variance of intervals ($\le 35\text{d}$ for monthly, $\le 370\text{d}$ for annual) with confidence weighting $\ge 0.65$.

### Price Hike Radar
- Compares sequential charges for identical merchants.
- If $P_{\text{new}} > P_{\text{old}}$ by $\ge 5\%$, flags as a **Silent Price Increase** (`AlertTriangle` badge) with exact delta and percentage hike.
- Accessible via the **Radar** tab in `/expenses` (`SubscriptionRadar.tsx`).
