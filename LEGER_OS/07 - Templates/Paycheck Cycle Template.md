---
cycle_id: <%* let id = await tp.system.prompt("Cycle ID (e.g. 2026-08):"); tR += id; %>
period: "<%* let period = await tp.system.prompt("Period Label (e.g. August 2026):"); tR += period; %>"
income_deloitte: <%* let inc = await tp.system.prompt("Net Deloitte Income (€):", "3500.00"); tR += inc; %>
total_expenses: 0.00
net_cashflow: <%* tR += inc; %>
starting_balance: <%* let bal = await tp.system.prompt("Starting Account Balance (€):"); tR += bal; %>
decay_lambda: 0.12
alpha_weight: 0.65
status: Active
created: <% tp.file.creation_date("YYYY-MM-DD HH:mm") %>
---

# Paycheck Cycle: [[<% tp.file.title %>]]

## 📊 Cycle Overview
- **Cycle Period:** <% period %>
- **Starting Balance Snapshot:** €<% bal %>
- **Net Deloitte Income Received:** €<% inc %>
- **Total Expenses:** €0.00 (Updating via ingestion)
- **Net Projected Cash Flow:** €<% inc %>
- **Associated Statement Source:** [[03 - Accounts & Statements/Santander Primary Checking|Santander Account]]

---

## 📈 Recency Decay Velocity (\(\lambda = 0.12\))
- **Half-Life:** ~6 days (Spending weighted heavily toward recent days)
- **Current Cycle Alpha (\(\alpha\)):** 0.65 baseline blend

$$\alpha = \min\left(1.0, 0.65 + 0.35 \cdot \frac{\text{days elapsed}}{\text{total days}}\right)$$

---

## 🤖 Active Conversational Overrides (`leger_cycle_overrides`)
- [ ] *Add natural language override here*

---

## 📝 Daily Expense Log
| Date | Description | Category | Amount (€) |
| :--- | :--- | :--- | :--- |
| <% tp.file.creation_date("YYYY-MM-DD") %> | Initial Balance | Deposit | €<% inc %> |

---

## 📑 Reconciliation Checklist
- [ ] Bank extract exported (`Transactions-*.txt` / `.pdf`)
- [ ] Ingestion script executed (`python import_transactions.py`)
- [ ] Balance audit synced (`python audit_balances.py`)
- [ ] PostgREST schema cache reloaded (`NOTIFY pgrst, 'reload schema';`)
