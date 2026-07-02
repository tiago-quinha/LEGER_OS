import re
from decimal import Decimal

def parse_notification(text):
    """
    Parses Portuguese banking notifications to extract amount and merchant.
    Patterns:
    - "Compra de 12,50€ em MERCHANT"
    - "Pagamento de 10.00 EUR a MERCHANT"
    """
    # Pattern to match amount (comma or dot as decimal separator) followed by € or EUR
    # and merchant after 'em' or 'a'
    pattern = r"(?:Compra|Pagamento) de (\d+[.,]\d{2})\s*(?:€|EUR) (?:em|a) (.+)"
    
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        amount_str = match.group(1).replace(',', '.')
        merchant = match.group(2).strip()
        return {
            'amount': Decimal(amount_str),
            'merchant': merchant
        }
    return None
