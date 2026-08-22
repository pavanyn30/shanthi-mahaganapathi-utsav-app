import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  venue: string;
  max_participants: number;
  registration_open: boolean;
  entry_fee: number;
  rules: string | null;
  prize_details: string | null;
  age_min: number | null;
  age_max: number | null;
  team_size: number;
  poster_url: string | null;
  organizer_name: string | null;
  organizer_phone: string | null;
  is_published: boolean;
};

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_pinned: boolean;
  created_at: string;
};

export type Sponsor = {
  id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website: string | null;
  contact: string | null;
  banner_url: string | null;
};

export type GalleryItem = {
  id: string;
  title: string;
  category: string;
  media_url: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  media_type: "image" | "video" | string;
  aspect_ratio?: string | null;
  is_featured?: boolean;
  likes: number;
  created_at?: string;
};

export type Donation = {
  id: string;
  user_id?: string | null;
  donor_name: string;
  email?: string | null;
  phone?: string | null;
  amount: number;
  message: string | null;
  is_anonymous: boolean;
  reference_no?: string | null;
  payment_method?: string;
  utr_number?: string | null;
  screenshot_url?: string | null;
  payment_id?: string | null;
  order_id?: string | null;
  payment_signature?: string | null;
  status: string;
  admin_notes?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at: string;
};

export type Registration = {
  id: string;
  event_id: string;
  user_id: string;
  pass_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  team_name: string | null;
  teammates: string | null;
  emergency_contact: string | null;
  status: string;
  payment_status: string;
  payment_method?: string;
  reference_no?: string | null;
  utr_number?: string | null;
  screenshot_url?: string | null;
  admin_notes?: string | null;
  verified_at?: string | null;
  attended: boolean;
  attended_at?: string | null;
  created_at: string;
  events?: Pick<EventRow, "name" | "event_date" | "start_time" | "venue" | "slug"> | null;
};

export type VolunteerApplication = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  gender?: string | null;
  address: string | null;
  skills: string | null;
  availability: string | null;
  duty: string | null;
  status: "pending" | "approved" | "rejected";
  assigned_event_id?: string | null;
  assigned_role?: string | null;
  assigned_shift?: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

export type FestivalMemory = {
  id: string;
  year: number;
  title: string;
  description: string;
  cover_image_url: string;
  photos: string[];
  sort_order: number;
  created_at: string;
};

export type FestivalSettings = {
  id?: number;
  festival_name: string;
  start_date: string;
  end_date: string;
  live_stream_url: string | null;
  upi_id: string | null;
  merchant_name?: string | null;
  upi_qr_url?: string | null;
  manual_upi_enabled?: boolean;
  donation_goal: number;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  splash_screen_url?: string | null;
  splash_screen_enabled?: boolean;
  splash_screen_duration?: number;
  splash_screen_redirect_url?: string | null;
};

export function validateUTR(utr: string): { valid: boolean; formatted: string; error?: string } {
  const trimmed = utr.trim().toUpperCase();
  if (!trimmed) {
    return {
      valid: false,
      formatted: "",
      error: "UTR / Transaction Reference Number is required.",
    };
  }
  const cleanStr = trimmed.replace(/\s+/g, "");
  if (!/^[A-Z0-9]+$/.test(cleanStr)) {
    return {
      valid: false,
      formatted: cleanStr,
      error: "UTR must contain only letters and numbers (alphanumeric).",
    };
  }
  if (cleanStr.length < 12 || cleanStr.length > 30) {
    return {
      valid: false,
      formatted: cleanStr,
      error: "UTR length must be between 12 and 30 characters.",
    };
  }
  return { valid: true, formatted: cleanStr };
}

export function generateReferenceNo(prefix: "DON" | "REG" = "DON"): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${randomNum}`;
}

export function buildUPIPayDeepLink(
  upiId: string,
  merchantName: string,
  amount: number,
  refNo?: string,
): string {
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(merchantName.trim() || "Sri Ganapathi Mandal Trust");
  const note = encodeURIComponent(refNo ? `Seva Payment ${refNo}` : "Devotion Seva Donation");
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount}&cu=INR&tn=${note}`;
}

export type FestivalScheduleItem = {
  id: string;
  title: string;
  description: string;
  schedule_date: string;
  start_time: string;
  end_time: string | null;
  venue: string;
  category: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

export const DEFAULT_FESTIVAL_SCHEDULES: FestivalScheduleItem[] = [
  // 14 September 2026 (Day 1 - Ganesh Chaturthi & Sthapana)
  {
    id: "fs-14-1",
    title: "Prana Pratishtha & Maha Sankalpa",
    description: "Grand invocation of Lord Ganesha with sacred Vedic chants and 108 Kalasha Abhishekam.",
    schedule_date: "2026-09-14",
    start_time: "06:30",
    end_time: "08:00",
    venue: "Main Sanctum",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-2",
    title: "Prathama Ganapathi Homam",
    description: "Sacred fire ritual offering 1,008 Modakas and herbal ahuti to Lord Vigneshwara.",
    schedule_date: "2026-09-14",
    start_time: "08:30",
    end_time: "10:30",
    venue: "Yajnashala",
    category: "pooja",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-3",
    title: "Day 1 Mahaprasada & Annadana",
    description: "Devotional community meal served to thousands of visiting devotees.",
    schedule_date: "2026-09-14",
    start_time: "12:30",
    end_time: "15:00",
    venue: "Annadana Hall",
    category: "prasadam",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-4",
    title: "Dhol Tasha Pathak Performance",
    description: "High-energy traditional drum troupe performance welcoming mandal devotees.",
    schedule_date: "2026-09-14",
    start_time: "17:00",
    end_time: "19:00",
    venue: "Pandal Ground",
    category: "cultural",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-5",
    title: "Grand Evening 108 Lamp Maha Aarti",
    description: "Grand evening illumination and devotional bhajans led by Sri Ganapathi Mandal choir.",
    schedule_date: "2026-09-14",
    start_time: "19:30",
    end_time: "21:00",
    venue: "Main Pandal",
    category: "aarti",
    is_published: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },

  // 15 September 2026 (Day 2 - Cultural & Competitions)
  {
    id: "fs-15-1",
    title: "Morning Panchamrutha Abhishekam",
    description: "Holy abhishekam with milk, honey, curd, and sugarcane juice followed by Sahasranama Archana.",
    schedule_date: "2026-09-15",
    start_time: "07:00",
    end_time: "08:30",
    venue: "Main Sanctum",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-2",
    title: "Children's Eco-Ganesha Clay Workshop",
    description: "Eco-friendly clay modeling competition and Rangoli festival for kids & youth.",
    schedule_date: "2026-09-15",
    start_time: "10:00",
    end_time: "12:30",
    venue: "Cultural Stage",
    category: "event",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-3",
    title: "Day 2 Mahaprasadam Distribution",
    description: "Sacred prasadam meals served to all visiting devotees.",
    schedule_date: "2026-09-15",
    start_time: "12:30",
    end_time: "14:30",
    venue: "Annadana Hall",
    category: "prasadam",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-4",
    title: "Carnatic & Devotional Music Night",
    description: "Live vocal and instrumental performance by renowned classical artists.",
    schedule_date: "2026-09-15",
    start_time: "18:00",
    end_time: "19:30",
    venue: "Main Stage",
    category: "cultural",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-5",
    title: "Deepotsava & Night Aarti",
    description: "Lighting 1,008 traditional brass lamps accompanied by devotional singing.",
    schedule_date: "2026-09-15",
    start_time: "19:30",
    end_time: "21:00",
    venue: "Main Sanctum",
    category: "aarti",
    is_published: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },

  // 16 September 2026 (Day 3 - Uttarapooja & Visarjan Procession)
  {
    id: "fs-16-1",
    title: "Uttarapooja & Maha Mangalarathi",
    description: "Special farewell pooja and final morning blessings.",
    schedule_date: "2026-09-16",
    start_time: "07:30",
    end_time: "09:00",
    venue: "Main Sanctum",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-2",
    title: "Grand Shobhayatra Procession",
    description: "Royal procession through city streets with flower chariot, folk dances & Dhol Tasha.",
    schedule_date: "2026-09-16",
    start_time: "10:30",
    end_time: "13:30",
    venue: "Festival Pandal to Lake",
    category: "event",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-3",
    title: "Visarjan Prasadam Distribution",
    description: "Special sweets and snacks served along the procession route.",
    schedule_date: "2026-09-16",
    start_time: "13:30",
    end_time: "15:30",
    venue: "Procession Route",
    category: "prasadam",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-4",
    title: "Eco-Friendly Idol Visarjan Ritual",
    description: "Sacred immersion ceremony at lakefront with floral tributes and Ganapathi Bappa Morya chants.",
    schedule_date: "2026-09-16",
    start_time: "17:00",
    end_time: "19:30",
    venue: "Holy Lake Front",
    category: "aarti",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
];

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const volunteersQuery = {
  queryKey: ["volunteers"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<VolunteerApplication[]>(
      await supabase.from("volunteers").select("*").order("created_at", { ascending: false }),
    ),
};

export const memoriesQuery = {
  queryKey: ["festival-memories"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<FestivalMemory[]>(
      await supabase
        .from("festival_memories")
        .select("*")
        .order("year", { ascending: true })
        .order("sort_order", { ascending: true }),
    ),
};

export const settingsQuery = {
  queryKey: ["festival-settings"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async (): Promise<FestivalSettings | null> => {
    const { data, error } = await supabase
      .from("festival_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const settings = (data as unknown as FestivalSettings) ?? {
      festival_name: "SHANTHI MAHA GANAPATHI 2026",
      start_date: "2026-09-14",
      end_date: "2026-09-24",
      live_stream_url: null,
      upi_id: "mandal@upi",
      donation_goal: 500000,
      contact_phone: "+91 7483639318",
      contact_email: "info@shanthimahaganapthi.org",
      address: "Sri Ganapathi Mandal, Chitradurga",
    };
    if (settings && settings.festival_name !== "SHANTHI MAHA GANAPATHI 2026") {
      settings.festival_name = "SHANTHI MAHA GANAPATHI 2026";
      supabase
        .from("festival_settings")
        .update({ festival_name: "SHANTHI MAHA GANAPATHI 2026" })
        .eq("id", settings.id ?? 1)
        .then();
    }
    return settings;
  },
};

export const festivalSchedulesQuery = {
  queryKey: ["festival-schedules"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async (): Promise<FestivalScheduleItem[]> => {
    try {
      const { data, error } = await (supabase.from as any)("festival_schedules")
        .select("*")
        .order("schedule_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) {
        console.warn("festival_schedules table query error:", error);
        return DEFAULT_FESTIVAL_SCHEDULES;
      }
      return (data ?? []) as unknown as FestivalScheduleItem[];
    } catch {
      return DEFAULT_FESTIVAL_SCHEDULES;
    }
  },
};

export const eventsQuery = {
  queryKey: ["events"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<EventRow[]>(
      await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ),
};

export const eventBySlugQuery = (slug: string) => ({
  queryKey: ["event", slug],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<EventRow | null>(
      await supabase.from("events").select("*").eq("slug", slug).maybeSingle(),
    ),
});

export const announcementsQuery = {
  queryKey: ["announcements"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<Announcement[]>(
      await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
};

export const sponsorsQuery = {
  queryKey: ["sponsors"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<Sponsor[]>(await supabase.from("sponsors").select("*").order("sort_order")),
};

export const galleryQuery = {
  queryKey: ["gallery"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<GalleryItem[]>(
      await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }),
    ),
};

export const donationsQuery = {
  queryKey: ["donations"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () =>
    unwrap<Donation[]>(
      await supabase
        .from("donations")
        .select("*")
        .eq("status", "approved")
        .order("amount", { ascending: false }),
    ),
};

export const myRegistrationsQuery = (userId: string | undefined) => ({
  queryKey: ["my-registrations", userId],
  enabled: !!userId,
  queryFn: async () => {
    // Normalize Firebase UID → valid UUID before querying
    const { stringToUuid } = await import("@/hooks/use-session");
    const validUuid = userId ? stringToUuid(userId) : "";
    if (!validUuid) return [] as Registration[];
    return unwrap<Registration[]>(
      await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .eq("user_id", validUuid)
        .order("created_at", { ascending: false }),
    );
  },
});

export const eventCountsQuery = {
  queryKey: ["event-counts"],
  queryFn: async () => {
    const { data } = await supabase.from("registrations").select("event_id");
    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { event_id: string }[]) {
      counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
    }
    return counts;
  },
};

export const liveStatsQuery = {
  queryKey: ["live-stats"],
  queryFn: async () => {
    const [regRes, volRes, donRes] = await Promise.all([
      supabase.from("registrations").select("id, attended", { count: "exact" }),
      supabase.from("volunteers").select("id", { count: "exact" }).eq("status", "approved"),
      supabase.from("donations").select("amount", { count: "exact" }).eq("status", "approved"),
    ]);

    const totalRegs = regRes.count ?? 0;
    const attendedRegs = (regRes.data ?? []).filter(
      (r: { attended?: boolean }) => r.attended,
    ).length;
    const approvedVols = volRes.count ?? 0;
    const totalDonationsCount = donRes.count ?? 0;
    const totalDonationsAmount = (donRes.data ?? []).reduce(
      (acc: number, d: { amount?: number }) => acc + (d.amount || 0),
      0,
    );

    // Calculate dynamic live visitors from actual registrations, checked-in attendees, and active volunteers
    const liveVisitors =
      (attendedRegs > 0 ? attendedRegs * 12 : Math.max(totalRegs * 6, 85)) + approvedVols * 4 + 42;

    return {
      totalRegs,
      attendedRegs,
      approvedVols,
      totalDonationsCount,
      totalDonationsAmount,
      liveVisitors,
    };
  },
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatEventDate(date: string) {
  if (!date) return "";
  try {
    const d = new Date(`${date}T00:00`);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function formatTime(time: string) {
  if (!time || !time.includes(":")) return time || "";
  try {
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    if (isNaN(d.getTime())) return time;
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  } catch {
    return time;
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  cultural: "Cultural",
  sports: "Sports",
  kids: "Kids",
  indoor: "Indoor",
  esports: "eSports",
};

export function getEmbeddableYouTubeUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  const url = rawUrl.trim();

  let videoId = "";

  if (url.includes("/embed/")) {
    const embedMatch = url.match(/\/embed\/([^?/\s]+)/);
    if (embedMatch && embedMatch[1]) videoId = embedMatch[1];
    else return url;
  } else {
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|&v=)([^&/\s]+)/);
    if (watchMatch && watchMatch[1]) videoId = watchMatch[1];

    if (!videoId) {
      const shortMatch = url.match(/youtu\.be\/([^?/\s]+)/);
      if (shortMatch && shortMatch[1]) videoId = shortMatch[1];
    }

    if (!videoId) {
      const liveMatch = url.match(/youtube\.com\/live\/([^?/\s]+)/);
      if (liveMatch && liveMatch[1]) videoId = liveMatch[1];
    }

    if (!videoId) {
      const shortsMatch = url.match(/youtube\.com\/shorts\/([^?/\s]+)/);
      if (shortsMatch && shortsMatch[1]) videoId = shortsMatch[1];
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=1&fs=0&playsinline=1`;
  }

  return url;
}

/**
 * Format a number into a sequential ID string (e.g. DON-000001, REG-000001)
 */
export function formatSequentialId(prefix: string, seqNum: number): string {
  return `${prefix.toUpperCase()}-${String(seqNum).padStart(6, "0")}`;
}

/**
 * Atomically fetch the next sequential ID from database counter
 * Examples: DON-000001, REG-000001, VOL-000001, EVT-000001, PAY-000001, INV-000001, TXN-000001
 */
export async function fetchNextSequentialId(prefix: string): Promise<string> {
  const cleanPrefix = prefix.toUpperCase();
  try {
    const { data, error } = await supabase.rpc("get_next_sequential_id", { p_prefix: cleanPrefix });
    if (!error && data) {
      return data as string;
    }
  } catch (err) {
    console.warn("Error calling get_next_sequential_id RPC:", err);
  }

  const randomVal = Math.floor(Math.random() * 899999) + 100000;
  return `${cleanPrefix}-${randomVal}`;
}
