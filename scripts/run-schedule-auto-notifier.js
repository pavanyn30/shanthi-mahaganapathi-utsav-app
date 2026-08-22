import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env file manually
const envPath = path.resolve(process.cwd(), ".env");
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });
}

const supabaseUrl = env.SUPABASE_URL || "https://btuvycmteycrvflaxhgc.supabase.co";
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const ONESIGNAL_APP_ID = env.VITE_ONESIGNAL_APP_ID || "def559e2-60c1-4fc0-ba35-9402e4c1b63c";
const ONESIGNAL_REST_KEY = env.ONESIGNAL_REST_API_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

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
  const getPart = (type) => parts.find((p) => p.type === type)?.value || "00";

  const dateStr = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  const hours = parseInt(getPart("hour"), 10);
  const minutes = parseInt(getPart("minute"), 10);
  const seconds = parseInt(getPart("second"), 10);
  const totalMinutes = hours * 60 + minutes;

  return { dateStr, hours, minutes, seconds, totalMinutes };
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function format12Hour(timeStr) {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
}

export async function processScheduleNotifications() {
  const kolkataNow = getKolkataNow();
  const todayDateStr = kolkataNow.dateStr;
  const currentMins = kolkataNow.totalMinutes;

  console.log(`\n==================================================`);
  console.log(`[SCHEDULE NOTIFICATION ENGINE RUN]`);
  console.log(`Time (Asia/Kolkata): ${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds} (${currentMins} mins)`);
  console.log(`==================================================`);

  // Query existing festival_schedules table directly for today's date (Asia/Kolkata)
  const { data: schedules, error: schedError } = await supabase
    .from("festival_schedules")
    .select("*")
    .eq("schedule_date", todayDateStr)
    .neq("is_published", false)
    .order("start_time", { ascending: true });

  if (schedError) {
    console.error("❌ Database query error on festival_schedules:", schedError.message);
    return { success: false, error: schedError.message };
  }

  console.log(`📋 Found ${schedules?.length || 0} active schedule record(s) in festival_schedules for today.`);

  const notificationTypes = [
    { type: "30_min", minutesBefore: 30, emoji: "🔔", label: "30 minutes" },
    { type: "15_min", minutesBefore: 15, emoji: "⏰", label: "15 minutes" },
    { type: "5_min", minutesBefore: 5, emoji: "🚨", label: "5 minutes" },
  ];

  const sentResults = [];
  const skippedLogs = [];

  for (const schedule of schedules || []) {
    const startMins = parseTimeToMinutes(schedule.start_time);
    if (startMins === null) continue;

    for (const nConfig of notificationTypes) {
      const triggerMins = startMins - nConfig.minutesBefore;

      const isEligible = currentMins >= triggerMins && currentMins < startMins + 15;
      const targetTimeFormatted = format12Hour(schedule.start_time);
      const title = `${nConfig.emoji} ${schedule.title} starts in ${nConfig.label}!`;

      console.log(`   - Festival Schedule: "${schedule.title}" (${targetTimeFormatted}) | ${nConfig.type} Trigger | Current Mins: ${currentMins} | Trigger Mins: ${triggerMins} | Eligible: ${isEligible ? "YES" : "NO"}`);

      if (isEligible) {
        // Check idempotency in schedule_notification_logs or notifications table
        const { data: existingLog } = await supabase
          .from("schedule_notification_logs")
          .select("id")
          .eq("schedule_id", schedule.id)
          .eq("notification_type", nConfig.type)
          .maybeSingle();

        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("title", title)
          .maybeSingle();

        if (existingLog || existingNotif) {
          console.log(`     -> SKIPPED: Notification "${title}" was already dispatched.`);
          skippedLogs.push({ schedule_id: schedule.id, title: schedule.title, type: nConfig.type, reason: "Already sent" });
          continue;
        }

        const venueText = schedule.venue ? ` at ${schedule.venue}` : "";
        const message = `${schedule.title} is scheduled to start at ${targetTimeFormatted}${venueText}. Devotees are invited to join!`;
        const targetUrl = "https://shanthimahaganapathi-2026.web.app/notifications";
        const targetIcon = "https://shanthimahaganapathi-2026.web.app/favicon.png";

        console.log(`     🚀 DISPATCHING ONESIGNAL PUSH: "${title}"`);

        const payload = {
          app_id: ONESIGNAL_APP_ID,
          included_segments: ["Subscribed Users", "Active Users", "Total Subscriptions", "All"],
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
        const recipientsCount = osData?.recipients || 0;
        const osId = osData?.id || null;

        // Record in notifications table for UI history & notification feed
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

        console.log(`     ✅ SENT SUCCESS! OneSignal ID: ${osId} | Recipients: ${recipientsCount}`);
      }
    }
  }

  console.log(`==================================================`);
  console.log(`RESULT: Processed ${schedules?.length || 0} schedules | Sent: ${sentResults.length} | Skipped: ${skippedLogs.length}`);
  console.log(`==================================================\n`);

  return {
    success: true,
    kolkata_time: `${todayDateStr} ${kolkataNow.hours}:${kolkataNow.minutes}:${kolkataNow.seconds}`,
    processed_schedules_count: schedules?.length || 0,
    sent_notifications_count: sentResults.length,
    sent_notifications: sentResults,
    skipped_count: skippedLogs.length,
  };
}

if (process.argv[1]?.includes("run-schedule-auto-notifier.js")) {
  processScheduleNotifications();
}
