package com.legeros.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * LEGER_OS Native Bank Notification Listener
 * Automatically intercepts incoming payment notifications from banking apps (MB WAY, Santander, Revolut, etc.)
 * and posts them directly to the LEGER_OS transaction ingestion engine.
 */
public class LegerBankNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "LEGER_OS_BANK_SYNC";

    // Known Banking & Payment App Packages (Portugal, Spain, Europe, Global)
    private static final Set<String> BANK_PACKAGES = new HashSet<>(Arrays.asList(
        "pt.sibs.android.mbway",           // MB WAY
        "com.santander.app",               // Santander Portugal / Spain
        "pt.santandertotta.mobileparticulares", // Santander Totta PT
        "com.revolut.revolut",             // Revolut
        "pt.bcp.ebanking",                 // Millennium BCP
        "pt.cgd.mobile",                   // Caixa Geral de Depositos (CaixaDirecta)
        "com.activobank.mobile",           // ActivoBank
        "com.novobanco.nbapp",             // Novo Banco
        "com.bancoctt.app",                // Banco CTT
        "com.bankinter.pt",                // Bankinter Portugal
        "com.bbva.bbvacontigo",            // BBVA
        "com.caixabank.mobile",            // CaixaBank
        "de.number26.android",             // N26
        "com.transferwise.android",        // Wise
        "com.monzo.android",               // Monzo
        "com.ing.mobile",                  // ING
        "com.google.android.apps.walletnfcrel" // Google Wallet / Pay
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Check if the notification comes from a known bank / payment provider
        boolean isBank = BANK_PACKAGES.contains(packageName.toLowerCase());

        // Extract title and text
        Bundle extras = sbn.getNotification().extras;
        String title = extras != null ? extras.getString(Notification.EXTRA_TITLE, "") : "";
        CharSequence textChar = extras != null ? extras.getCharSequence(Notification.EXTRA_TEXT) : "";
        String text = textChar != null ? textChar.toString() : "";

        // Also check if text contains currency symbols or keywords if package is from an unrecognized bank
        boolean containsTransactionKeywords = text.contains("€") || text.contains("EUR") || text.contains("$") || text.contains("£") ||
                text.toLowerCase().contains("compra") || text.toLowerCase().contains("pagamento") || text.toLowerCase().contains("pago") ||
                text.toLowerCase().contains("transferência") || text.toLowerCase().contains("spent") || text.toLowerCase().contains("paid");

        if (!isBank && !containsTransactionKeywords) {
            return; // Ignore regular non-banking notifications (WhatsApp, Telegram, etc.)
        }

        Log.d(TAG, "Bank Notification Detected from: " + packageName + " | Title: " + title + " | Text: " + text);

        // Dispatch transaction to LEGER_OS Webhook asynchronously
        dispatchToLegerOS(packageName, title, text);
    }

    private void dispatchToLegerOS(String packageName, String title, String text) {
        new Thread(() -> {
            try {
                URL url = new URL("https://leger-os.vercel.app/api/transactions/device-push");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);

                JSONObject payload = new JSONObject();
                payload.put("appName", packageName);
                payload.put("title", title);
                payload.put("text", text);
                payload.put("timestamp", System.currentTimeMillis());
                payload.put("source", "native_android_listener");

                byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Dispatched bank notification to LEGER_OS: HTTP " + responseCode);
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to dispatch bank notification to LEGER_OS: " + e.getMessage());
            }
        }).start();
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No-op
    }
}
