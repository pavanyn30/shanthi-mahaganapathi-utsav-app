import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Sparkles,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession, stringToUuid } from "@/hooks/use-session";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Festival Alerts & Notifications — SHANTHI MAHA GANAPATHI 2026" },
      {
        name: "description",
        content: "Stay updated with live announcements, event schedules, and festival updates.",
      },
    ],
  }),
  component: NotificationsPage,
});

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  url: string | null;
  icon: string | null;
  sent_at: string;
  created_at: string;
  sent_count: number;
}

function NotificationsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("onesignal_read_notifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const userId = user ? stringToUuid(user.id) || user.id : "guest-device";

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-notifications"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("sent_at", { ascending: false });

      if (error) {
        // Table not created in Supabase yet or schema cache updating
        if (
          error.code === "PGRST205" ||
          error.message?.includes("schema cache") ||
          error.message?.includes("does not exist")
        ) {
          return [];
        }
        console.warn("Notifications query warning:", error);
        return [];
      }
      return (data ?? []) as unknown as NotificationItem[];
    },
  });

  // 2. Fetch User's Read Statuses from Supabase
  const { data: dbReadIds = [] } = useQuery({
    queryKey: ["user-notification-reads", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const validUuid = stringToUuid(user.id) || user.id;
      const { data, error } = await supabase
        .from("user_notification_reads")
        .select("notification_id")
        .eq("user_id", validUuid);

      if (error) return [];
      return (data ?? []).map((r) => r.notification_id);
    },
  });

  // Combined set of read IDs (Database + LocalStorage fallback)
  const readNotificationIds = new Set([...Array.from(localReadIds), ...dbReadIds]);

  // Save to LocalStorage
  const saveReadToLocalStorage = (id: string) => {
    const updated = new Set(localReadIds).add(id);
    setLocalReadIds(updated);
    try {
      localStorage.setItem("onesignal_read_notifications", JSON.stringify(Array.from(updated)));
    } catch {
      // Ignore quota errors
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    saveReadToLocalStorage(notificationId);

    if (user) {
      const validUuid = stringToUuid(user.id) || user.id;
      await supabase.from("user_notification_reads").upsert(
        {
          notification_id: notificationId,
          user_id: validUuid,
          read_at: new Date().toISOString(),
        },
        { onConflict: "notification_id,user_id" },
      );
      qc.invalidateQueries({ queryKey: ["user-notification-reads", user.id] });
    }
    qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;

    const allIds = notifications.map((n) => n.id);
    const updatedLocal = new Set([...Array.from(localReadIds), ...allIds]);
    setLocalReadIds(updatedLocal);
    try {
      localStorage.setItem(
        "onesignal_read_notifications",
        JSON.stringify(Array.from(updatedLocal)),
      );
    } catch {
      // Ignore
    }

    if (user) {
      const validUuid = stringToUuid(user.id) || user.id;
      const inserts = notifications.map((n) => ({
        notification_id: n.id,
        user_id: validUuid,
        read_at: new Date().toISOString(),
      }));

      await supabase.from("user_notification_reads").upsert(inserts, {
        onConflict: "notification_id,user_id",
      });
      qc.invalidateQueries({ queryKey: ["user-notification-reads", user.id] });
    }

    qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    toast.success("All notifications marked as read!");
  };

  // Filtered notifications based on tab
  const filteredNotifications = notifications.filter((item) => {
    const isRead = readNotificationIds.has(item.id);
    if (filter === "unread") return !isRead;
    if (filter === "read") return isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !readNotificationIds.has(n.id)).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-12 pt-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-warm shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  Live Festival Alerts
                </h1>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold animate-pulse"
                  >
                    {unreadCount} New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Realtime announcements, event updates, and official notices from organizers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="onesignal-customlink-container" />
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="rounded-full border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
              >
                <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className={`rounded-full text-xs font-semibold ${filter === "all" ? "gradient-saffron text-primary-foreground" : ""}`}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("unread")}
              className={`rounded-full text-xs font-semibold ${filter === "unread" ? "gradient-saffron text-primary-foreground" : ""}`}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === "read" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("read")}
              className={`rounded-full text-xs font-semibold ${filter === "read" ? "gradient-saffron text-primary-foreground" : ""}`}
            >
              Read ({notifications.length - unreadCount})
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            title="Refresh notifications"
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-3" />
            <h3 className="font-display text-lg font-bold">Failed to load notifications</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error?.message || "Check your internet connection and try again."}
            </p>
            <Button
              onClick={() => refetch()}
              className="mt-4 rounded-full gradient-saffron text-primary-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredNotifications.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-amber-500/20 bg-card p-12 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold">
              {filter === "unread" ? "No Unread Notifications" : "No Notifications Yet"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground sm:text-sm">
              {filter === "unread"
                ? "You're all caught up! Check back later for live event alerts and festival updates."
                : "Official broadcast push alerts from the committee will appear here in real time."}
            </p>
          </div>
        )}

        {/* Notification List */}
        {!isLoading && !isError && filteredNotifications.length > 0 && (
          <div className="space-y-3">
            {filteredNotifications.map((item) => {
              const isRead = readNotificationIds.has(item.id);
              const dateStr = item.sent_at || item.created_at;

              return (
                <div
                  key={item.id}
                  onClick={() => !isRead && markAsRead(item.id)}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 p-5 cursor-pointer ${
                    isRead
                      ? "bg-card/60 border-border/60 hover:bg-card hover:border-border shadow-xs"
                      : "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card border-amber-500/40 hover:border-amber-500 shadow-md"
                  }`}
                >
                  {!isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 gradient-saffron" />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
                          isRead
                            ? "bg-muted text-muted-foreground"
                            : "gradient-saffron text-primary-foreground shadow-sm"
                        }`}
                      >
                        <Bell className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-display text-base font-bold truncate ${
                              isRead ? "text-foreground/90" : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </h3>

                          {!isRead ? (
                            <Badge className="bg-amber-500 text-stone-950 font-bold text-[10px] px-2 py-0">
                              NEW
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground px-2 py-0"
                            >
                              Read
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs text-foreground/80 leading-relaxed sm:text-sm whitespace-pre-line">
                          {item.message}
                        </p>

                        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {dateStr
                              ? formatDistanceToNow(new Date(dateStr), { addSuffix: true })
                              : "Just now"}
                          </span>
                          <span>•</span>
                          <span>
                            {dateStr ? format(new Date(dateStr), "MMM d, yyyy · h:mm a") : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0"
                      >
                        Open <ChevronRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
