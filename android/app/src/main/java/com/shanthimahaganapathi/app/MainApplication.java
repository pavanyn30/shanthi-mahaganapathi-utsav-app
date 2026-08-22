package com.shanthimahaganapathi.app;

import android.app.Application;

public class MainApplication extends Application {
    private static final String ONESIGNAL_APP_ID = "def559e2-60c1-4fc0-ba35-9402e4c1b63c";

    @Override
    public void onCreate() {
        super.onCreate();

        // Initialize OneSignal
        OneSignalManager.getInstance().initialize(this, ONESIGNAL_APP_ID);
    }
}
