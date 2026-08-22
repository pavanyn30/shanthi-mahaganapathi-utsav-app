package com.shanthimahaganapathi.app;

import android.app.Application;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class ApplicationClass extends Application {
    private static final String ONESIGNAL_APP_ID = "def559e2-60c1-4fc0-ba35-9402e4c1b63c";

    @Override
    public void onCreate() {
        super.onCreate();

        // Enable Verbose Logging for Debugging
        OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);

        // Initialize OneSignal with App ID
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);

        // Request Push Permission with fallback to settings
        new Thread(() -> {
            try {
                OneSignal.getNotifications().requestPermission(true, null);
            } catch (Exception e) {
                // Ignore
            }
        }).start();
    }
}
