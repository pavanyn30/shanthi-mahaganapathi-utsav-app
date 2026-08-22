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

async function main() {
  console.log("=== CHECK NOTIFICATIONS TABLE IN SUPABASE ===");
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Found ${data?.length || 0} notifications:`);
    data?.forEach((n) => {
      console.log(`- [${n.created_at || n.sent_at}] ${n.title}: ${n.message}`);
    });
  }

  console.log("\n=== TESTING RUN SCHEDULE SCAN NOW ===");
  const { processScheduleNotifications } = await import("./run-schedule-auto-notifier.js");
  const result = await processScheduleNotifications();
  console.log("Scan Result:", JSON.stringify(result, null, 2));
}

main();
