package com.legeros.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class LegerBootReceiver extends BroadcastReceiver {
    private static final String TAG = "LEGER_BOOT_RECEIVER";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            Log.d(TAG, "Device booted. Re-scheduling daily alarms.");
            LegerScheduler.scheduleAllDailyAlarms(context);
        }
    }
}
