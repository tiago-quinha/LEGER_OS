import sys
import pypdf
import io

OUTFLOW_KEYWORDS = [
    'saída', 'saida', 'débito', 'debito', 'levantamento', 'compra', 'pagamento', 'cargo', 'despesa', 'enviado', 'imposto', 'comissão', 'comissao', 'tarifa', 'anuidade', 'retirada', 'retirado',
    'outflow', 'exit', 'debit', 'withdrawal', 'charge', 'spent', 'paid out', 'money out', 'expense', 'purchase', 'payment', 'transfer to', 'fee', 'sent', 'bill', 'atm',
    'salida', 'cargo', 'retiro', 'gasto', 'pago', 'transferencia a', 'comisión', 'comision', 'reintegro',
    'sortie', 'débit', 'debit', 'retrait', 'dépense', 'depense', 'achat', 'paiement', 'virement vers', 'frais', 'prélèvement', 'prelevement',
    'ausgang', 'ausgabe', 'ausgaben', 'lastschrift', 'abhebung', 'kauf', 'zahlung', 'überweisung an', 'uberweisung an', 'soll', 'entnahme', 'gebühr', 'gebuehr',
    'uscita', 'uscite', 'addebito', 'prelievo', 'spesa', 'acquisto', 'pagamento', 'bonifico a', 'dare',
    'uitgaand', 'uitgaven', 'af', 'debet', 'opname', 'betaling', 'overboeking naar', 'aankoop', 'kosten'
]

INFLOW_KEYWORDS = [
    'entrada', 'crédito', 'credito', 'depósito', 'deposito', 'ordenado', 'salário', 'salario', 'vencimento', 'recebido', 'reembolso', 'devolução', 'devolucao', 'prémio', 'premio', 'rewards', 'abono', 'rendimento',
    'inflow', 'entry', 'credit', 'deposit', 'income', 'salary', 'payroll', 'paycheck', 'received', 'paid in', 'money in', 'refund', 'reimbursement', 'reward', 'topup', 'top-up', 'transfer from', 'interest', 'cashback',
    'abono', 'ingreso', 'nómina', 'nomina', 'sueldo', 'salario', 'recibido', 'reembolso', 'devolución', 'devolucion', 'intereses',
    'entrée', 'entree', 'crédit', 'credit', 'dépôt', 'depot', 'revenu', 'salaire', 'paye', 'reçu', 'recu', 'remboursement', 'virement de', 'intérêts',
    'eingang', 'einnahme', 'einnahmen', 'gutschrift', 'einzahlung', 'gehalt', 'lohn', 'erhalten', 'erstattung', 'rückzahlung', 'haben', 'zinsen',
    'entrata', 'entrate', 'accredito', 'deposito', 'stipendio', 'salario', 'ricevuto', 'rimborso', 'bonifico da', 'avere',
    'inkomend', 'inkomsten', 'bij', 'credit', 'storting', 'salaris', 'loon', 'ontvangen', 'terugbetaling', 'rente'
]

def main():
    try:
        # Read raw bytes from stdin
        pdf_bytes = sys.stdin.buffer.read()
        if not pdf_bytes:
            print("ERROR: No input bytes", file=sys.stderr)
            sys.exit(1)
            
        # Strip Java serialization header if present
        if pdf_bytes.startswith(b'\xac\xed\x00\x05'):
            pdf_bytes = pdf_bytes[27:]
            
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
            
        # Write extracted text to stdout
        sys.stdout.write(text)
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
