import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PhoneCall, X, Sparkles, ChevronRight, Bell, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  url?: string | null;
  created_at?: string;
}

const isNotificationReadLocally = (id: string): boolean => {
  try {
    const saved = localStorage.getItem("onesignal_read_notifications");
    if (!saved) return false;
    const parsed: string[] = JSON.parse(saved);
    return parsed.includes(id);
  } catch {
    return false;
  }
};

const saveReadLocally = (id: string) => {
  try {
    const saved = localStorage.getItem("onesignal_read_notifications");
    const set = saved ? new Set(JSON.parse(saved)) : new Set<string>();
    set.add(id);
    localStorage.setItem("onesignal_read_notifications", JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Error saving read status to localStorage:", err);
  }
};

export function GanapathiNotificationPopup() {
  const [notification, setNotification] = useState<RealtimeNotification | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [animStage, setAnimStage] = useState<"idle" | "intro" | "reveal" | "active" | "exit">(
    "idle",
  );
  const [progressWidth, setProgressWidth] = useState(100);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isHomePage = location.pathname === "/" || location.pathname === "";

  const handleNewNotification = (newNotif: RealtimeNotification) => {
    if (isNotificationReadLocally(newNotif.id)) {
      console.log("[Ganapathi Popup] Notification already marked as read. Skipping popup.");
      return;
    }

    setNotification(newNotif);
    setIsRead(false);
    triggerPopupAnimation();
  };

  const triggerPopupAnimation = () => {
    setIsExpanded(true);
    setAnimStage("intro");
    setProgressWidth(100);

    setTimeout(() => {
      setAnimStage("reveal");
    }, 400);

    setTimeout(() => {
      setAnimStage("active");
    }, 1200);
  };

  const handleDismiss = () => {
    setAnimStage("exit");
    setTimeout(() => {
      setIsExpanded(false);
      setAnimStage("idle");
    }, 600);
  };

  // Auto-dismiss notification after 5 seconds when visible
  useEffect(() => {
    if (!isExpanded || animStage === "idle" || animStage === "exit") return;

    setProgressWidth(100);
    const animTimer = setTimeout(() => {
      setProgressWidth(0);
    }, 50);

    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [isExpanded, notification]);

  const handleMarkAsRead = async () => {
    if (!notification) return;

    saveReadLocally(notification.id);
    setIsRead(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from("user_notification_reads").upsert(
          {
            notification_id: notification.id,
            user_id: session.user.id,
          },
          { onConflict: "notification_id,user_id" },
        );
      }
    } catch (err) {
      console.warn("Could not sync read status to Supabase:", err);
    }

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["user-notification-reads"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });

    handleDismiss();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const latestId = data[0].id;
          const readLocally = isNotificationReadLocally(latestId);

          if (!readLocally) {
            setNotification({
              id: latestId,
              title: data[0].title,
              message: data[0].message,
              url: data[0].url,
              created_at: data[0].created_at,
            });
            setIsRead(false);
            triggerPopupAnimation();
          }
        }
      } catch (err) {
        console.warn("Could not fetch latest notification:", err);
      }
    };
    fetchLatest();

    const notifChannelId = `homepage-notifs-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(notifChannelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          console.log("[Ganapathi Realtime Notification Received]", payload.new);
          if (payload.new && payload.new.title && payload.new.message) {
            handleNewNotification({
              id: payload.new.id || String(Date.now()),
              title: payload.new.title,
              message: payload.new.message,
              url: payload.new.url,
              created_at: payload.new.created_at,
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Ganapathi Realtime Notification] Subscribed & ready.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ONLY show on home page ("/" route)
  if (!isHomePage || !notification || isRead) return null;

  return (
    <div
      tabIndex={-1}
      aria-label="Realtime notification corner widget"
      className="pointer-events-none fixed bottom-20 sm:bottom-6 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm sm:max-w-md flex-col items-end gap-2"
    >
      {/* Bottom-Right Corner Animated Glassmorphism Notification Popup */}
      {isExpanded && (
        <div
          className={`pointer-events-auto relative w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-black/85 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl transition-all duration-500 ${
            animStage === "intro"
              ? "translate-y-8 opacity-0 scale-90"
              : animStage === "exit"
                ? "translate-y-8 opacity-0 scale-95 duration-500"
                : "animate-in fade-in slide-in-from-bottom-8 duration-500 zoom-in-95"
          }`}
          style={{
            boxShadow:
              "0 20px 50px -15px rgba(245, 158, 11, 0.45), 0 10px 25px -10px rgba(220, 38, 38, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
          }}
        >
          {/* Ambient Golden Radial Glow */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-amber-500/25 blur-2xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-orange-600/20 blur-2xl animate-pulse" />

          {/* Speech Bubble Pointer Tail (Bottom-Right) */}
          <div className="absolute -bottom-2 right-8 h-5 w-5 rotate-45 border-b border-r border-amber-400/40 bg-black/85 backdrop-blur-xl" />

          {/* Card Header Row */}
          <div className="relative z-10 flex items-center justify-between border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
                <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-300 animate-spin" /> Incoming Notification
                </span>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="rounded-full p-1 text-amber-200/70 hover:bg-white/10 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 3D Animated Video Loop & Content Row */}
          <div className="relative z-10 mt-3 flex items-center gap-3.5">
            {/* Animated HTML5 Video Container (Lord Ganapathi & Mooshika) */}
            <div className="relative shrink-0">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-amber-950/60 to-orange-950/80 p-0.5 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent pointer-events-none z-10 animate-pulse" />

                {/* HTML5 3D Animated Video Loop */}
                <video
                  src="/assets/ganapathi_mooshika_anim.mp4"
                  poster="/assets/ganapathi_mooshika_3d.png"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="3D Animated Lord Ganapathi and Mooshika"
                  className="h-full w-full object-cover rounded-xl"
                />

                {/* Golden Sparkle Overlay */}
                <span className="absolute top-1.5 left-1.5 text-amber-300 text-[10px] animate-ping z-20 pointer-events-none">
                  ✦
                </span>
                <span className="absolute bottom-2 right-2 text-yellow-200 text-xs animate-pulse z-20 pointer-events-none">
                  ✨
                </span>
              </div>
            </div>

            {/* Notification Title & Message */}
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-sm font-bold text-amber-100 truncate font-display leading-tight">
                {notification.title}
              </h4>
              <p className="mt-1 text-xs text-amber-100/80 line-clamp-2 leading-relaxed font-sans">
                {notification.message}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleMarkAsRead}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-md active:scale-95 transition-all"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Read
                </button>
                <button
                  onClick={() => {
                    handleMarkAsRead();
                    navigate({ to: "/notifications" });
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-3 py-1 text-[11px] font-bold text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  View <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Saffron Gold 5-Second Timer Bar */}
          <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/90 border border-amber-500/20">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-600 rounded-full"
              style={{
                width: `${progressWidth}%`,
                transition: progressWidth === 0 ? "width 5000ms linear" : "none",
              }}
            />
          </div>
        </div>
      )}

      {/* Floating Ganapathi Bell Badge (Bottom-Right trigger when minimized & unread) */}
      {!isExpanded && !isRead && (
        <button
          onClick={triggerPopupAnimation}
          className="pointer-events-auto group relative flex items-center gap-2.5 rounded-full border border-amber-500/50 bg-card/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-amber-400 active:scale-95 animate-in fade-in slide-in-from-bottom-4"
          style={{
            boxShadow: "0 12px 35px -10px rgba(245, 158, 11, 0.5), 0 4px 15px rgba(0,0,0,0.3)",
          }}
          title="Click to view unread Ganapathi Notification"
        >
          {/* Mini Animated Video Icon */}
          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-amber-400/60 bg-amber-950/80 p-0.5 shadow-md">
            <video
              src="/assets/ganapathi_mooshika_anim.mp4"
              poster="/assets/ganapathi_mooshika_3d.png"
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full object-cover rounded-full"
            />
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 ring-2 ring-background">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <div className="flex flex-col items-start text-left">
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <Bell className="h-3 w-3 animate-bounce text-amber-500" /> Unread Notification
            </span>
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
              {notification.title}
            </span>
          </div>

          <span className="ml-1 grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}
