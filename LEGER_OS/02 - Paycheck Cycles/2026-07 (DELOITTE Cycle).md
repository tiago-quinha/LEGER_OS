---
cycle_id: 2026-07
start_date: 2026-06-26
end_date: 2026-07-25
income_source: DELOITTE
target_income: 3500.00
decay_lambda: 0.12
alpha_weight: 0.65
status: Active
---

# Paycheck Cycle: [[2026-07 (DELOITTE Cycle)]]

## 📊 Cycle Financial Summary
- **Start Date:** 2026-06-26
- **End Date:** 2026-07-25
- **Net Deloitte Income:** €3,500.00
- **Primary Burn Rate (Recency Decay \(\lambda = 0.12\)):** ~6-day half-life
- **Status:** Complete / Reconciled

## 🤖 Active Overrides
- [x] Hybrid working gas discount (-30%)

## 📑 Reconciliation Status
- [x] Bank extracts parsed (`Transactions-26-05-ate-26-06.txt`, `extracto-conta-*.txt`)
- [x] Balance audit updated via `python audit_balances.py`
- [x] Supabase PostgREST schema cache reloaded (`NOTIFY pgrst, 'reload schema';`)
