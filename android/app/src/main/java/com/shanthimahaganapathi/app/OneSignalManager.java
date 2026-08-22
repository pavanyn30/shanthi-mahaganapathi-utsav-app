package com.shanthimahaganapathi.app;

import android.content.Context;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class OneSignalManager {
    private static OneSignalManager instance;
    private boolean isInitialized = false;

    private OneSignalManager() {}

    public static synchronized OneSignalManager getInstance() {
        if (instance == null) {
            instance = new OneSignalManager();
        }
        return instance;
    }

    public void initialize(Context context, String appId) {
        if (isInitialized) return;

        // Set log level for debugging
        OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);

        // Initialize OneSignal
        OneSignal.initWithContext(context, appId);
        isInitialized = true;
    }

    public void login(String externalId) {
        OneSignal.login(externalId);
    }

    public void requestPermission() {
        OneSignal.getNotifications().requestPermission(true, null);
    }
}
