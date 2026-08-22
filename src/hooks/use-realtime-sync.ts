import { useEffect, useState, useRef } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SyncStatus = "connecting" | "connected" | "reconnecting" | "error";

/**
 * Realtime Synchronization Engine
 * Listens to Supabase WebSocket change streams across all tables (INSERT, UPDATE, DELETE).
 * Instantly invalidates and refetches TanStack Query caches across all open client pages
 * without requiring any manual page refresh.
 */
export function useRealtimeSync(queryClient: QueryClient) {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    // Helper to invalidate queries based on changed table
    const handleTableChange = (table: string, eventType: string) => {
      console.log(`[Realtime Live Sync] Change detected on table "${table}" (${eventType})`);

      // Invalidate specific query keys
      switch (table) {
        case "festival_schedules":
          queryClient.invalidateQueries({ queryKey: ["festival-schedules"] });
          break;
        case "events":
          queryClient.invalidateQueries({ queryKey: ["events"] });
          queryClient.invalidateQueries({ queryKey: ["event"] });
          queryClient.invalidateQueries({ queryKey: ["event-counts"] });
          break;
        case "volunteers":
          queryClient.invalidateQueries({ queryKey: ["volunteers"] });
          queryClient.invalidateQueries({ queryKey: ["my-volunteer-app"] });
          queryClient.invalidateQueries({ queryKey: ["assigned-event"] });
          queryClient.invalidateQueries({ queryKey: ["live-stats"] });
          break;
        case "donations":
          queryClient.invalidateQueries({ queryKey: ["donations"] });
          queryClient.invalidateQueries({ queryKey: ["all-donations"] });
          queryClient.invalidateQueries({ queryKey: ["live-stats"] });
          break;
        case "announcements":
          queryClient.invalidateQueries({ queryKey: ["announcements"] });
          break;
        case "sponsors":
          queryClient.invalidateQueries({ queryKey: ["sponsors"] });
          break;
        case "gallery_items":
          queryClient.invalidateQueries({ queryKey: ["gallery"] });
          break;
        case "registrations":
          queryClient.invalidateQueries({ queryKey: ["all-registrations"] });
          queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
          queryClient.invalidateQueries({ queryKey: ["event-counts"] });
          queryClient.invalidateQueries({ queryKey: ["live-stats"] });
          break;
        case "festival_settings":
          queryClient.invalidateQueries({ queryKey: ["festival-settings"] });
          break;
        case "festival_memories":
          queryClient.invalidateQueries({ queryKey: ["festival-memories"] });
          break;
        case "notifications":
        case "user_notification_reads":
        case "schedule_notification_logs":
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["admin-schedule-notification-logs"] });
          queryClient.invalidateQueries({ queryKey: ["admin-push-notifications"] });
          break;
        default:
          // Global fallback for any table mutation
          queryClient.invalidateQueries();
          break;
      }
    };

    // Initialize Supabase Realtime Channel (Postgres CDC + Realtime Broadcast)
    const channel = supabase
      .channel("global-realtime-live-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (!isMounted) return;
        handleTableChange(payload.table, payload.eventType);
      })
      .on("broadcast", { event: "data_mutated" }, (payload) => {
        if (!isMounted) return;
        const tableName = payload.payload?.table;
        if (tableName) {
          handleTableChange(tableName, "BROADCAST");
        } else {
          queryClient.invalidateQueries();
        }
      })
      .subscribe((subscribeStatus, err) => {
        if (!isMounted) return;

        if (subscribeStatus === "SUBSCRIBED") {
          setStatus("connected");
          reconnectAttemptsRef.current = 0;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        } else if (subscribeStatus === "CLOSED" || subscribeStatus === "CHANNEL_ERROR") {
          setStatus("reconnecting");
          scheduleReconnect();
        } else if (err) {
          setStatus("error");
        }
      });

    // Reconnect logic with exponential backoff
    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) return;

      const attempts = reconnectAttemptsRef.current;
      const delay = Math.min(Math.pow(2, attempts) * 1000, 15000);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        reconnectAttemptsRef.current += 1;

        if (isMounted && navigator.onLine) {
          supabase.removeChannel(channel).then(() => {
            queryClient.invalidateQueries();
          });
        }
      }, delay);
    };

    // Network Online / Offline handlers
    const handleOnline = () => {
      if (!isMounted) return;
      toast.info("Network restored. Syncing realtime database...");
      setStatus("connecting");
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      if (!isMounted) return;
      setStatus("error");
      toast.warning("Network connection lost. Offline fallback active.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { status };
}

/**
 * Triggers instant real-time sync across all connected clients via WebSocket broadcast.
 */
export function broadcastDataMutation(table: string) {
  try {
    supabase.channel("global-realtime-live-sync").send({
      type: "broadcast",
      event: "data_mutated",
      payload: { table, timestamp: Date.now() },
    });
  } catch (err) {
    console.warn("Broadcast mutation warning:", err);
  }
}
