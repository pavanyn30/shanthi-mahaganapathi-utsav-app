import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, doc, runTransaction } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { PushNotifications } from "@capacitor/push-notifications";
import { toast } from "sonner";

// Real production Firebase web configuration for shanthiganapthi-2026
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shanthiganapthi-2026.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shanthiganapthi-2026",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shanthiganapthi-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1049204223783",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1049204223783:web:584451b2dc8edfabae0302",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GMMR4S6290",
};

// Initialize Firebase App instance
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics conditionally if supported in browser environment
export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

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
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined") return null;

  try {
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

/**
 * Generate unique sequential ID via Firebase Firestore atomic transaction
 * Examples: DON-000001, REG-000001, VOL-000001, EVT-000001, USR-000001, INV-000001, REC-000001, PAY-000001, ORD-000001, TXN-000001
 */
export async function generateFirestoreSequentialId(prefix: string): Promise<string> {
  const cleanPrefix = prefix.toUpperCase();
  try {
    const db = getFirestore(app);
    const counterRef = doc(db, "counters", cleanPrefix);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextVal = 1;
      if (counterDoc.exists()) {
        nextVal = Number(counterDoc.data()?.last_value || 0) + 1;
      }
      transaction.set(
        counterRef,
        { prefix: cleanPrefix, last_value: nextVal, updated_at: new Date().toISOString() },
        { merge: true },
      );
      return `${cleanPrefix}-${String(nextVal).padStart(6, "0")}`;
    });
  } catch (err) {
    console.warn("Firestore transaction counter fallback:", err);
    return `${cleanPrefix}-${Math.floor(Math.random() * 899999 + 100000)}`;
  }
}
