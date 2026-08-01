import os
import re

VAULT_DIR = os.path.join(os.path.dirname(__file__), "LEGER_OS")

statement_files = [
    ("extracto-conta-31-12.txt", "2025-12", "December 2025"),
    ("extracto-conta-30-01.txt", "2026-01", "January 2026"),
    ("extracto-conta-27-02.txt", "2026-02", "February 2026"),
    ("extracto-conta-31-03.txt", "2026-03", "March 2026"),
    ("extracto-conta-30-04.txt", "2026-04", "April 2026"),
    ("extracto-conta-29-05.txt", "2026-05", "May 2026"),
    ("Transactions-26-05-ate-26-06.txt", "2026-06", "June 2026")
]

tx_pattern = re.compile(
    r"^(\d{2}[-/]\d{2}(?:[-/]\d{4})?)(?:\s+\d{2}[-/]\d{2}(?:[-/]\d{4})?)?\s+(.+?)\s*([+-]?\d+,\d{2})(?:\s*(?:EUR|[\w$€£]+))?(?:\s*(-?\d+,\d{2})(?:\s*(?:EUR|[\w$€£]+))?)?$",
    re.IGNORECASE
)
balance_pattern = re.compile(r"Saldo Inicial EUR (\d+,\d{2})", re.IGNORECASE)

def parse_statement(filename):
    filepath = os.path.join(os.path.dirname(__file__), filename)
    if not os.path.exists(filepath):
        return {"start_bal": 0.0, "total_expenses": 0.0, "total_income": 0.0, "transactions": []}
    
    start_bal = 0.0
    transactions = []
    total_exp = 0.0
    total_inc = 0.0
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        raw_lines = f.readlines()
        content = "".join(raw_lines)
        match_start = balance_pattern.search(content)
        if match_start:
            start_bal = float(match_start.group(1).replace(',', '.'))
            
        joined_lines = []
        current_tx_line = ""
        for line in raw_lines:
            line = line.strip()
            if not line:
                continue
            if re.match(r"^\d{2}[-/]\d{2}", line):
                if current_tx_line:
                    joined_lines.append(current_tx_line)
                current_tx_line = line
            else:
                if current_tx_line:
                    if tx_pattern.match(current_tx_line):
                        joined_lines.append(current_tx_line)
                        current_tx_line = ""
                    else:
                        current_tx_line += " " + line
                else:
                    joined_lines.append(line)
        if current_tx_line:
            joined_lines.append(current_tx_line)
            
        for line in joined_lines:
            m = tx_pattern.match(line)
            if m:
                dt = m.group(1)
                desc = m.group(2).strip()
                amt_str = m.group(3).replace(',', '.')
                bal_str = m.group(4).replace(',', '.') if m.group(4) else "0.00"
                
                amt = float(amt_str)
                bal = float(bal_str)
                
                transactions.append({"date": dt, "description": desc, "amount": amt, "balance": bal})
                if amt < 0:
                    total_exp += abs(amt)
                else:
                    total_inc += amt
                    
    return {
        "start_bal": start_bal,
        "total_expenses": round(total_exp, 2),
        "total_income": round(total_inc, 2),
        "transactions": transactions
    }

def create_note(folder, filename, content):
    target_dir = os.path.join(VAULT_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, filename)
    with open(target_file, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

def main():
    print("Replacing escaped backslashes with valid Obsidian $ and $$ Math delimiters...")
    
    # 00 - System & AI Hub
    create_note("00 - System & AI", "LEGER_OS Mainframe.md", r"""# LEGER_OS // Personal Finance Mainframe

Welcome to your **LEGER_OS** Obsidian Vault. This high-precision knowledge base connects your financial directives (SOPs), paycheck cycle projections, bank statement extractions, component architecture, and AI conversational overrides.

---

## ⚡ Mainframe Navigation Architecture

```mermaid
graph TD
    A[LEGER_OS Mainframe] --> B[01 - Directives SOPs]
    A --> C[02 - Paycheck Cycles]
    A --> D[03 - Accounts & Statements]
    A --> E[04 - Budgets & Categories]
    A --> F[05 - Execution Tools]
    A --> G[06 - UI Components]
    A --> H[07 - Dashboards & Kanbans]

    B --> B1[Ingestion SOP]
    B --> B2[Reconciliation SOP]

    C --> C1[Historical Cycles]
    C --> C2[Active Cycle 2026-07]

    F --> F1[import_transactions.py]
    F --> F2[audit_balances.py]
```

---

## 🚀 Quick Reference Links

- 📜 **Directives:** [[01 - Directives (SOPs)/01.01 - Statement Ingestion SOP|Statement Ingestion]] | [[01 - Directives (SOPs)/01.02 - Paycheck Cycle Reconciliation SOP|Cycle Reconciliation]]
- 📐 **Math Engine:** [[00 - System & AI/Mathematical Projection Engine|Recency Decay $\lambda = 0.12$ & Alpha Weighting]]
- 🤖 **AI Bridge:** [[00 - System & AI/Multi-Provider AI Bridge & Ingestion|Multi-Provider Bridge (Gemini 2.5 Pro, Groq, Ollama)]]
- 🎨 **UI Architecture:** [[06 - Architecture & UI Components/06.00 - Frontend Architecture Index|Frontend Component Reference]]
- 🛠️ **Python Tools:** [[05 - Execution Tools/05.00 - Layer 3 Scripts Overview|Python Execution Tools]]

---

## 📊 Dynamic Dataview Summary

```dataview
TABLE period AS "Period Label", income_deloitte AS "Income (€)", total_expenses AS "Expenses (€)", net_cashflow AS "Net (€)", status AS "Status"
FROM "02 - Paycheck Cycles"
WHERE cycle_id != null
SORT cycle_id DESC
```
""")

    # 00 - System & AI / Mathematical Projection Engine
    create_note("00 - System & AI", "Mathematical Projection Engine.md", r"""# Mathematical Projection Engine Standards

The **LEGER_OS Daily Projection Engine** (`simulateExpertDailyProjection` in `DashboardView.tsx`) models future end-of-day cash balances using professional personal data analyst standards.

---

## 1. Recency Decay Weighting
Variable spending is calculated using an exponential time-decay weighting ($\lambda = 0.12$, representing a ~6-day half-life). Recent transactions carry exponentially higher weight than older transactions in the cycle:

$$
w_i = e^{-\lambda \cdot (t_{\text{current}} - t_i)}
$$

Where:
- $\lambda = 0.12$ (~6-day half-life).
- $t_{\text{current}}$ is the current day of the cycle.
- $t_i$ is the timestamp of transaction $i$.

---

## 2. Heavy Current Cycle Alpha ($\alpha$)
When blending current cycle velocity with multi-month historical baselines, the weighting factor ($\alpha$) heavily favors the current cycle:

$$
\alpha = \min\left(1.0, 0.65 + 0.35 \cdot \frac{\text{days elapsed}}{\text{total days}}\right)
$$

- Day 1: $\alpha = 0.65$ (65% weight on current cycle).
- Day 30: $\alpha = 1.00$ (100% weight on current cycle).

---

## 3. Conversational AI Overrides (`leger_cycle_overrides`)
Users can set natural language assumptions in Leger AI (e.g., *"I'm working hybrid, reduce gas spend by 30%"*).
These overrides are stored in `localStorage` (`leger_cycle_overrides`) and dynamically modify category burn rates inside the simulation without requiring UI widgets.
""")

    # 02 - Paycheck Cycles & 03 - Accounts & Statements
    for fname, cycle_id, label in statement_files:
        data = parse_statement(fname)
        net_cashflow = round(data['total_income'] - data['total_expenses'], 2)
        status_tag = "Complete" if cycle_id != "2026-07" else "Active"
        
        cycle_md = f"""---
cycle_id: {cycle_id}
period: "{label}"
income_deloitte: {data['total_income']}
total_expenses: {data['total_expenses']}
net_cashflow: {net_cashflow}
starting_balance: {data['start_bal']}
decay_lambda: 0.12
alpha_weight: 0.65
status: {status_tag}
---

# Paycheck Cycle: [[Cycle {cycle_id} (DELOITTE)]]

## 📊 Financial Summary
- **Period Label:** {label} ({cycle_id})
- **Starting Balance:** €{data['start_bal']:,.2f}
- **Net Deloitte Income:** €{data['total_income']:,.2f}
- **Total Outflow:** €{data['total_expenses']:,.2f}
- **Net Cash Flow:** €{net_cashflow:,.2f}
- **Statement Source:** [[03 - Accounts & Statements/Statements Archive/{fname}.md|{fname}]]

## 📝 Top Transactions in this Cycle ({len(data['transactions'])} total items)
"""
        sorted_txs = sorted(data['transactions'], key=lambda x: abs(x['amount']), reverse=True)[:10]
        for tx in sorted_txs:
            amt_str = f"+€{tx['amount']:,.2f}" if tx['amount'] > 0 else f"-€{abs(tx['amount']):,.2f}"
            cycle_md += f"- `{tx['date']}` **{tx['description']}**: {amt_str}\n"
            
        create_note("02 - Paycheck Cycles", f"Cycle {cycle_id} (DELOITTE).md", cycle_md)
        
        stmt_md = f"""# Statement Archive: {fname}

- **Label:** {label}
- **Starting Balance:** €{data['start_bal']:,.2f}
- **Total Inflow:** €{data['total_income']:,.2f}
- **Total Outflow:** €{data['total_expenses']:,.2f}
- **Total Transaction Items:** {len(data['transactions'])}

| Date | Description | Amount (€) | Ending Balance (€) |
| :--- | :--- | :--- | :--- |
"""
        for tx in data['transactions']:
            amt_str = f"+€{tx['amount']:,.2f}" if tx['amount'] > 0 else f"-€{abs(tx['amount']):,.2f}"
            stmt_md += f"| {tx['date']} | `{tx['description']}` | {amt_str} | €{tx['balance']:,.2f} |\n"
            
        create_note("03 - Accounts & Statements/Statements Archive", f"{fname}.md", stmt_md)

    # 04 - Categories
    categories = [
        ("Housing & Rent", "Fixed recurring housing and rental expenses.", "€1,200.00"),
        ("Groceries & Essentials", "Supermarket, food, and home essentials.", "€400.00"),
        ("Dining & Leisure", "Restaurants, cafes, social outings.", "€250.00"),
        ("Utilities & Subscriptions", "Electricity, internet, software, streaming.", "€150.00"),
        ("Transport & Fuel", "Fuel, gas, vehicle maintenance, parking.", "€150.00"),
        ("DELOITTE Salary & Income", "Primary Deloitte payroll deposit.", "€3,500.00")
    ]
    for c_name, c_desc, c_target in categories:
        create_note("04 - Budgets & Categories", f"{c_name}.md", f"""# Category: {c_name}

- **Description:** {c_desc}
- **Monthly Target Budget:** {c_target}
- **Model Type:** Fixed or Variable (Recency Decay $\\lambda = 0.12$)

## Rules & Automated Categorization
Managed via `/api/categorize` endpoint and `seed_rules.py` script.
""")

    print("Obsidian math formatting update complete!")

if __name__ == "__main__":
    main()
