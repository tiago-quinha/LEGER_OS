# LEGER_OS Notification Automation & Bank Sync

LEGER_OS provides two primary ways to automatically capture and sync bank transaction notifications in real time:

1. **Native Android App Sync (Recommended for App Releases)**: Using built-in Android OS notification interception.
2. **MacroDroid / Tasker Integration (No-Code Bridge for Custom Webhooks)**: Using external automation utilities to send HTTP POST requests to Supabase or LEGER_OS API endpoints.

---

## 1. Native Android App Sync
When running LEGER_OS as an installed mobile application, it utilizes the native Android `NotificationListenerService` to automatically detect push notifications from your banking apps (Santander, Revolut, Chase, N26, Nubank, etc.) without third-party tools.

For full architectural details, code implementations, and security standards, refer to:
👉 **[`ANDROID_NOTIFICATION_SERVICE.md`](./ANDROID_NOTIFICATION_SERVICE.md)**

---

## 2. MacroDroid / Tasker Setup (External Bridge)

If you are using LEGER_OS via the web interface and want your Android device to forward bank notifications using MacroDroid, configure your macro with the following specifications:

### Variables
- `extracted_amount` (String)
- `user_merchant` (String)
- `payment_source` (String)
- `signed_amount` (String)

### Webhook Configuration
- **URL**: `https://YOUR_SUPABASE_ID.supabase.co/rest/v1/tracker_expense` (or your `/api/ingest/ai-parse` endpoint)
- **Method**: `POST`
- **Headers**:
    - `apikey`: `YOUR_SUPABASE_ANON_KEY`
    - `Authorization`: `Bearer YOUR_SUPABASE_ANON_KEY`
    - `Content-Type`: `application/json`
    - `Prefer`: `return=representation`

### Payload Structure
```json
{
  "amount": "{v=signed_amount}",
  "merchant": "{v=user_merchant}",
  "source": "{v=payment_source}",
  "raw_text": "{notification_text}",
  "date": "{year}-{month}-{day}T{hour}:{minute}:{second}Z"
}
```

### Sign Logic in MacroDroid
To ensure outflows (purchases/debits) are recorded as negative values and income/deposits as positive values:
1. Create a variable `signed_amount`.
2. If `{notification_text}` contains keywords like `"saída"`, `"débito"`, `"compra"`, `"sent"`, or `"spent"`:
   - Set `signed_amount` to `-{v=extracted_amount}`
3. Else if `{notification_text}` contains keywords like `"crédito"`, `"recebido"`, `"salário"`, `"received"`, or `"deposit"`:
   - Set `signed_amount` to `{v=extracted_amount}`
4. Else:
   - Default to `-{v=extracted_amount}` (most bank notifications are debit transactions).
