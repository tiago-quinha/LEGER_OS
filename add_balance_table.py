import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- Create account_balance table
CREATE TABLE IF NOT EXISTS account_balance (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL UNIQUE
);
"""

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("account_balance table created successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error creating table: {e}")
