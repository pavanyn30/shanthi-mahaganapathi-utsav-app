import { useEffect, useRef } from "react";
import { triggerAutoScheduleNotificationCheck } from "@/lib/services/onesignal-service";

const SCAN_THROTTLE_MS = 45000; // 45 seconds throttle across open tabs
const CHECK_INTERVAL_MS = 60000; // Run scan check every 60 seconds

/**
 * Custom React Hook: useAutoScheduleNotifier
 * Background worker hook that periodically monitors today's festival schedules
 * and automatically triggers push notifications for upcoming 30m, 15m, and 5m events.
 */
export function useAutoScheduleNotifier() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const executeScheduleScan = async () => {
      if (isRunningRef.current) return;

      // Throttle across tabs using localStorage
      try {
        const lastScan = localStorage.getItem("last_auto_schedule_scan_at");
        const now = Date.now();
        if (lastScan && now - parseInt(lastScan, 10) < SCAN_THROTTLE_MS) {
          return; // Recently scanned by another tab/session
        }
        localStorage.setItem("last_auto_schedule_scan_at", String(now));
      } catch (_err) {
        // Storage restricted or unavailable
      }

      isRunningRef.current = true;

      try {
        const res = await triggerAutoScheduleNotificationCheck();
        if (res.success && res.sent_notifications_count && res.sent_notifications_count > 0) {
          console.log(
            `[Auto Schedule Notifier] Successfully dispatched ${res.sent_notifications_count} schedule push notification(s).`,
          );
        }
      } catch (err) {
        console.warn("[Auto Schedule Notifier] Error during automatic schedule scan:", err);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Initial check shortly after app load (3s delay)
    const initialTimer = setTimeout(executeScheduleScan, 3000);

    // Recurring check every 60 seconds
    const intervalTimer = setInterval(executeScheduleScan, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);
}
