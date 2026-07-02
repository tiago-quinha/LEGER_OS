import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
supabase: Client = create_client(url, key)

data = {
    "amount": 15.50,
    "merchant": "Library Test",
    "source": "Santander",
    "raw_text": "Test via Supabase Library"
}

try:
    response = supabase.table("tracker_expense").insert(data).execute()
    print(f"Success: {response}")
except Exception as e:
    print(f"Error: {e}")
