# LEGER_OS: Native Android Notification Listener Architecture

When releasing **LEGER_OS** as a standalone Android application (e.g., using React Native, Flutter, or Ionic/Capacitor with a native Android module), the app can natively intercept push notifications from **any banking application** installed on the user's device. This replaces external third-party automation tools like MacroDroid or Tasker with a seamless, built-in system service.

---

## 1. Core Architecture & Native Android API

Android provides a dedicated background system service for listening to system and app notifications: [`NotificationListenerService`](https://developer.android.com/reference/android/service/notification/NotificationListenerService).

### Architectural Data Flow:
1. **Bank App Push**: A bank app (e.g., Santander, Revolut, N26, Chase, Nubank, Wise) generates a push notification for a new debit or credit card transaction.
2. **System Interception**: The Android OS routes notification broadcast events to all enabled `NotificationListenerService` implementations.
3. **Package Filtering**: LEGER_OS checks if the notification originated from a whitelisted banking package ID (e.g., `com.santander.app`, `com.revolut.revolut`, `de.n26.android`).
4. **Text Extraction & AI Ingestion**: The notification title and text body are extracted, formatted into a structured payload, and sent to the LEGER_OS backend ingestion API (`/api/ingest/ai-parse` or `/api/categorize`) powered by **Gemini 2.5 Pro**.
5. **Database Sync**: The transaction is stored directly in Supabase (`tracker_expense` table), updating the user's real-time dashboard and burn rate velocity.

---

## 2. Implementation: Android Native Module (Kotlin)

### Step 1: Define the Service in `AndroidManifest.xml`
To register the service, declare it inside the `<application>` block with the required permission:

```xml
<service
    android:name=".services.LegerNotificationListenerService"
    android:label="LEGER_OS Financial Sync"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

### Step 2: Implement `LegerNotificationListenerService.kt`

```kotlin
package com.legeros.app.services

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class LegerNotificationListenerService : NotificationListenerService() {

    companion object {
        const val TAG = "LegerNotificationService"
        // Known banking package IDs to monitor (expandable by user settings)
        val BANK_PACKAGES = setOf(
            "com.santander.app",
            "pt.santander.totta",
            "com.revolut.revolut",
            "de.n26.android",
            "com.nubank",
            "com.wise.app",
            "com.chase.sig.android",
            "com.citi.citimobile",
            "com.americanexpress.android.acctsvcs.us"
        )
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }

    private val httpClient = OkHttpClient()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // 1. Filter out non-banking applications for privacy and efficiency
        if (!BANK_PACKAGES.contains(packageName)) return

        val notification = sbn.notification
        val extras = notification.extras
        
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""
        
        val rawContent = "$title - ${if (bigText.isNotEmpty()) bigText else text}"
        
        Log.d(TAG, "Captured Bank Notification from [$packageName]: $rawContent")
        
        // 2. Dispatch to LEGER_OS Ingestion Backend
        sendToLegerIngestion(packageName, rawContent, sbn.postTime)
    }

    private fun sendToLegerIngestion(sourceApp: String, rawText: String, timestamp: Long) {
        // Build JSON Payload
        val jsonPayload = JSONObject().apply {
            put("source", sourceApp)
            put("raw_text", rawText)
            put("timestamp", timestamp)
            put("device_os", "android")
        }

        val requestBody = jsonPayload.toString().toRequestBody(JSON_MEDIA_TYPE)
        
        // Send to LEGER_OS API Endpoint (hosted on Vercel or Supabase Edge Function)
        val request = Request.Builder()
            .url("https://leger-os.vercel.app/api/ingest/ai-parse")
            .addHeader("Authorization", "Bearer <USER_SESSION_TOKEN>")
            .post(requestBody)
            .build()

        httpClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e(TAG, "Failed to send notification to LEGER_OS: ${e.message}")
                // TODO: Store in SQLite local offline queue for retry when network is restored
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    Log.i(TAG, "Successfully ingested transaction from $sourceApp")
                } else {
                    Log.w(TAG, "Ingestion failed with HTTP ${response.code}")
                }
                response.close()
            }
        })
    }
}
```

---

## 3. Requesting User Permission in UI

Because notification interception is a high-privilege Android permission, it cannot be requested via a standard runtime popup (`ActivityCompat.requestPermissions`). The user must be directed to Android's **Special App Access -> Notification Access** settings screen.

### React Native / Capacitor Bridge Helper:
When the user toggles "Enable Bank Notification Sync" in `SystemSettingsModal.tsx` on Android:

```javascript
// Example code for redirecting user to Notification Listener settings
import { NativeModules, Platform } from 'react-native';

export function checkAndRequestNotificationListener() {
  if (Platform.OS === 'android') {
    // Direct user to Special Access settings
    NativeModules.LegerNotificationModule.openNotificationListenerSettings();
  }
}
```

In Kotlin native code:
```kotlin
val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
context.startActivity(intent)
```

---

## 4. Universal AI Parsing Engine (Gemini 2.5 Pro)

To ensure support for **any bank application worldwide** without needing thousands of regex rules for different languages and message layouts, LEGER_OS uses an AI-first parsing pipeline.

When `/api/ingest/ai-parse` receives the `raw_text` from the Android app, it invokes **Gemini 2.5 Pro** with structured JSON output instructions:

```json
{
  "system_instruction": "You are a financial transaction data extraction engine for LEGER_OS. Given a raw push notification string from a bank app, extract the transaction details and return strict JSON.",
  "input": "Santander - Compra autorizada no cartão final 4812: R$ 145,90 em UBER *TRIP SÃO PAULO em 07/07 às 18:30. Débito em conta.",
  "expected_output": {
    "is_transaction": true,
    "amount": -145.90,
    "currency": "BRL",
    "merchant": "Uber Trip",
    "transaction_type": "debit",
    "suggested_category": "Transport",
    "confidence_score": 0.99
  }
}
```

### Why AI Parsing over Regex?
1. **Multi-Currency & Multi-Language**: Automatically handles syntax like `€ 1.450,00`, `$1,450.00`, `R$ 145,90`, `£45.00`, or `1 450,00 kr`.
2. **Merchant Clean-Up**: Strips payment processor prefixes (e.g., `SUMUP*`, `PAG*`, `PAYPAL *`, `STRIPE*`, `CRV*`) to produce clean, recognizable merchant titles.
3. **Sign Detection**: Accurately differentiates between purchases/debits (outflow = negative) and deposits/refunds/salaries (inflow = positive) based on semantic context (e.g., "compra autorizada", "received payment", "débito", "crédito", "transferência recebida").

---

## 5. Security & Privacy Guarantees

1. **Strict Package Whitelisting**: The listener ignores messaging apps (WhatsApp, Telegram), social media, emails, and OTP SMS notifications. Only known financial app package IDs are processed.
2. **Zero On-Device Logging**: Raw notification strings are held in volatile RAM only during the HTTP dispatch and are never logged to permanent device storage in plain text.
3. **User-Controlled App List**: Users can customize their active banking package list in LEGER_OS Settings, adding regional credit unions or crypto wallets as needed.
4. **Offline Resilience**: If the device has no internet connection when a notification fires, transactions are queued in an encrypted local database (Room/SQLite) and synced to Supabase when connectivity returns.
