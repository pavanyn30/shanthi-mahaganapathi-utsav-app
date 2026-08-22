package com.shanthimahaganapathi.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.onesignal.OneSignal;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GoogleAuth.class);
    }

    @Override
    public void onStart() {
        super.onStart();

        // Prompt user for push notification permission with active Activity context (Android 13+)
        try {
            OneSignal.getNotifications().requestPermission(true, null);
        } catch (Exception e) {
            // Ignore if already granted/prompted
        }

        try {
            WebView webView = this.bridge.getWebView();
            if (webView != null) {
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
                webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
            }
        } catch (Exception e) {
            // Ignore
        }
    }
}
