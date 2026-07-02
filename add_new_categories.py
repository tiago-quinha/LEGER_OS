import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")

sql = """
-- Add new categories
INSERT INTO categories (name, color, icon) VALUES 
('Gas', '#F59E0B', 'Fuel'),
('Gambling', '#7C3AED', 'Dices'),
('MB WAY', '#06B6D4', 'User')
ON CONFLICT (name) DO NOTHING;

-- Add rules for new categories
INSERT INTO merchant_rules (keyword, category_id) VALUES 
('superfaro', (SELECT id FROM categories WHERE name = 'Gas')),
('eupago', (SELECT id FROM categories WHERE name = 'Gambling')),
('betclic', (SELECT id FROM categories WHERE name = 'Gambling')),
('betano', (SELECT id FROM categories WHERE name = 'Gambling')),
('keydrop', (SELECT id FROM categories WHERE name = 'Gambling'))
ON CONFLICT (keyword) DO NOTHING;
"""

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("New categories and rules added successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error updating database: {e}")
