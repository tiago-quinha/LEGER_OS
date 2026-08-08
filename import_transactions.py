import os
import re
from decimal import Decimal
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

file_path = "extracto-conta-29-05.txt"

# Regex for the transaction lines (handles optional year, currency suffixes, and optional balance, supports slashes and optional spaces)
pattern = re.compile(r"^(\d{2}[-/]\d{2}(?:[-/]\d{4})?)(?:\s+\d{2}[-/]\d{2}(?:[-/]\d{4})?)?\s+(.+?)\s*([+-]?\d+,\d{2})(?:\s*(?:EUR|[\w$€£]+))?(?:\s*(-?\d+,\d{2})(?:\s*(?:EUR|[\w$€£]+))?)?$")

expenses = []
income_total = 0

raw_lines = []
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        raw_lines = f.readlines()
else:
    # Fallback to other name if needed
    alt_file = "extracto_conta_29-05.txt"
    if os.path.exists(alt_file):
        with open(alt_file, 'r', encoding='utf-8') as f:
            raw_lines = f.readlines()

lines = []
current_tx_line = ""
for line in raw_lines:
    line = line.strip()
    if not line:
        continue
    if re.match(r"^\d{2}[-/]\d{2}", line):
        if current_tx_line:
            lines.append(current_tx_line)
        current_tx_line = line
    else:
        if current_tx_line:
            if pattern.match(current_tx_line):
                # Already complete
                pass
            else:
                current_tx_line += " " + line
        else:
            lines.append(line)
if current_tx_line:
    lines.append(current_tx_line)

OUTFLOW_KW = [
    'saída', 'saida', 'débito', 'debito', 'levantamento', 'compra', 'pagamento', 'trf.imed. p/', 'transferência p/', 'transferencia p/', 'cargo', 'despesa', 'enviado', 'retirado', 'retirada',
    'outflow', 'exit', 'debit', 'withdrawal', 'charge', 'spent', 'paid out', 'money out', 'expense', 'purchase', 'payment', 'transfer to', 'fee', 'sent',
    'salida', 'cargo', 'retiro', 'gasto', 'pago', 'transferencia a', 'comisión',
    'sortie', 'débit', 'debit', 'retrait', 'dépense', 'achat', 'paiement',
    'ausgang', 'ausgabe', 'ausgaben', 'lastschrift', 'abhebung', 'kauf', 'zahlung',
    'uscita', 'addebito', 'prelievo', 'spesa', 'acquisto',
    'uitgaand', 'uitgaven', 'af', 'debet', 'opname', 'betaling'
]

INFLOW_KW = [
    'entrada', 'crédito', 'credito', 'depósito', 'deposito', 'ordenado', 'salário', 'salario', 'vencimento', 'recebido', 'reembolso', 'prémio', 'rewards', 'trf.imed. de', 'transferência de',
    'inflow', 'entry', 'credit', 'deposit', 'income', 'salary', 'payroll', 'paycheck', 'received', 'paid in', 'money in', 'refund', 'topup', 'transfer from',
    'abono', 'ingreso', 'nómina', 'sueldo', 'salario',
    'entrée', 'crédit', 'dépôt', 'revenu', 'salaire',
    'eingang', 'einnahme', 'einnahmen', 'gutschrift', 'gehalt', 'lohn',
    'entrata', 'accredito', 'stipendio',
    'inkomend', 'inkomsten', 'bij', 'salaris'
]

for line in lines:
    match = pattern.match(line)
    if match:
        date_str, desc, amount_str, *rest = match.groups()
        
        # Parse amount
        raw_val = Decimal(amount_str.replace(',', '.'))
        
        # Parse date (handles dashes and slashes)
        date_parts = re.split(r'[-/]', date_str)
        day = int(date_parts[0])
        month = int(date_parts[1])
        year = int(date_parts[2]) if len(date_parts) == 3 else 2026
        date_obj = datetime(year, month, day)

        desc_lower = desc.lower()
        is_outflow = raw_val < 0 or any(kw in desc_lower or kw in line.lower() for kw in OUTFLOW_KW)
        is_inflow = any(kw in desc_lower or kw in line.lower() for kw in INFLOW_KW)

        if is_outflow and not is_inflow:
            amount_val = -abs(raw_val)
            expenses.append({
                "amount": str(amount_val),
                "merchant": desc.strip(),
                "date": date_obj.isoformat(),
                "source": "Santander",
                "raw_text": line
            })
        elif is_inflow or raw_val > 0:
            income_total += abs(raw_val)

print(f"Parsed {len(expenses)} expenses.")
print(f"Total parsed income: {income_total}")

# Batch insert expenses
if expenses:
    try:
        # Insert in chunks of 50 to avoid any Supabase limits
        for i in range(0, len(expenses), 50):
            chunk = expenses[i:i+50]
            supabase.table("tracker_expense").insert(chunk).execute()
        print("Successfully imported expenses to tracker_expense.")
    except Exception as e:
        print(f"Error importing expenses: {e}")

# Update monthly income for May 2026
if income_total > 0:
    try:
        supabase.table("income").upsert({
            "amount": str(income_total),
            "month": 5,
            "year": 2026
        }, on_conflict='month,year').execute()
        print("Successfully updated income for May 2026.")
    except Exception as e:
        print(f"Error updating income: {e}")
