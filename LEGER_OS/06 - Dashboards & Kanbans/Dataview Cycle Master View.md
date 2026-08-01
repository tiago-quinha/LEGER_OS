# Dataview Master Financial Dashboard

Dynamic real-time queries powered by the **Dataview Plugin**. All tables and calculations automatically re-render whenever notes or cycle data are created or edited.

---

## 📊 All Paycheck Cycles Overview

```dataview
TABLE 
    period AS "Period Label",
    currencyformat(income_deloitte) AS "Deloitte Income",
    currencyformat(total_expenses) AS "Total Expenses",
    currencyformat(net_cashflow) AS "Net Cash Flow",
    status AS "Cycle Status"
FROM "02 - Paycheck Cycles"
WHERE cycle_id != null
SORT cycle_id DESC
```

---

## 🔥 Active Cycle Velocity & Overrides

```dataview
TABLE 
    starting_balance AS "Start Balance (€)",
    decay_lambda AS "Decay Lambda (λ)",
    alpha_weight AS "Alpha Weight (α)",
    created AS "Created At"
FROM "02 - Paycheck Cycles"
WHERE status = "Active"
```

---

## 📜 Recent Bank Statement Extracts

```dataview
LIST FROM "03 - Accounts & Statements/Statements Archive"
SORT file.name DESC
LIMIT 10
```

---

## 🛠️ Layer 1 Operating Directives (SOPs)

```dataview
TABLE file.mtime AS "Last Modified"
FROM "01 - Directives (SOPs)"
SORT file.name ASC
```

---

## 🧮 Interactive DataviewJS Summary (Advanced Stats)

```dataviewjs
let cycles = dv.pages('"02 - Paycheck Cycles"').where(p => p.cycle_id != null);
let totalIncome = cycles.income_deloitte.array().reduce((a, b) => a + (b || 0), 0);
let totalExpenses = cycles.total_expenses.array().reduce((a, b) => a + (b || 0), 0);
let netTotal = totalIncome - totalExpenses;

dv.paragraph(`**Total Multi-Cycle Income:** €${totalIncome.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
dv.paragraph(`**Total Multi-Cycle Expenses:** €${totalExpenses.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
dv.paragraph(`**Cumulative Net Balance Savings:** €${netTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
```
