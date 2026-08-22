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

const schedulesToInsert = [
  {
    title: "Ganapathi Sthapana",
    description: "Welcome Lord Ganesha with traditional rituals and prayers.",
    schedule_date: "2026-08-09",
    start_time: "13:30:00",
    end_time: "14:00:00",
    venue: "Main Pandal",
    category: "pooja",
    is_published: true,
    sort_order: 1,
  },
  {
    title: "Ganapathi Pooja",
    description: "Perform a special pooja and seek Lord Ganesha's blessings.",
    schedule_date: "2026-08-09",
    start_time: "14:00:00",
    end_time: "14:30:00",
    venue: "Main Sanctum",
    category: "pooja",
    is_published: true,
    sort_order: 2,
  },
  {
    title: "Sankalpa & Aarti",
    description: "Join devotional prayers and offer aarti to Lord Ganesha.",
    schedule_date: "2026-08-09",
    start_time: "14:30:00",
    end_time: "15:00:00",
    venue: "Main Sanctum",
    category: "aarti",
    is_published: true,
    sort_order: 3,
  },
  {
    title: "Modaka Offering",
    description: "Offer delicious traditional modakas as a special offering.",
    schedule_date: "2026-08-09",
    start_time: "15:00:00",
    end_time: "15:30:00",
    venue: "Main Sanctum",
    category: "prasadam",
    is_published: true,
    sort_order: 4,
  },
  {
    title: "Ganapathi Bhajane",
    description: "Enjoy devotional bhajans and songs dedicated to Lord Ganesha.",
    schedule_date: "2026-08-09",
    start_time: "15:30:00",
    end_time: "16:00:00",
    venue: "Cultural Stage",
    category: "cultural",
    is_published: true,
    sort_order: 5,
  },
  {
    title: "Children's Program",
    description: "Fun games, activities, and cultural programs for children.",
    schedule_date: "2026-08-09",
    start_time: "16:00:00",
    end_time: "16:30:00",
    venue: "Community Hall",
    category: "cultural",
    is_published: true,
    sort_order: 6,
  },
  {
    title: "Cultural Program",
    description: "Experience traditional music, dance, and cultural performances.",
    schedule_date: "2026-08-09",
    start_time: "16:30:00",
    end_time: "17:30:00",
    venue: "Main Stage",
    category: "cultural",
    is_published: true,
    sort_order: 7,
  },
  {
    title: "Annadana Seva",
    description: "Join the community meal service and share food with devotees.",
    schedule_date: "2026-08-09",
    start_time: "17:30:00",
    end_time: "18:30:00",
    venue: "Annadana Hall",
    category: "prasadam",
    is_published: true,
    sort_order: 8,
  },
  {
    title: "Maha Aarti",
    description: "Participate in the grand evening aarti and seek divine blessings.",
    schedule_date: "2026-08-09",
    start_time: "18:30:00",
    end_time: "19:30:00",
    venue: "Main Sanctum",
    category: "aarti",
    is_published: true,
    sort_order: 9,
  },
  {
    title: "Prasada Distribution",
    description: "Receive prasada and conclude the day's celebrations with blessings.",
    schedule_date: "2026-08-09",
    start_time: "19:30:00",
    end_time: "20:30:00",
    venue: "Main Pandal",
    category: "prasadam",
    is_published: true,
    sort_order: 10,
  },
];

async function seed() {
  console.log("Seeding today's 10 schedules to Supabase database...");
  for (const s of schedulesToInsert) {
    const { data, error } = await supabase
      .from("festival_schedules")
      .insert(s)
      .select("*");

    if (error) {
      console.error(`Error inserting ${s.title}:`, error.message);
    } else {
      console.log(`✅ Seeded: ${s.title} (${s.start_time}) -> ID: ${data?.[0]?.id}`);
    }
  }

  // Also trigger the automatic schedule notification process immediately!
  console.log("Triggering process-schedule-notifications scan...");
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke("process-schedule-notifications");
    if (fnError) {
      console.log("Edge function invocation note:", fnError.message);
    } else {
      console.log("✅ Edge function scan result:", JSON.stringify(fnData, null, 2));
    }
  } catch (e) {
    console.log("Edge function scan note:", e.message);
  }
}

seed();
