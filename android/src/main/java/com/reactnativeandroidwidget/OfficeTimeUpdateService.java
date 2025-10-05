package com.reactnativeandroidwidget;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

public class OfficeTimeUpdateService extends Service {
    private static final String CHANNEL_ID = "OfficeTimeChannel";
    private static final int NOTIFICATION_ID = 1;
    private Handler handler;
    private Runnable updateRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler(Looper.getMainLooper());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Start foreground service with notification
        Notification notification = buildNotification();
        startForeground(NOTIFICATION_ID, notification);

        // Schedule periodic updates every 60 seconds
        updateRunnable = new Runnable() {
            @Override
            public void run() {
                // Update the widget
                RNWidgetJsCommunication.requestWidgetUpdate(getApplicationContext(), "OfficeTime");
                // Schedule next update
                handler.postDelayed(this, 60000); // 60 seconds
            }
        };

        // Start the first update immediately
        handler.post(updateRunnable);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && updateRunnable != null) {
            handler.removeCallbacks(updateRunnable);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Office Time Tracking",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Tracks office time and updates widget");

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, getMainActivityClass());
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Office Time Tracker")
            .setContentText("Tracking your office time")
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }

    private Class<?> getMainActivityClass() {
        try {
            return Class.forName(getPackageName() + ".MainActivity");
        } catch (ClassNotFoundException e) {
            // Fallback to a generic activity
            return android.app.Activity.class;
        }
    }
}