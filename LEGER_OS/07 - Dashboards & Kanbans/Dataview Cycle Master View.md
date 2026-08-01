# Dataview Master Financial Dashboard

```dataview
TABLE period AS "Period Label", income_deloitte AS "Income (€)", total_expenses AS "Expenses (€)", net_cashflow AS "Net (€)", status AS "Status"
FROM "02 - Paycheck Cycles"
WHERE cycle_id != null
SORT cycle_id DESC
```
