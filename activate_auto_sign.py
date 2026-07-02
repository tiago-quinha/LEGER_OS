import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- 1. Create a function that handles the sign detection logic
CREATE OR REPLACE FUNCTION fix_expense_sign()
RETURNS TRIGGER AS $$
BEGIN
    -- Only flip sign if the amount is currently positive
    IF NEW.amount > 0 THEN
        -- Check if raw_text indicates money leaving the account
        IF NEW.raw_text ILIKE '%saída%' 
           OR NEW.raw_text ILIKE '%débito%' 
           OR NEW.raw_text ILIKE '%compra%' 
           OR NEW.raw_text ILIKE '%pagamento%' 
           OR NEW.raw_text ILIKE '%levantamento%'
        THEN
            -- Double check it's not an explicit "entrada"
            IF NEW.raw_text NOT ILIKE '%entrada%' AND NEW.raw_text NOT ILIKE '%crédito%' THEN
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
