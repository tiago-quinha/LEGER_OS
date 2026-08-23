package com.legeros.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class LegerAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "LEGER_ALARM_RECEIVER";
    private static final String PREFS_NAME = "leger_bank_sync_prefs";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_BASE_URL = "base_url";

    @Override
    public void onReceive(Context context, Intent intent) {
        String actionType = intent.getStringExtra("action_type");
        if (actionType == null) actionType = "morning_outlook";

        Log.d(TAG, "Alarm triggered for action: " + actionType);

        final String finalAction = actionType;
        final PendingResult pendingResult = goAsync();

        new Thread(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String savedUserId = prefs.getString(KEY_USER_ID, "");
                String savedBaseUrl = prefs.getString(KEY_BASE_URL, "https://leger-os.vercel.app");

                if ("morning_outlook".equals(finalAction)) {
                    // Reschedule for tomorrow
                    LegerScheduler.scheduleAlarm(context, 8, 30, LegerScheduler.REQ_CODE_MORNING, "morning_outlook");
                    fetchAndShowMorningBrief(context, savedBaseUrl, savedUserId);
                } else if ("evening_wrap".equals(finalAction)) {
                    // Reschedule for tomorrow
                    LegerScheduler.scheduleAlarm(context, 21, 30, LegerScheduler.REQ_CODE_EVENING, "evening_wrap");
                    fetchAndShowEveningWrap(context, savedBaseUrl, savedUserId);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing alarm: " + e.getMessage());
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    private void fetchAndShowMorningBrief(Context context, String baseUrl, String userId) {
        String title = "🌅 Morning Financial Outlook";
        String body = "Safe variable burn active. Tap to view today's financial forecast.";
        try {
            String endpoint = baseUrl + "/api/notifications/daily-outlook";
            if (userId != null && !userId.isEmpty()) {
                endpoint += "?userId=" + userId + "&source=native_android";
            }
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                JSONObject res = new JSONObject(sb.toString());
                if (res.has("title")) {
                    title = res.getString("title");
                }
                if (res.has("summary")) {
                    body = res.getString("summary");
                }
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Could not fetch dynamic morning brief, showing standard brief: " + e.getMessage());
        }

        showSystemNotification(context, 101, title, body, "/");
    }

    private void fetchAndShowEveningWrap(Context context, String baseUrl, String userId) {
        String title = "Portfolio Wrap";
        String body = "Daily market session closed. Tap to view today's portfolio performance.";
        try {
            String endpoint = baseUrl + "/api/cron/sync-market-data";
            if (userId != null && !userId.isEmpty()) {
                endpoint += "?userId=" + userId + "&source=native_android";
            }
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
                JSONObject res = new JSONObject(sb.toString());
                if (res.has("wrapTitle")) {
                    title = res.getString("wrapTitle");
                }
                if (res.has("wrapSummary")) {
                    body = res.getString("wrapSummary");
                }
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Could not fetch dynamic evening wrap, showing standard wrap: " + e.getMessage());
        }

        showSystemNotification(context, 102, title, body, "/portfolio");
    }

    private void showSystemNotification(Context context, int notifId, String title, String body, String route) {
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            String channelId = "leger_os_daily_briefs";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "LEGER_OS Daily Briefs",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Morning financial outlook and evening market wrap notifications");
                notificationManager.createNotificationChannel(channel);
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (route != null) {
                intent.putExtra("route", route);
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                notifId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

            notificationManager.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to display system notification: " + e.getMessage());
        }
    }
}
