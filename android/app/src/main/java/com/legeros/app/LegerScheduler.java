package com.legeros.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

public class LegerScheduler {
    private static final String TAG = "LEGER_SCHEDULER";

    public static final int REQ_CODE_MORNING = 1001;
    public static final int REQ_CODE_EVENING = 1002;

    public static void scheduleAllDailyAlarms(Context context) {
        scheduleAlarm(context, 8, 30, REQ_CODE_MORNING, "morning_outlook");
        scheduleAlarm(context, 21, 30, REQ_CODE_EVENING, "evening_wrap");
        Log.d(TAG, "Scheduled morning (08:30) and evening (21:30) alarms.");
    }

    public static void scheduleAlarm(Context context, int hour, int minute, int reqCode, String actionType) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, LegerAlarmReceiver.class);
            intent.setAction("com.legeros.app.TRIGGER_DAILY_BRIEF");
            intent.putExtra("action_type", actionType);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                reqCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
            }

            long triggerTime = calendar.getTimeInMillis();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm for " + hour + ":" + minute + ": " + e.getMessage());
        }
    }
}
