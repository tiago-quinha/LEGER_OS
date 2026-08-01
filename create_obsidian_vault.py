import os

VAULT_DIR = os.path.join(os.path.dirname(__file__), "LEGER_OS")

folders = [
    "00 - System & AI",
    "01 - Directives (SOPs)",
    "02 - Paycheck Cycles",
    "03 - Accounts & Statements",
    "04 - Budgets & Categories",
    "05 - Execution Tools"
]

files = {
    os.path.join("00 - System & AI", "LEGER_OS Mainframe.md"): """# LEGER_OS // Personal Finance Mainframe

Welcome to your **LEGER_OS** Obsidian Vault. This knowledge base connects your financial directives (SOPs), paycheck cycle tracking, statement ingestion logs, and AI conversational overrides.

---

## ⚡ Quick Navigation

- [[01 - Directives (SOPs)/statement_ingestion|Statement Ingestion SOP]]
- [[01 - Directives (SOPs)/cycle_reconciliation|Cycle Reconciliation SOP]]
- [[02 - Paycheck Cycles/2026-07 (DELOITTE Cycle)|Current Paycheck Cycle (2026-07)]]
- [[03 - Accounts & Statements/Santander Checking Account|Santander Account Hub]]
- [[04 - Budgets & Categories/Fixed Expenses|Budgets & Categories]]
- [[05 - Execution Tools/Python Scripts Overview|Layer 3 Execution Scripts]]

---

## 📐 Mathematical Projection Engine Standards

- **Recency Decay Weighting:** Exponential time-decay (\\(\\lambda = 0.12\\), ~6-day half-life). Recent spending carries higher weight.
- **Heavy Current Cycle Alpha:** Current cycle velocity weighted heavily:
  \\[\\alpha = \\min(1.0, 0.65 + 0.35 \\cdot (\\text{days elapsed} / \\text{total days}))\\]
- **Conversational Overrides:** Stored in `localStorage` (`leger_cycle_overrides`).

---

## 🏷️ System Metadata
- **Frontend:** Next.js 16.2.9 + React 19 + Tailwind CSS 4
- **Backend:** Supabase PostgreSQL + RLS
- **AI Bridge:** Gemini 2.5 Pro, Groq, OpenAI, Ollama
""",

    os.path.join("00 - System & AI", "AI Prompts & Rules.md"): """# AI Prompts & System Rules

This file documents the system prompts and operational rules for LEGER_OS AI ingestion and assistant query bridge (`src/lib/ai-bridge.ts`).

## Core Ingestion Prompt Rules
1. Never hallucinate transaction amounts or dates.
2. Use raw extracted statement text for payee recognition.
3. Automatically flag unrecognized sign inversions (e.g., Santander debit extracts).
4. Respect client-passed `x-ai-provider` and `x-custom-api-key` headers.
""",

    os.path.join("00 - System & AI", "Cycle Overrides Reference.md"): """# Conversational AI Overrides Reference

Document active natural language overrides applied to the daily projection engine simulator.

## Active Overrides (`leger_cycle_overrides`)
- [x] *Hybrid Work Schedule:* Reduce gas spend assumption by 30% for 2026-07 cycle.
- [ ] *Upcoming Trip:* Add temporary €300 variable travel budget.

## How to Apply
Overrides can be set directly in the **Leger AI Assistant** UI or recorded in daily cycle notes.
""",

    os.path.join("01 - Directives (SOPs)", "statement_ingestion.md"): """# Directive: Statement Ingestion & Categorization

**Layer 1 Directive (SOP)**

## Objective
Extract, clean, categorize, and ingest monthly Santander bank extracts into the Supabase database.

## Prerequisites
- Bank extract `.txt` or `.pdf` file in root project folder.

## Execution Procedure (Layer 3)
1. Run parsing script:
   ```bash
   python import_transactions.py
   ```
2. If Santander values require sign correction:
   ```bash
   python activate_auto_sign.py
   ```
3. Run forensic audit to verify balance integrity:
   ```bash
   python forensic_audit.py
   ```

## Verification
- Open LEGER_OS Dashboard UI (`/`) or Expenses table (`/expenses`).
- Confirm zero duplicate transactions were created.
""",

    os.path.join("01 - Directives (SOPs)", "cycle_reconciliation.md"): """# Directive: Paycheck Cycle Reconciliation

**Layer 1 Directive (SOP)**

## Objective
Reconcile finances at the end of each paycheck cycle (typically triggered by receiving a **DELOITTE** paycheck deposit).

## Process Checklist
- [ ] Record incoming paycheck amount in `income` table / cycle note.
- [ ] Calculate remaining end-of-cycle balance.
- [ ] Run `python audit_balances.py` to update account balance snapshots.
- [ ] Compare projected end balance vs actual ending account balance.
- [ ] Create next cycle note using [[02 - Paycheck Cycles/Cycle Template|Cycle Template]].
""",

    os.path.join("01 - Directives (SOPs)", "category_rules.md"): """# Directive: Categorization Rules & Budget Caps

**Layer 1 Directive (SOP)**

## Primary Categories
- **DELOITTE (Income):** Paycheck deposit trigger.
- **Housing & Utilities:** Fixed recurring expenses.
- **Groceries & Supplies:** Variable essential spending.
- **Dining & Leisure:** Variable non-essential spending.
- **Transfers & Investments:** Outflows to savings/brokers.

## Script Helper
To seed or update rules in Supabase:
```bash
python seed_rules.py
python add_new_categories.py
```
""",

    os.path.join("02 - Paycheck Cycles", "Cycle Template.md"): """---
cycle_id: YYYY-MM
start_date: YYYY-MM-DD
end_date: YYYY-MM-DD
income_source: DELOITTE
target_income: 0.00
decay_lambda: 0.12
alpha_weight: 0.65
status: Draft
---

# Paycheck Cycle: [[{{title}}]]

## 📊 Cycle Financial Summary
- **Start Date:** YYYY-MM-DD
- **End Date:** YYYY-MM-DD
- **Net Deloitte Income:** €0.00
- **Starting Account Balance:** €0.00
- **Ending Account Balance:** €0.00

## 🎯 Cycle Goals & Overrides
- [ ] Goal 1: Keep dining out below €200
- [ ] Override: 

## 📝 Daily Velocity Log
- Day 1:
- Day 15:
- Day 30:

## 🔍 Post-Cycle Audit
- [ ] Reconciled in Supabase
- [ ] Run `python audit_balances.py`
""",

    os.path.join("02 - Paycheck Cycles", "2026-07 (DELOITTE Cycle).md"): """---
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
- **Primary Burn Rate (Recency Decay \\(\\lambda = 0.12\\)):** ~6-day half-life
- **Status:** Complete / Reconciled

## 🤖 Active Overrides
- [x] Hybrid working gas discount (-30%)

## 📑 Reconciliation Status
- [x] Bank extracts parsed (`Transactions-26-05-ate-26-06.txt`, `extracto-conta-*.txt`)
- [x] Balance audit updated via `python audit_balances.py`
- [x] Supabase PostgREST schema cache reloaded (`NOTIFY pgrst, 'reload schema';`)
""",

    os.path.join("03 - Accounts & Statements", "Santander Checking Account.md"): """# Santander Checking Account

## Account Metadata
- **Institution:** Banco Santander
- **Type:** Primary Checking / Payroll Account
- **Income Payday Keyword:** `DELOITTE`
- **Associated Extraction Scripts:** `import_transactions.py`, `audit_balances.py`

## Ingested Statement Files
- `extracto-conta-30-01.txt`
- `extracto-conta-27-02.txt`
- `extracto-conta-31-03.txt`
- `extracto-conta-30-04.txt`
- `extracto-conta-29-05.txt`
- `Transactions-26-05-ate-26-06.txt`
""",

    os.path.join("04 - Budgets & Categories", "Fixed Expenses.md"): """# Fixed Expenses

Fixed recurring obligations that do not decay with daily spending velocity:

| Category | Typical Amount | Due Frequency | Notes |
| :--- | :--- | :--- | :--- |
| Housing / Rent | €1,200.00 | Monthly | Paid start of cycle |
| Utilities & Internet | €150.00 | Monthly | Variable bill date |
| Insurance | €80.00 | Monthly | Auto-debit |
""",

    os.path.join("04 - Budgets & Categories", "Variable Burn Targets.md"): """# Variable Burn Targets

Variable lifestyle expenses modeled by the Recency Decay Projection Engine (\\(\\lambda = 0.12\\)):

| Category | Monthly Target | Daily Velocity Ceiling |
| :--- | :--- | :--- |
| Groceries | €400.00 | €13.33 / day |
| Dining & Leisure | €250.00 | €8.33 / day |
| Transport / Gas | €150.00 | €5.00 / day |
""",

    os.path.join("05 - Execution Tools", "Python Scripts Overview.md"): """# Layer 3 Execution Tools Overview

Deterministic Python scripts located in the root workspace to interact with database schemas and bank files.

| Script Name | Purpose | Command |
| :--- | :--- | :--- |
| `import_transactions.py` | Parses bank extracts into Supabase | `python import_transactions.py` |
| `audit_balances.py` | Reconciles account balance snapshots | `python audit_balances.py` |
| `update_schema.py` | Manages PostgreSQL schema & migrations | `python update_schema.py` |
| `detect_cycles.py` | Analyzes Deloitte paycheck cycle boundaries | `python detect_cycles.py` |
| `forensic_audit.py` | Verifies calculation accuracy & signs | `python forensic_audit.py` |
| `seed_rules.py` | Populates default parsing & category rules | `python seed_rules.py` |

> **Note:** All SQL schema migration scripts must finish with `NOTIFY pgrst, 'reload schema';` to invalidate Supabase PostgREST cache.
"""
}

def main():
    os.makedirs(VAULT_DIR, exist_ok=True)
    for folder in folders:
        os.makedirs(os.path.join(VAULT_DIR, folder), exist_ok=True)
    
    for rel_path, content in files.items():
        full_path = os.path.join(VAULT_DIR, rel_path)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
    
    print(f"Obsidian Vault successfully populated at: {VAULT_DIR}")

if __name__ == "__main__":
    main()
