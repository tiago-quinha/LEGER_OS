package com.legeros.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
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

        // Hard block self app notifications (never intercept LEGER_OS's own notifications)
        if (packageName.equals("com.legeros.app") || packageName.equals(getPackageName())) {
            return;
        }

        // Strictly enforce user's selected bank apps from SharedPreferences
        Set<String> userSelectedPackages = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getStringSet(KEY_PACKAGES, null);

        // If user hasn't selected any packages yet, fallback to default bank registry.
        // Once user selects apps, ONLY those selected packages are ever captured.
        boolean isPermittedApp;
        if (userSelectedPackages != null && !userSelectedPackages.isEmpty()) {
            isPermittedApp = userSelectedPackages.contains(packageName);
        } else {
            isPermittedApp = BANK_PACKAGES.contains(packageName.toLowerCase());
        }

        // Hard block: NEVER process messaging, chat, social media, or system apps under ANY circumstances
        String lowerPkg = packageName.toLowerCase();
        if (lowerPkg.contains("telegram") || lowerPkg.contains("whatsapp") || lowerPkg.contains("discord") ||
            lowerPkg.contains("signal") || lowerPkg.contains("viber") || lowerPkg.contains("messenger") ||
            lowerPkg.contains("instagram") || lowerPkg.contains("twitter") || lowerPkg.contains("reddit") ||
            lowerPkg.contains("android.systemui") || lowerPkg.contains("android.providers") ||
            lowerPkg.contains("legeros")) {
            return;
        }

        if (!isPermittedApp) {
            return; // Ignore any unselected application immediately
        }

        // Extract title and text
        Bundle extras = sbn.getNotification().extras;
        String title = extras != null ? extras.getString(Notification.EXTRA_TITLE, "") : "";
        CharSequence textChar = extras != null ? extras.getCharSequence(Notification.EXTRA_TEXT) : "";
        String text = textChar != null ? textChar.toString() : "";

        Log.d(TAG, "Bank Notification Captured from: " + packageName + " | Title: " + title + " | Text: " + text);

        // Dispatch transaction to LEGER_OS Webhook asynchronously
        dispatchToLegerOS(packageName, title, text);
    }

    private void dispatchToLegerOS(String packageName, String title, String text) {
        new Thread(() -> {
            try {
                String savedUserId = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_USER_ID, "");
                String savedBaseUrl = getSharedPreferences(PREFS_NAME, MODE_PRIVATE).getString(KEY_BASE_URL, "https://leger-os.vercel.app");

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

                if (responseCode >= 200 && responseCode < 300) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                        StringBuilder responseSb = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) {
                            responseSb.append(line.trim());
                        }

                        JSONObject resJson = new JSONObject(responseSb.toString());
                        String displayTitle = "LEGER_OS · Purchase Captured";
                        String displayMsg = "Transaction logged to your ledger.";
                        String txId = "";

                        if (resJson.has("transaction")) {
                            JSONObject txObj = resJson.getJSONObject("transaction");
                            String merchant = txObj.optString("merchant", "");
                            double amount = txObj.optDouble("amount", 0.0);
                            txId = String.valueOf(txObj.opt("id"));
                            String formattedAmt = String.format("%.2f", Math.abs(amount));
                            displayTitle = (merchant.isEmpty() ? "Santander" : merchant) + " · -€" + formattedAmt;
                            displayMsg = "Transaction logged in LEGER_OS · Tap to view.";
                        }

                        showNativeNotification(displayTitle, displayMsg, txId);
                    } catch (Exception parseEx) {
                        showNativeNotification("LEGER_OS · Purchase Logged", title + " (" + text + ")", "");
                    }
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to dispatch bank notification to LEGER_OS: " + e.getMessage());
            }
        }).start();
    }

    private void showNativeNotification(String displayTitle, String displayMsg, String txId) {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            String channelId = "leger_os_transactions";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "LEGER_OS Transactions",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Real-time transaction capture alerts");
                notificationManager.createNotificationChannel(channel);
            }

            Intent intent = new Intent(this, MainActivity.class);
            if (txId != null && !txId.isEmpty()) {
                intent.putExtra("resolveTxId", txId);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle(displayTitle)
                .setContentText(displayMsg)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

            notificationManager.notify((int) (System.currentTimeMillis() % 100000), builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to show native notification: " + e.getMessage());
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No-op
    }
}
