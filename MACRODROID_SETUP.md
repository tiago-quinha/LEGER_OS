# MacroDroid Setup for MoneyTrack

## Variables
- `extracted_amount` (String)
- `user_merchant` (String)
- `payment_source` (String)

## Configuration
- **URL**: `https://dvvpzukousadnchbrjrd.supabase.co/rest/v1/tracker_expense`
- **Method**: `POST`
- **Headers**:
    - `apikey`: `YOUR_SUPABASE_ANON_KEY`
    - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
    - `Content-Type`: `application/json`
    - `Prefer`: `return=representation`

## Payload
```json
{
  "amount": "{v=signed_amount}",
  "merchant": "{v=user_merchant}",
  "source": "{v=payment_source}",
  "raw_text": "{notification_text}",
  "date": "{year}-{month}-{day}T{hour}:{minute}:{second}Z"
}
```

## Sign Logic in MacroDroid
To ensure outflows are negative:
1. Create a variable `signed_amount`.
2. If `{notification_text}` contains "saída" or "débito":
   - Set `signed_amount` to `-{v=extracted_amount}`
3. Else:
   - Set `signed_amount` to `{v=extracted_amount}`
