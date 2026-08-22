import { useState, useEffect } from "react";
import OneSignal from "react-onesignal";
import { Bell, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractRelativePath } from "@/hooks/use-deep-links";

const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || "def559e2-60c1-4fc0-ba35-9402e4c1b63c";

export async function registerOneSignalPlayer() {
  if (typeof window === "undefined") return;

  // 1. Native Android / iOS Push (Capacitor)
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      PushNotifications.addListener("registration", async (token) => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const currentUserId = sessionData?.session?.user?.id;

          const payload: Record<string, any> = {
            app_id: ONESIGNAL_APP_ID,
            device_type: 1, // Android
            identifier: token.value,
          };

          if (currentUserId) {
            payload.external_user_id = currentUserId;
            payload.tags = { user_id: currentUserId };
          }

          const mobRes = await fetch("https://onesignal.com/api/v1/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const mobData = await mobRes.json();
          if (mobData?.id) {
            localStorage.setItem("onesignal_subscription_id", mobData.id);
          }
        } catch (err) {
          console.warn("OneSignal mobile player sync warning:", err);
        }
      });

      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        toast(notification.title || "🔔 New Festival Notification", {
          description: notification.body || (notification as any).message,
        });
      });

      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const targetUrl =
          action.notification.data?.target_route ||
          action.notification.data?.launch_url ||
          action.notification.data?.url ||
          "/notifications";
        if (typeof window !== "undefined" && targetUrl) {
          const path = extractRelativePath(targetUrl) || "/notifications";
          window.location.hash = "";
          if (window.location.pathname + window.location.search !== path) {
            window.history.pushState({}, "", path);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        }
      });

      const res = await PushNotifications.requestPermissions();
      if (res.receive === "granted") {
        await PushNotifications.register();
      }
    }
  } catch (err) {
    console.warn("Native PushNotifications error:", err);
  }

  // 2. OneSignal Web SDK Opt-In & Subscription Caching
  try {
    if (OneSignal.Notifications) {
      await OneSignal.Notifications.requestPermission().catch(() => {});
    }
    if (OneSignal.User && OneSignal.User.PushSubscription) {
      await OneSignal.User.PushSubscription.optIn().catch(() => {});
      if (OneSignal.User.PushSubscription.id) {
        localStorage.setItem("onesignal_subscription_id", OneSignal.User.PushSubscription.id);
      }
    }
  } catch (_webErr) {
    // Ignore web SDK error on native platform
  }

  // 3. ServiceWorker Direct Player Registration to OneSignal REST API for Web
  if (
    "serviceWorker" in navigator &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      let reg = await navigator.serviceWorker.getRegistration("/OneSignalSDKWorker.js");
      if (!reg) {
        reg = await navigator.serviceWorker.register("/OneSignalSDKWorker.js", { scope: "/" });
      }
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const subJson = sub.toJSON();
          const swRes = await fetch("https://onesignal.com/api/v1/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              device_type: 5, // Chrome/Web Push
              identifier: subJson.endpoint,
              web_auth: subJson.keys?.auth,
              web_p256dh: subJson.keys?.p256dh,
            }),
          });
          const swData = await swRes.json();
          if (swData?.id) {
            localStorage.setItem("onesignal_subscription_id", swData.id);
          }
        }
      }
    } catch (swErr) {
      console.warn("Direct ServiceWorker OneSignal player registration warning:", swErr);
    }
  }
}

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Immediately register/request permissions if on Native Android / iOS
    import("@capacitor/core").then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        registerOneSignalPlayer();
      }
    });

    // Initialize OneSignal asynchronously for web
    try {
      OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "OneSignalSDKWorker.js",
      })
        .then(() => {
          registerOneSignalPlayer();
        })
        .catch((err) => {
          console.warn("OneSignal init warning:", err);
          registerOneSignalPlayer();
        });
    } catch (e) {
      console.warn("OneSignal init error:", e);
      registerOneSignalPlayer();
    }

    const autoCheckPermission = async () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          registerOneSignalPlayer();
          return;
        }

        const dismissed = localStorage.getItem("onesignal_prompt_dismissed");
        if (dismissed === "granted" || dismissed === "true" || dismissed === "denied") return;

        if (Notification.permission === "default") {
          setTimeout(() => setShowPrompt(true), 1200);
        }
      }
    };

    autoCheckPermission();
  }, []);

  const handleAllowNotifications = async () => {
    setShowPrompt(false);
    localStorage.setItem("onesignal_prompt_dismissed", "granted");

    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          toast.success("🔔 Notifications Enabled! You will receive live festival alerts.");
          await registerOneSignalPlayer();
        } else if (perm === "denied") {
          toast.error("Notification permission denied in browser settings.");
        }
      } catch (err) {
        console.warn("Error requesting notification permission:", err);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("onesignal_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-gradient-to-b from-stone-900 via-amber-950/90 to-stone-950 p-5 text-stone-100 shadow-[0_15px_40px_rgba(217,119,6,0.25)] backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white transition"
          aria-label="Close prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="relative mt-0.5 grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 text-stone-950 shadow-lg">
            <Bell className="h-6 w-6 text-stone-950 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
            </span>
          </div>

          <div className="flex-1 pr-3">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-400 uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Live Festival Alerts
            </div>
            <h4 className="mt-0.5 font-serif text-base font-black text-white tracking-wide">
              Enable Push Notifications 🪔
            </h4>
            <p className="mt-1 text-xs text-stone-300 leading-relaxed font-medium">
              Get instant alerts for Maha Aarti, Annadana Mahaprasadam, Puja schedules & Visarjan
              updates!
            </p>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleAllowNotifications}
                className="flex-1 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-stone-950 font-black text-xs py-2.5 shadow-lg border border-amber-300/40 active:scale-95 transition-transform"
              >
                Allow Notifications 🔔
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="rounded-full text-stone-400 hover:text-white text-xs px-3"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
