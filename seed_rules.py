import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- Create merchant_rules table
CREATE TABLE IF NOT EXISTS merchant_rules (
    id SERIAL PRIMARY KEY,
    keyword TEXT NOT NULL UNIQUE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE
);

-- Seed common Portuguese merchant rules
INSERT INTO merchant_rules (keyword, category_id) VALUES 
('Pingo Doce', (SELECT id FROM categories WHERE name = 'Food')),
('Continente', (SELECT id FROM categories WHERE name = 'Food')),
('Lidl', (SELECT id FROM categories WHERE name = 'Food')),
('Auchan', (SELECT id FROM categories WHERE name = 'Food')),
('Mercadona', (SELECT id FROM categories WHERE name = 'Food')),
('Mini Preco', (SELECT id FROM categories WHERE name = 'Food')),
('Uber Eats', (SELECT id FROM categories WHERE name = 'Food')),
('Bolt Food', (SELECT id FROM categories WHERE name = 'Food')),
('Uber', (SELECT id FROM categories WHERE name = 'Transport')),
('Bolt', (SELECT id FROM categories WHERE name = 'Transport')),
('CP - Comboios', (SELECT id FROM categories WHERE name = 'Transport')),
('Galp', (SELECT id FROM categories WHERE name = 'Transport')),
('Repsol', (SELECT id FROM categories WHERE name = 'Transport')),
('BP', (SELECT id FROM categories WHERE name = 'Transport')),
('EDP', (SELECT id FROM categories WHERE name = 'Housing')),
('Endesa', (SELECT id FROM categories WHERE name = 'Housing')),
('MEO', (SELECT id FROM categories WHERE name = 'Housing')),
('Vodafone', (SELECT id FROM categories WHERE name = 'Housing')),
('NOS', (SELECT id FROM categories WHERE name = 'Housing')),
('Netflix', (SELECT id FROM categories WHERE name = 'Entertainment')),
('Spotify', (SELECT id FROM categories WHERE name = 'Entertainment')),
('Steam', (SELECT id FROM categories WHERE name = 'Entertainment')),
('Farmacia', (SELECT id FROM categories WHERE name = 'Health')),
('CUF', (SELECT id FROM categories WHERE name = 'Health')),
('Lusiadas', (SELECT id FROM categories WHERE name = 'Health'))
ON CONFLICT (keyword) DO NOTHING;
"""

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("Merchant rules table created and seeded.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating database: {e}")
