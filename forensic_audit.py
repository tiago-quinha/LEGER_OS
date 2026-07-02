import re
import os
from decimal import Decimal

files = [
    "extracto-conta-31-12.txt",
    "extracto-conta-30-01.txt",
    "extracto-conta-27-02.txt",
    "extracto-conta-31-03.txt",
    "extracto-conta-30-04.txt",
    "extracto-conta-29-05.txt"
]

# Patterns
re_start_bal = re.compile(r"Saldo Inicial EUR (\d+,\d{2})")
re_total_summary = re.compile(r"TOTAL\s+(\d+,\d{2})")
re_novo_saldo = re.compile(r"(?:Novo saldo|SALDO EM).*?EUR\s+(-?\d+,\d{2})")
re_tx = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$")

def to_dec(s):
    return Decimal(s.replace('.', '').replace(',', '.'))

print(f"{'File':<25} | {'Start':<10} | {'Total Tx':<10} | {'End (Calc)':<10} | {'End (Bank)':<10}")
print("-" * 75)

for f_path in files:
    if not os.path.exists(f_path):
        continue
        
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        
        # Find Start Balance
        m_start = re_start_bal.search(content)
        start_val = to_dec(m_start.group(1)) if m_start else Decimal('0.00')
        
        # Find End Balance (multiple patterns)
        # 1. Total in summary
        m_total = re_total_summary.search(content)
        # 2. Novo saldo
        m_novo = re_novo_saldo.search(content)
        
        bank_end_val = Decimal('0.00')
        if m_total:
            bank_end_val = to_dec(m_total.group(1))
        elif m_novo:
            bank_end_val = to_dec(m_novo.group(1))

        # Calculate via Tx
        tx_sum = Decimal('0.00')
        tx_count = 0
        for line in lines:
            m_tx = re_tx.match(line.strip())
            if m_tx:
                amount = to_dec(m_tx.group(3))
                tx_sum += amount
                tx_count += 1
        
        calc_end = start_val + tx_sum
        
        print(f"{f_path:<25} | {start_val:>10.2f} | {tx_sum:>10.2f} | {calc_end:>10.2f} | {bank_end_val:>10.2f} ({tx_count} tx)")

