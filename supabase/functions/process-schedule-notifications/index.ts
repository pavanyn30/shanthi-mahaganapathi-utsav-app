import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Get current Date & Time in Asia/Kolkata timezone
 */
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

  return { dateStr, hours, minutes, seconds, totalMinutes, rawNow: now };
}

/**
 * Convert time string "HH:MM" or "HH:MM:SS" to total minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Format time string to 12-hour AM/PM format (e.g. "19:00:00" -> "7:00 PM")
 */
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ONESIGNAL_APP_ID =
      Deno.env.get("ONESIGNAL_APP_ID") || "def559e2-60c1-4fc0-ba35-9402e4c1b63c";
    const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://btuvycmteycrvflaxhgc.supabase.co";
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const kolkataNow = getKolkataNow();
    const todayDateStr = kolkataNow.dateStr;
    const currentMins = kolkataNow.totalMinutes;

    console.log(
      `[Schedule Notifier] Execution at Kolkata Time: ${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds} (${currentMins} mins)`
    );

    // Query existing festival_schedules table directly for today's date (Asia/Kolkata)
    const { data: schedules, error: schedError } = await supabase
      .from("festival_schedules")
      .select("*")
      .eq("schedule_date", todayDateStr)
      .neq("is_published", false);

    if (schedError) {
      console.error("Error fetching today's schedules from festival_schedules:", schedError);
      return new Response(
        JSON.stringify({ success: false, error: schedError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `No active festival schedules found in festival_schedules for today (${todayDateStr} IST).`,
          kolkata_time: `${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds}`,
          processed_schedules_count: 0,
          sent_notifications: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificationTypes = [
      { type: "30_min", minutesBefore: 30, emoji: "🔔", label: "30 minutes" },
      { type: "15_min", minutesBefore: 15, emoji: "⏰", label: "15 minutes" },
      { type: "5_min", minutesBefore: 5, emoji: "🚨", label: "5 minutes" },
    ];

    const sentResults = [];
    const skippedLogs = [];

    // Process EACH festival schedule record independently
    for (const schedule of schedules) {
      const startMins = parseTimeToMinutes(schedule.start_time);
      if (startMins === null) continue;

      for (const nConfig of notificationTypes) {
        const triggerMins = startMins - nConfig.minutesBefore;

        // Eligibility window:
        // Current Kolkata time is at or after trigger time AND within 15 minutes after start time
        if (currentMins >= triggerMins && currentMins < startMins + 15) {
          // Build dynamic notification title & message
          const timeFormatted = format12Hour(schedule.start_time);
          const title = `${nConfig.emoji} ${schedule.title} starts in ${nConfig.label}!`;
          const venueText = schedule.venue ? ` at ${schedule.venue}` : "";
          const message = `${schedule.title} is scheduled to start at ${timeFormatted}${venueText}. Devotees are invited to join!`;
          const targetUrl = "https://shanthimahaganapathi-2026.web.app/notifications";
          const targetIcon = "https://shanthimahaganapathi-2026.web.app/favicon.png";

          // Check if notification has already been sent for this specific festival_schedules record & type
          let existingLog = null;
          try {
            const { data } = await supabase
              .from("schedule_notification_logs")
              .select("id")
              .eq("schedule_id", schedule.id)
              .eq("notification_type", nConfig.type)
              .maybeSingle();
            existingLog = data;
          } catch (_err) {
            // schedule_notification_logs table may not exist yet
          }

          let existingNotif = null;
          try {
            const { data } = await supabase
              .from("notifications")
              .select("id")
              .eq("title", title)
              .maybeSingle();
            existingNotif = data;
          } catch (_err) {
            // notifications check
          }

          if (existingLog || existingNotif) {
            // Already sent, skip to prevent duplicates
            skippedLogs.push({
              schedule_id: schedule.id,
              title: schedule.title,
              type: nConfig.type,
              reason: "Already sent (record exists)",
            });
            continue;
          }

          // OneSignal Push Notification Payload
          const payload = {
            app_id: ONESIGNAL_APP_ID,
            included_segments: ["All"],
            isAndroid: true,
            isIos: true,
            isAnyWeb: true,
            headings: { en: title },
            contents: { en: message },
            web_url: targetUrl,
            data: {
              target_route: "/notifications",
              launch_url: "/notifications",
              schedule_id: schedule.id,
              notification_type: nConfig.type,
            },
            chrome_web_icon: targetIcon,
            chrome_web_image: targetIcon,
            small_icon: "ic_stat_onesignal_default",
            large_icon: targetIcon,
            android_accent_color: "FF6B00",
            priority: 10,
          };

          let authHeader = ONESIGNAL_REST_KEY.startsWith("os_v2_")
            ? `Key ${ONESIGNAL_REST_KEY}`
            : `Basic ${ONESIGNAL_REST_KEY}`;

          let osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: authHeader,
            },
            body: JSON.stringify(payload),
          });

          let osData = await osResponse.json();

          if (!osResponse.ok && (osData?.errors?.[0]?.includes("Invalid") || osData?.errors?.[0]?.includes("auth"))) {
            osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
              },
              body: JSON.stringify(payload),
            });
            osData = await osResponse.json();
          }

          const recipientsCount = osData?.recipients || 0;
          const osId = osData?.id || null;

          // Try inserting into schedule_notification_logs if available
          try {
            await supabase
              .from("schedule_notification_logs")
              .insert({
                schedule_id: schedule.id,
                notification_type: nConfig.type,
                scheduled_time: schedule.start_time,
                status: "sent",
                onesignal_id: osId,
                recipients_count: recipientsCount,
              });
          } catch (e) {
            // Optional log table catch
          }

          // Insert into main notifications table for UI history & notification feed
          await supabase
            .from("notifications")
            .insert({
              title,
              message,
              url: targetUrl,
              icon: targetIcon,
              sent_count: recipientsCount,
            });

          sentResults.push({
            schedule_id: schedule.id,
            schedule_title: schedule.title,
            start_time: schedule.start_time,
            notification_type: nConfig.type,
            title,
            recipients: recipientsCount,
            onesignal_id: osId,
          });

          console.log(
            `[Schedule Notifier] Successfully sent ${nConfig.type} notification for "${schedule.title}" (${schedule.start_time})`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        kolkata_time: `${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds}`,
        processed_schedules_count: schedules.length,
        sent_notifications_count: sentResults.length,
        sent_notifications: sentResults,
        skipped_count: skippedLogs.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Schedule notifier edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
