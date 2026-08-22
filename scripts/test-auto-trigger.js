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

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAutoTrigger() {
  console.log("=========================================");
  console.log("AUTOMATIC SCHEDULE TRIGGER SYSTEM TEST");
  console.log("=========================================");

  // 1. Query today's schedules in festival_schedules
  const todayStr = "2026-08-09";
  const { data: schedules, error: schedErr } = await supabase
    .from("festival_schedules")
    .select("id, title, schedule_date, start_time, venue, category, is_published")
    .eq("schedule_date", todayStr)
    .order("start_time", { ascending: true });

  if (schedErr) {
    console.error("❌ Error fetching festival_schedules:", schedErr.message);
  } else {
    console.log(`📅 Today's Published Schedules Count (${todayStr}):`, schedules?.length || 0);
    schedules?.forEach((s, i) => {
      console.log(`   ${i + 1}. [${s.start_time}] ${s.title} (${s.venue})`);
    });
  }

  console.log("\n-----------------------------------------");
  console.log("Invoking Edge Function: process-schedule-notifications...");
  
  try {
    const { data: fnResult, error: fnErr } = await supabase.functions.invoke("process-schedule-notifications");

    if (fnErr) {
      console.log("⚠️ Edge function invocation error:", fnErr.message);
    } else {
      console.log("✅ Edge Function Execution Response:");
      console.log(JSON.stringify(fnResult, null, 2));
    }
  } catch (err) {
    console.error("⚠️ Invocation exception:", err?.message || err);
  }

  console.log("\n-----------------------------------------");
  console.log("Querying schedule_notification_logs table...");

  const { data: logs, error: logsErr } = await supabase
    .from("schedule_notification_logs")
    .select("*, festival_schedules(title)")
    .order("sent_at", { ascending: false });

  if (logsErr) {
    console.error("❌ Error fetching schedule_notification_logs:", logsErr.message);
  } else {
    console.log(`📊 Sent Schedule Notification Logs Count:`, logs?.length || 0);
    logs?.forEach((l, i) => {
      console.log(`   ${i + 1}. Type: ${l.notification_type} | Time: ${l.scheduled_time} | Sent At: ${l.sent_at} | OneSignal ID: ${l.onesignal_id || "N/A"}`);
    });
  }

  console.log("=========================================");
}

checkAutoTrigger();
