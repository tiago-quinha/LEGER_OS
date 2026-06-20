import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- Create income table
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    UNIQUE(month, year)
);
"""

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("Income table created successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating database: {e}")
