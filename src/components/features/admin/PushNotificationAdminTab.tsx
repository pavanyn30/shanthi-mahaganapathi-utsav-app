import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Send,
  Loader2,
  Smartphone,
  History,
  Clock,
  RefreshCw,
  CheckCircle2,
  Zap,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  sendBroadcastPushNotification,
  triggerAutoScheduleNotificationCheck,
} from "@/lib/services/onesignal-service";
import { formatDistanceToNow, format } from "date-fns";

export function PushNotificationAdminTab({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCheckingSchedule, setIsCheckingSchedule] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Push Notification History
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-push-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications history:", error);
        return [];
      }
      return data || [];
    },
  });

  // Fetch Automated Schedule Notification Logs
  const { data: scheduleLogs = [] } = useQuery({
    queryKey: ["admin-schedule-notification-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("schedule_notification_logs")
        .select("*, festival_schedules(title, schedule_date, start_time)")
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching schedule notification logs:", error);
        return [];
      }
      return data || [];
    },
  });

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      return toast.error("Please enter a notification title.");
    }
    if (!message.trim()) {
      return toast.error("Please enter a notification message.");
    }

    setIsSending(true);

    try {
      const res = await sendBroadcastPushNotification({
        title: title.trim(),
        message: message.trim(),
        url: "https://shanthimahaganapathi-2026.web.app/notifications",
        created_by: userId,
      });

      if (res.success) {
        const recipientMsg =
          res.recipients !== undefined && res.recipients > 0
            ? ` (${res.recipients} active device recipients)`
            : "";
        toast.success(
          `🚀 Push Notification broadcasted live via OneSignal to all Android & Web subscribers!${recipientMsg}`,
        );
        setTitle("");
        setMessage("");
        qc.invalidateQueries({ queryKey: ["admin-push-notifications"] });
        qc.invalidateQueries({ queryKey: ["all-notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      } else {
        toast.error(`Failed to send notification: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(`Error sending push notification: ${err?.message || "Network error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRunScheduleScan = async () => {
    setIsCheckingSchedule(true);
    try {
      const res = await triggerAutoScheduleNotificationCheck();
      setLastCheckResult(res);

      if (res.success) {
        const count = res.sent_notifications_count || 0;
        if (count > 0) {
          toast.success(`🔔 Successfully processed schedules! Sent ${count} push notification(s).`);
        } else {
          toast.info(`⚡ Schedule scan completed. No unsent notifications due at this minute.`);
        }
        qc.invalidateQueries({ queryKey: ["admin-schedule-notification-logs"] });
        qc.invalidateQueries({ queryKey: ["admin-push-notifications"] });
        qc.invalidateQueries({ queryKey: ["all-notifications"] });
        qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      } else {
        toast.error(`Schedule scan error: ${res.error || "Failed to trigger edge function"}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || "Failed to connect to Edge Function"}`);
    } finally {
      setIsCheckingSchedule(false);
    }
  };

  // Admin Delete Single Notification
  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Notification deleted successfully!");
      qc.invalidateQueries({ queryKey: ["admin-push-notifications"] });
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    } catch (err: any) {
      toast.error(`Error deleting notification: ${err?.message || "Failed to delete"}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Admin Delete Single Schedule Log
  const handleDeleteScheduleLog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule log?")) return;
    setDeletingId(id);
    try {
      const { error } = await (supabase.from as any)("schedule_notification_logs").delete().eq("id", id);
      if (error) throw error;
      toast.success("Schedule log deleted successfully!");
      qc.invalidateQueries({ queryKey: ["admin-schedule-notification-logs"] });
    } catch (err: any) {
      toast.error(`Error deleting log: ${err?.message || "Failed to delete"}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Admin Clear All Notifications
  const handleClearAllNotifications = async () => {
    if (!window.confirm("Are you sure you want to delete ALL broadcast notifications? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All notifications deleted successfully!");
      qc.invalidateQueries({ queryKey: ["admin-push-notifications"] });
      qc.invalidateQueries({ queryKey: ["all-notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-notifications-count"] });
    } catch (err: any) {
      toast.error(`Error clearing notifications: ${err?.message || "Failed to clear"}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 select-none">
      {/* Top Banner */}
      <div className="rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/80 to-stone-950 p-3.5 sm:p-6 text-stone-100 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 sm:gap-4 relative z-10">
          <div className="grid h-11 w-11 sm:h-14 sm:w-14 place-items-center rounded-xl sm:rounded-2xl bg-amber-500 text-stone-950 shadow-md shrink-0">
            <Bell className="h-5 w-5 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="font-display text-sm font-extrabold sm:text-xl truncate">
                OneSignal Push Broadcast Center
              </h2>
              <Badge className="bg-amber-500 text-stone-950 font-extrabold text-[8px] sm:text-xs tracking-wider px-2 py-0.5 rounded-full">
                ALL DEVICES
              </Badge>
            </div>
            <p className="mt-0.5 sm:mt-1 text-[11px] text-stone-300 sm:text-sm leading-snug line-clamp-2">
              Send instant push notifications to all subscribed Android mobile devices &amp; web browsers.
            </p>
          </div>
        </div>
      </div>

      {/* Automated Today's Schedule Push System */}
      <div className="rounded-2xl sm:rounded-3xl border border-amber-500/20 bg-card p-3.5 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 sm:pb-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5 sm:mt-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-display text-xs sm:text-base font-bold truncate">
                  Automated Today's Schedule Push System
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full">
                  Active Cron (IST)
                </Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                Monitors today's festival schedules &amp; dispatches 30m, 15m, &amp; 5m reminders to all phones.
              </p>
            </div>
          </div>

          <Button
            onClick={handleRunScheduleScan}
            disabled={isCheckingSchedule}
            variant="outline"
            className="w-full sm:w-auto rounded-xl sm:rounded-2xl border-amber-500/30 hover:bg-amber-500/10 font-bold text-xs shrink-0 py-2.5 h-10 shadow-sm active:scale-95 transition-all"
          >
            {isCheckingSchedule ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-500" /> Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4 text-amber-500" /> Trigger Schedule Scan Now
              </>
            )}
          </Button>
        </div>

        {/* Mobile-optimized Scan Result Summary */}
        {lastCheckResult && (
          <div className="rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 sm:p-4 text-xs space-y-2">
            <div className="font-bold flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs border-b border-amber-500/20 pb-2">
              <span className="flex items-center gap-1.5 font-display">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-500" /> Latest Scan Result
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {lastCheckResult.kolkata_time || "Just now"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-lg bg-background/60 p-2 border border-amber-500/10">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Processed</div>
                <div className="text-xs sm:text-sm font-extrabold text-foreground">
                  {lastCheckResult.processed_schedules_count || 0}
                </div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Dispatched</div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {lastCheckResult.sent_notifications_count || 0}
                </div>
              </div>
              <div className="rounded-lg bg-background/60 p-2 border border-amber-500/10">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Skipped</div>
                <div className="text-xs sm:text-sm font-extrabold text-foreground">
                  {lastCheckResult.skipped_count || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        {/* Send Notification Form */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-3.5 sm:p-6 shadow-sm">
            <div className="mb-3.5 sm:mb-6 flex items-center justify-between border-b border-border pb-3 sm:pb-4">
              <h3 className="font-display text-xs sm:text-base font-bold flex items-center gap-1.5 sm:gap-2">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" /> Send Manual Push Broadcast
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] sm:text-[10px] border-emerald-500 text-emerald-600 font-bold px-2 py-0.5"
              >
                Edge API
              </Badge>
            </div>

            <form onSubmit={handleSendPush} className="space-y-3.5 sm:space-y-5">
              <div>
                <Label htmlFor="push-title" className="text-xs font-semibold">
                  Notification Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="push-title"
                  placeholder="e.g. 🪔 Mahamangala Aarti Started!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 rounded-xl border-border bg-background text-xs sm:text-sm py-2.5 h-10"
                  required
                />
              </div>

              <div>
                <Label htmlFor="push-message" className="text-xs font-semibold">
                  Message Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="push-message"
                  placeholder="e.g. Grand Maha Aarti has commenced at the main pandal. Watch live stream now on app!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-1.5 rounded-xl border-border bg-background text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full rounded-xl sm:rounded-2xl gradient-saffron text-primary-foreground font-extrabold py-3.5 sm:py-4 text-xs sm:text-sm shadow-warm transition-transform active:scale-[0.98] flex items-center justify-center gap-2 h-11"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Broadcasting Live...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Send Push Notification Now
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sent Notification History */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-3.5 sm:p-6 shadow-sm">
            <div className="mb-3.5 sm:mb-6 flex flex-row items-center justify-between border-b border-border pb-3 sm:pb-4 gap-2">
              <h3 className="font-display text-xs sm:text-base font-bold flex items-center gap-1.5 sm:gap-2 truncate">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 shrink-0" /> Broadcast Logs
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {notifications.length > 0 && (
                  <Button
                    onClick={handleClearAllNotifications}
                    variant="destructive"
                    size="sm"
                    className="h-7 text-[10px] sm:text-xs font-bold rounded-lg px-2 sm:px-2.5"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5">
                  {notifications.length + scheduleLogs.length} Total
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
                <p className="text-xs text-muted-foreground">Loading sent broadcast logs...</p>
              </div>
            ) : notifications.length === 0 && scheduleLogs.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-border p-4">
                <Smartphone className="mx-auto h-7 w-7 text-muted-foreground mb-1.5" />
                <p className="font-bold text-xs sm:text-sm">No Push Notifications Sent Yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Use the form above or trigger an automated schedule scan.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] sm:max-h-[520px] overflow-y-auto pr-0.5 no-scrollbar">
                {/* Automated Schedule Dispatches */}
                {scheduleLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4 transition-all hover:bg-amber-500/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-xs sm:text-sm break-words">
                            {log.notification_type === "30_min"
                              ? "🔔 30-min Reminder"
                              : log.notification_type === "15_min"
                                ? "⏰ 15-min Reminder"
                                : "🚨 5-min Reminder"}
                            : {log.festival_schedules?.title || "Today's Schedule"}
                          </h4>
                          <Badge className="bg-amber-500 text-stone-950 text-[8px] px-1.5 py-0 font-bold shrink-0">
                            AUTO SCHEDULE
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground leading-snug">
                          Scheduled:{" "}
                          <span className="font-semibold text-foreground">
                            {log.scheduled_time}
                          </span>{" "}
                          | Type: {log.notification_type}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            {log.sent_at
                              ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })
                              : "Recent"}
                          </span>
                          <span>•</span>
                          <span>
                            {log.sent_at ? format(new Date(log.sent_at), "MMM d, h:mm a") : ""}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDeleteScheduleLog(log.id)}
                        disabled={deletingId === log.id}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors"
                        title="Delete schedule log"
                      >
                        {deletingId === log.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Manual Broadcast Notifications */}
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className="rounded-2xl border border-border/80 bg-background/50 p-3 sm:p-4 transition-all hover:bg-background"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-xs sm:text-sm break-words">{n.title}</h4>
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[8px] px-1.5 py-0 font-bold shrink-0">
                            Manual
                          </Badge>
                        </div>
                        <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">
                          {n.message}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            {n.sent_at
                              ? formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })
                              : "Recent"}
                          </span>
                          <span>•</span>
                          <span>
                            {n.sent_at ? format(new Date(n.sent_at), "MMM d, h:mm a") : ""}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDeleteNotification(n.id)}
                        disabled={deletingId === n.id}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors"
                        title="Delete notification"
                      >
                        {deletingId === n.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
