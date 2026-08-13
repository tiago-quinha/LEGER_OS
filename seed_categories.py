import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found")
    exit(1)

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT id, username FROM profiles;")
profiles = cur.fetchall()

defaults = [
    ("Groceries & Food", "#10b981"),
    ("Transport & Fuel", "#3b82f6"),
    ("Housing & Rent", "#8b5cf6"),
    ("Utilities & Bills", "#f59e0b"),
    ("Dining & Cafes", "#ec4899"),
    ("Health & Pharmacy", "#14b8a6"),
    ("Entertainment & Leisure", "#a855f7"),
    ("Subscriptions & Tech", "#6366f1"),
    ("Salary & Income", "#22c55e"),
    ("Other & General", "#64748b")
]

total_added = 0
for pid, uname in profiles:
    cur.execute("SELECT COUNT(*) FROM categories WHERE user_id = %s;", (pid,))
    cnt = cur.fetchone()[0]
    if cnt == 0:
        print(f"Seeding default categories for user '{uname}' ({pid})...")
        for name, color in defaults:
            cat_name = f"{name}"
            cur.execute("""
                INSERT INTO categories (name, color, user_id) 
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (cat_name, color, pid))
            if cur.rowcount > 0:
                total_added += 1

conn.commit()
cur.execute("NOTIFY pgrst, 'reload schema';")
conn.commit()
print(f"Done! Seeded {total_added} category records across profiles.")

cur.close()
conn.close()
