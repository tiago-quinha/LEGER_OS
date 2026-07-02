import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = "https://dvvpzukousadnchbrjrd.supabase.co/rest/v1/tracker_expense"
headers = {
    "apikey": os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    "Authorization": f"Bearer {os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

data = {
    "amount": "",
    "merchant": "Empty Amount Test",
    "source": "Santander",
    "raw_text": "Testing empty amount string"
}

response = requests.post(url, headers=headers, json=data)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
