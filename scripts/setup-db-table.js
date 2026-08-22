import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setup() {
  console.log("Checking Supabase connection & RPC capabilities...");

  // Try creating table via RPC or checking existing schema
  const { data, error } = await supabase.rpc("exec_sql", {
    query: `
      CREATE TABLE IF NOT EXISTS public.schedule_notification_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id UUID NOT NULL REFERENCES public.festival_schedules(id) ON DELETE CASCADE,
          notification_type TEXT NOT NULL CHECK (notification_type IN ('30_min', '15_min', '5_min')),
          scheduled_time TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          status TEXT NOT NULL DEFAULT 'sent',
          onesignal_id TEXT,
          recipients_count INTEGER DEFAULT 0,
          CONSTRAINT schedule_notification_logs_unique UNIQUE (schedule_id, notification_type, scheduled_time)
      );
    `
  });

  if (error) {
    console.log("RPC exec_sql note:", error.message);
  } else {
    console.log("✅ Successfully created schedule_notification_logs table!");
  }
}

setup();
