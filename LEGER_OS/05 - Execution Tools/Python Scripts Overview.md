# Layer 3 Execution Tools Overview

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
