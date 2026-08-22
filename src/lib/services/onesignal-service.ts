import { supabase } from "@/integrations/supabase/client";
import OneSignal from "react-onesignal";

/**
 * OneSignal Push Notification Service
 * Calls Supabase Edge Function 'send-push-notification' for single, clean server-side dispatch.
 * Falls back to direct OneSignal REST API only if Edge Function is unreachable.
 */

export interface SendPushNotificationOptions {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  created_by?: string;
}

const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || "def559e2-60c1-4fc0-ba35-9402e4c1b63c";
const ONESIGNAL_REST_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || "";

export async function sendBroadcastPushNotification({
  title,
  message,
  url = "https://shanthimahaganapathi-2026.web.app/notifications",
  icon = "https://shanthimahaganapathi-2026.web.app/favicon.png",
  created_by,
}: SendPushNotificationOptions): Promise<{
  success: boolean;
  id?: string;
  recipients?: number;
  error?: string;
}> {
  const targetUrl = url || "https://shanthimahaganapathi-2026.web.app/notifications";
  const targetIcon = icon || "https://shanthimahaganapathi-2026.web.app/favicon.png";

  // 1. Primary Dispatch via Supabase Edge Function (Single Clean Call)
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: {
          title,
          message,
          url: targetUrl,
          icon: targetIcon,
          created_by,
        },
      },
    );

    if (!fnError && fnData?.success) {
      return {
        success: true,
        id: fnData?.notification?.id || fnData?.onesignal_id,
        recipients: fnData?.recipients || 0,
      };
    }

    if (fnError) {
      console.warn("Edge function invocation warning, attempting client fallback:", fnError);
    }
  } catch (edgeErr) {
    console.warn("Edge function unreachable, falling back to direct client REST API:", edgeErr);
  }

  // 2. Fallback ONLY if Edge Function fails or is offline
  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      target_channel: "push",
      isAndroid: true,
      isIos: true,
      isAnyWeb: true,
      headings: { en: title },
      contents: { en: message },
      web_url: targetUrl,
      data: {
        target_route: "/notifications",
        launch_url: "/notifications",
      },
      chrome_web_icon: targetIcon,
      chrome_web_image: targetIcon,
      small_icon: "ic_stat_onesignal_default",
      large_icon: targetIcon,
      android_accent_color: "FF6B00",
      priority: 10,
    };

    const authHeader = ONESIGNAL_REST_KEY.startsWith("os_v2_")
      ? `Key ${ONESIGNAL_REST_KEY}`
      : `Basic ${ONESIGNAL_REST_KEY}`;

    const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const osData = await osRes.json();
    const osRecipients = osData?.recipients || 0;

    // Persist to DB on fallback
    const { data: dbData } = await supabase
      .from("notifications")
      .insert({
        title,
        message,
        url: targetUrl,
        icon: targetIcon,
        sent_count: osRecipients,
        created_by: created_by || null,
      })
      .select("*")
      .single();

    return {
      success: osRes.ok || !!osData?.id,
      id: dbData?.id || osData?.id,
      recipients: osRecipients,
    };
  } catch (err: any) {
    console.error("Fallback Push Dispatch Error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

function getKolkataNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  const dateStr = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  const hours = parseInt(getPart("hour"), 10);
  const minutes = parseInt(getPart("minute"), 10);
  const seconds = parseInt(getPart("second"), 10);
  const totalMinutes = hours * 60 + minutes;

  return { dateStr, hours, minutes, seconds, totalMinutes };
}

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function format12Hour(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

async function runClientSideScheduleScan() {
  const kolkataNow = getKolkataNow();
  const todayDateStr = kolkataNow.dateStr;
  const currentMins = kolkataNow.totalMinutes;

  const { data: schedules, error: schedError } = await (supabase.from as any)("festival_schedules")
    .select("*")
    .eq("schedule_date", todayDateStr)
    .neq("is_published", false);

  if (schedError) {
    return { success: false, error: schedError.message };
  }

  const typedSchedules = (schedules || []) as any[];

  if (typedSchedules.length === 0) {
    return {
      success: true,
      kolkata_time: `${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds}`,
      processed_schedules_count: 0,
      sent_notifications_count: 0,
      sent_notifications: [],
      skipped_count: 0,
    };
  }

  const notificationTypes = [
    { type: "30_min", minutesBefore: 30, emoji: "🔔", label: "30 minutes" },
    { type: "15_min", minutesBefore: 15, emoji: "⏰", label: "15 minutes" },
    { type: "5_min", minutesBefore: 5, emoji: "🚨", label: "5 minutes" },
  ];

  const sentResults: any[] = [];
  let skippedCount = 0;

  for (const schedule of typedSchedules) {
    const startMins = parseTimeToMinutes(schedule.start_time);
    if (startMins === null) continue;

    for (const nConfig of notificationTypes) {
      const triggerMins = startMins - nConfig.minutesBefore;

      if (currentMins >= triggerMins && currentMins < startMins + 15) {
        const timeFormatted = format12Hour(schedule.start_time);
        const title = `${nConfig.emoji} ${schedule.title} starts in ${nConfig.label}!`;
        const venueText = schedule.venue ? ` at ${schedule.venue}` : "";
        const message = `${schedule.title} is scheduled to start at ${timeFormatted}${venueText}. Devotees are invited to join!`;

        // Enforce Idempotency via notifications table
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("title", title)
          .maybeSingle();

        let existingLog = null;
        try {
          const { data: logData } = await (supabase.from as any)("schedule_notification_logs")
            .select("id")
            .eq("schedule_id", schedule.id)
            .eq("notification_type", nConfig.type)
            .maybeSingle();
          existingLog = logData;
        } catch (_err) {
          // Table may not exist yet
        }

        if (existingNotif || existingLog) {
          skippedCount++;
          continue;
        }

        // Dispatch OneSignal push notification directly
        const pushRes = await sendBroadcastPushNotification({
          title,
          message,
          url: "https://shanthimahaganapathi-2026.web.app/notifications",
          icon: "https://shanthimahaganapathi-2026.web.app/favicon.png",
        });

        // Save log into schedule_notification_logs if available
        try {
          await (supabase.from as any)("schedule_notification_logs").insert({
            schedule_id: schedule.id,
            notification_type: nConfig.type,
            scheduled_time: schedule.start_time,
            status: "sent",
            onesignal_id: pushRes.id || null,
            recipients_count: pushRes.recipients || 0,
          });
        } catch (_err) {
          // Optional log insert catch
        }

        sentResults.push({
          schedule_id: schedule.id,
          schedule_title: schedule.title,
          start_time: schedule.start_time,
          notification_type: nConfig.type,
          title,
          recipients: pushRes.recipients || 0,
        });
      }
    }
  }

  return {
    success: true,
    kolkata_time: `${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds}`,
    processed_schedules_count: schedules.length,
    sent_notifications_count: sentResults.length,
    sent_notifications: sentResults,
    skipped_count: skippedCount,
  };
}

/**
 * Triggers the automatic schedule notification edge function manually or on demand,
 * with seamless fallback to client-side schedule calculation.
 */
export async function triggerAutoScheduleNotificationCheck(): Promise<{
  success: boolean;
  kolkata_time?: string;
  processed_schedules_count?: number;
  sent_notifications_count?: number;
  sent_notifications?: any[];
  skipped_count?: number;
  error?: string;
}> {
  // 1. Primary Attempt: Call Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("process-schedule-notifications");
    if (!error && data && data.success) {
      return data;
    }
    if (error) {
      console.warn(
        "[Schedule Notifier] Edge function warning, running client-side schedule scan fallback:",
        error,
      );
    }
  } catch (err: any) {
    console.warn(
      "[Schedule Notifier] Edge function unreachable, executing client scan fallback:",
      err,
    );
  }

  // 2. Fallback Attempt: Direct Client-side Schedule Scan Engine
  return await runClientSideScheduleScan();
}

export interface SendSinglePushOptions {
  userId?: string | null;
  playerId?: string | null;
  title: string;
  message: string;
  url?: string;
  icon?: string;
  created_by?: string;
}

export async function getOneSignalPlayerId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    if ((OneSignal as any).User?.PushSubscription?.id) {
      return (OneSignal as any).User.PushSubscription.id;
    }
  } catch (_e) {}

  const cached = localStorage.getItem("onesignal_subscription_id");
  if (cached) return cached;
  return null;
}

/**
 * Sends a single-device push notification targeting a specific user or subscription ID ONLY
 */
export async function sendSingleDevicePushNotification({
  userId,
  playerId,
  title,
  message,
  url = "https://shanthimahaganapathi-2026.web.app/notifications",
  icon = "https://shanthimahaganapathi-2026.web.app/favicon.png",
  created_by,
}: SendSinglePushOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const targetUrl = url || "https://shanthimahaganapathi-2026.web.app/notifications";
  const targetIcon = icon || "https://shanthimahaganapathi-2026.web.app/favicon.png";

  try {
    await supabase.from("notifications").insert({
      title,
      message,
      url: targetUrl,
      icon: targetIcon,
      sent_count: 1,
      created_by: created_by || null,
    });
  } catch (e) {
    console.warn("DB notification log error:", e);
  }

  try {
    const payload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      isAndroid: true,
      isIos: true,
      isAnyWeb: true,
      headings: { en: title },
      contents: { en: message },
      web_url: targetUrl,
      data: {
        target_route: targetUrl,
        launch_url: targetUrl,
      },
      chrome_web_icon: targetIcon,
      chrome_web_image: targetIcon,
      small_icon: "ic_stat_onesignal_default",
      large_icon: targetIcon,
      android_accent_color: "FF6B00",
      priority: 10,
    };

    if (playerId) {
      // Direct targeting of newly registered device subscription ID ONLY
      payload.include_player_ids = [playerId];
      payload.include_subscription_ids = [playerId];
    } else if (userId) {
      // Direct targeting of specific registered user ONLY
      payload.include_external_user_ids = [userId];
      payload.include_aliases = { external_id: [userId] };
      payload.channel_for_external_user_ids = "push";
      payload.filters = [{ field: "tag", key: "user_id", relation: "=", value: userId }];
    } else {
      console.warn(
        "Single device notification skipped: No userId or playerId provided. Prevents unintended broadcast.",
      );
      return { success: false, error: "Missing recipient device or user ID." };
    }

    const authHeader = ONESIGNAL_REST_KEY.startsWith("os_v2_")
      ? `Key ${ONESIGNAL_REST_KEY}`
      : `Basic ${ONESIGNAL_REST_KEY}`;

    const osRes = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const osData = await osRes.json();
    return { success: osRes.ok || !!osData?.id, id: osData?.id };
  } catch (err: any) {
    console.error("Single device push error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

/**
 * 1. Account Created Welcome Notification - DISABLED as requested
 */
export async function notifyWelcomeAccountCreated(
  _userId?: string | null,
  _name?: string | null,
  _playerIdOverride?: string | null,
) {
  // Disabled account creation push notification
  return { success: true, message: "Welcome push notification disabled" };
}

export async function notifyNewVideoUploaded(
  videoTitle: string,
  thumbnailUrl?: string | null,
  videoId?: string | null
) {
  const targetThumbnail = thumbnailUrl || "https://shanthimahaganapathi-2026.web.app/favicon.png";
  const targetUrl = videoId
    ? `https://shanthimahaganapathi-2026.web.app/video/${videoId}`
    : "https://shanthimahaganapathi-2026.web.app/gallery";

  return sendBroadcastPushNotification({
    title: `📹 New Festival Video: ${videoTitle}`,
    message: `Watch the latest video "${videoTitle}" live in the festival gallery! Tap to watch now.`,
    icon: targetThumbnail,
    url: targetUrl,
  });
}

/**
 * 3. Event Pass Confirmed Notification (Single Device)
 */
export async function notifyEventPassConfirmed({
  userId,
  eventName,
  passCode,
}: {
  userId?: string | null;
  eventName: string;
  passCode: string;
}) {
  return sendSingleDevicePushNotification({
    userId,
    title: `🎫 Event Pass Confirmed: ${eventName}`,
    message: `Your pass code ${passCode} for "${eventName}" is confirmed! Tap to view your QR pass.`,
    url: "https://shanthimahaganapathi-2026.web.app/my-passes",
  });
}
