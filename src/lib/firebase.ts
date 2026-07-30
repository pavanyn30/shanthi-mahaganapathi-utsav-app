import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { PushNotifications } from "@capacitor/push-notifications";
import { toast } from "sonner";

// Firebase web configuration (can be overriden via environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD_PLACEHOLDER_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ganapathi-utsav.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ganapathi-utsav",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ganapathi-utsav.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

// Initialize Firebase App instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messagingInstance = getMessaging(app);
  } catch (err) {
    console.warn("Firebase Messaging not supported in current environment", err);
  }
}

export const messaging = messagingInstance;

/**
 * Request Push Notification permissions and register device token
 * Works across both Web (FCM) and Android Native App (Capacitor Push Notifications)
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined") return null;

  try {
    // 1. If running inside Native Capacitor Android App
    if ((window as any).Capacitor?.isNativePlatform()) {
      let perm = await PushNotifications.checkPermissions();

      if (perm.receive !== "granted") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive === "granted") {
        await PushNotifications.register();
        
        PushNotifications.addListener("registration", (token) => {
          console.log("[Firebase FCM] Device Push Token:", token.value);
          toast.success("Push notifications enabled!");
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          toast.info(notification.title || "Festival Alert", {
            description: notification.body,
          });
        });
      }
      return null;
    }

    // 2. Web Browser FCM Registration
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && messaging) {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        }).catch(() => null);

        if (token) {
          console.log("[Firebase FCM Web Token]:", token);
          toast.success("Browser push notifications active!");
        }

        onMessage(messaging, (payload) => {
          toast.info(payload.notification?.title || "New Announcement", {
            description: payload.notification?.body,
          });
        });

        return token;
      }
    }
  } catch (error) {
    console.error("Notification permission error:", error);
  }
  return null;
}
