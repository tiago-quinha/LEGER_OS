# Directive: Statement Ingestion & Categorization

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
