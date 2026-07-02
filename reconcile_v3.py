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

re_period = re.compile(r"PERÍODO DE (\d{4}-\d{2}-\d{2}) A (\d{4}-\d{2}-\d{2})")
re_start_bal = re.compile(r"Saldo Inicial EUR (\d+,\d{2})")
# Pattern for the "Novo saldo" or final line
re_tx = re.compile(r"^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$")

def to_dec(s):
    return Decimal(s.replace('.', '').replace(',', '.'))

print(f"{'File':<25} | {'Period Start':<12} | {'Period End':<12} | {'Start Bal':<10} | {'Calculated End':<10} | {'Final TX Saldo':<10}")
print("-" * 105)

for f_path in files:
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lines = content.splitlines()
        
        m_period = re_period.search(content)
        start_date = m_period.group(1) if m_period else "N/A"
        end_date = m_period.group(2) if m_period else "N/A"
        
        m_start = re_start_bal.search(content)
        start_bal = to_dec(m_start.group(1)) if m_start else Decimal('0')
        
        calc_bal = start_bal
        last_saldo_in_tx = Decimal('0')
        tx_found = False
        
        for line in lines:
            m_tx = re_tx.match(line.strip())
            if m_tx:
                amount = to_dec(m_tx.group(3))
                saldo = to_dec(m_tx.group(4))
                calc_bal += amount
                last_saldo_in_tx = saldo
                tx_found = True
        
        print(f"{f_path:<25} | {start_date:<12} | {end_date:<12} | {start_bal:>10.2f} | {calc_bal:>14.2f} | {last_saldo_in_tx:>14.2f}")
