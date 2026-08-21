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
        "com.sibs.mbway",                  // MB WAY alias
        "com.santander.app",               // Santander Portugal / Spain
        "com.santander.app.es",            // Santander Spain
        "pt.santandertotta.mobileparticulares", // Santander Totta PT
        "pt.santander.oneappparticulares", // Santander OneApp Particulares PT
        "pt.santander.empresas",           // Santander Empresas PT
        "com.santander.particulares",      // Santander Particulares
        "com.revolut.revolut",             // Revolut
        "pt.bcp.ebanking",                 // Millennium BCP
        "pt.bcp.app",                      // Millennium BCP alias
        "pt.cgd.mobile",                   // Caixa Geral de Depositos
        "pt.cgd.caixadirecta",             // CaixaDirecta
        "com.activobank.mobile",           // ActivoBank
        "pt.activobank.mobile",            // ActivoBank alias
        "com.novobanco.nbapp",             // Novo Banco
        "pt.novobanco.app",                // Novo Banco alias
        "com.bancoctt.app",                // Banco CTT
        "pt.bancoctt.app",                 // Banco CTT alias
        "pt.bpi.bpidireto",                // BPI Direto
        "com.bankinter.pt",                // Bankinter Portugal
        "pt.montepio.mobile",              // Montepio
        "pt.creditoagricola.moey",         // moey!
        "pt.ca.directa",                   // Credito Agricola
        "pt.eurobic.mobile",               // EuroBic
        "com.abanca.mobile.pt",            // Abanca PT
        "pt.sonae.universo",               // Universo
        "pt.wizink.app",                   // WiZink
        "pt.cofidis.mobile",               // Cofidis
        "com.bbva.bbvacontigo",            // BBVA
        "com.caixabank.mobile",            // CaixaBank
        "es.caixabank.caixabanknow",       // CaixaBankNow
        "de.number26.android",             // N26
        "com.transferwise.android",        // Wise
        "com.monzo.android",               // Monzo
        "com.ing.mobile",                  // ING
        "com.google.android.apps.walletnfcrel" // Google Wallet / Pay
    ));

    private static final String PREFS_NAME = "leger_bank_sync_prefs";
    private static final String KEY_PACKAGES = "selected_bank_packages";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_BASE_URL = "base_url";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Check user's dynamically selected apps from SharedPreferences
        Set<String> userSelectedPackages = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getStringSet(KEY_PACKAGES, null);

        boolean isSelectedByUser = userSelectedPackages != null && userSelectedPackages.contains(packageName);
        boolean isDefaultBank = BANK_PACKAGES.contains(packageName.toLowerCase());

        boolean isBank = isSelectedByUser || (userSelectedPackages == null && isDefaultBank);

        // Extract title and text
        Bundle extras = sbn.getNotification().extras;
        String title = extras != null ? extras.getString(Notification.EXTRA_TITLE, "") : "";
        CharSequence textChar = extras != null ? extras.getCharSequence(Notification.EXTRA_TEXT) : "";
        String text = textChar != null ? textChar.toString() : "";

        // Check if text contains transaction markers
        boolean containsTransactionKeywords = text.contains("€") || text.contains("EUR") || text.contains("$") || text.contains("£") ||
                text.toLowerCase().contains("compra") || text.toLowerCase().contains("pagamento") || text.toLowerCase().contains("pago") ||
                text.toLowerCase().contains("transferência") || text.toLowerCase().contains("transferencia") ||
                text.toLowerCase().contains("spent") || text.toLowerCase().contains("paid") || text.toLowerCase().contains("autorizada");

        if (!isBank && !containsTransactionKeywords) {
            return; // Ignore regular non-banking notifications
        }

        Log.d(TAG, "Bank Notification Captured from: " + packageName + " | Title: " + title + " | Text: " + text);

        // Dispatch transaction to LEGER_OS Webhook asynchronously
        dispatchToLegerOS(packageName, title, text);
    }

    private void dispatchToLegerOS(String packageName, String title, String text) {
        new Thread(() -> {
            try {
                String savedUserId = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_USER_ID, "");
                String savedBaseUrl = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_BASE_URL, "https://legeros.vercel.app");

                String endpoint = savedBaseUrl + "/api/transactions/device-push";
                if (savedUserId != null && !savedUserId.isEmpty()) {
                    endpoint += "?userId=" + savedUserId;
                }

                URL url = new URL(endpoint);
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
                payload.put("raw_text", title + " - " + text);
                if (savedUserId != null && !savedUserId.isEmpty()) {
                    payload.put("userId", savedUserId);
                }
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
