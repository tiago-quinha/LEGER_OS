import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- 1. Create a function that handles multi-lingual sign detection logic
CREATE OR REPLACE FUNCTION fix_expense_sign()
RETURNS TRIGGER AS $$
BEGIN
    -- Only flip sign if the amount is currently positive
    IF NEW.amount > 0 THEN
        -- Check if raw_text indicates money leaving the account (Outflow / Exit / Debit in multiple languages)
        IF NEW.raw_text ILIKE '%saída%' 
           OR NEW.raw_text ILIKE '%saida%'
           OR NEW.raw_text ILIKE '%débito%' 
           OR NEW.raw_text ILIKE '%debito%' 
           OR NEW.raw_text ILIKE '%compra%' 
           OR NEW.raw_text ILIKE '%pagamento%' 
           OR NEW.raw_text ILIKE '%levantamento%'
           OR NEW.raw_text ILIKE '%retirado%'
           OR NEW.raw_text ILIKE '%retirada%'
           OR NEW.raw_text ILIKE '%outflow%'
           OR NEW.raw_text ILIKE '%exit%'
           OR NEW.raw_text ILIKE '%debit%'
           OR NEW.raw_text ILIKE '%withdrawal%'
           OR NEW.raw_text ILIKE '%purchase%'
           OR NEW.raw_text ILIKE '%payment%'
           OR NEW.raw_text ILIKE '%spent%'
           OR NEW.raw_text ILIKE '%charge%'
           OR NEW.raw_text ILIKE '%salida%'
           OR NEW.raw_text ILIKE '%cargo%'
           OR NEW.raw_text ILIKE '%retiro%'
           OR NEW.raw_text ILIKE '%gasto%'
           OR NEW.raw_text ILIKE '%sortie%'
           OR NEW.raw_text ILIKE '%dépense%'
           OR NEW.raw_text ILIKE '%achat%'
           OR NEW.raw_text ILIKE '%ausgabe%'
           OR NEW.raw_text ILIKE '%ausgaben%'
           OR NEW.raw_text ILIKE '%lastschrift%'
           OR NEW.raw_text ILIKE '%abhebung%'
           OR NEW.raw_text ILIKE '%kauf%'
           OR NEW.raw_text ILIKE '%uscita%'
           OR NEW.raw_text ILIKE '%addebito%'
           OR NEW.raw_text ILIKE '%spesa%'
        THEN
            -- Double check it's not an explicit inflow/entry keyword
            IF NEW.raw_text NOT ILIKE '%entrada%' 
               AND NEW.raw_text NOT ILIKE '%crédito%' 
               AND NEW.raw_text NOT ILIKE '%credito%' 
               AND NEW.raw_text NOT ILIKE '%inflow%'
               AND NEW.raw_text NOT ILIKE '%entry%'
               AND NEW.raw_text NOT ILIKE '%credit%'
               AND NEW.raw_text NOT ILIKE '%deposit%'
               AND NEW.raw_text NOT ILIKE '%salary%'
               AND NEW.raw_text NOT ILIKE '%abono%'
               AND NEW.raw_text NOT ILIKE '%ingreso%'
               AND NEW.raw_text NOT ILIKE '%einnahme%'
               AND NEW.raw_text NOT ILIKE '%gutschrift%'
            THEN
                NEW.amount := -NEW.amount;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger to run BEFORE each insert on tracker_expense
DROP TRIGGER IF EXISTS trigger_fix_expense_sign ON tracker_expense;
CREATE TRIGGER trigger_fix_expense_sign
BEFORE INSERT ON tracker_expense
FOR EACH ROW
EXECUTE FUNCTION fix_expense_sign();

COMMENT ON FUNCTION fix_expense_sign IS 'Automatically corrects transaction signs based on notification text from MacroDroid.';
"""

try:
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is missing.")
        
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("Mainframe Update: Auto-Sign Trigger successfully activated.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Update Failure: {e}")
