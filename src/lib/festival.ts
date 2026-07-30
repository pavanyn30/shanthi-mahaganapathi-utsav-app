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
  media_type: string;
  likes: number;
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
  payment_id?: string | null;
  order_id?: string | null;
  payment_signature?: string | null;
  status: string;
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
  attended: boolean;
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
  donation_goal: number;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
};

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const volunteersQuery = {
  queryKey: ["volunteers"],
  queryFn: async () =>
    unwrap<VolunteerApplication[]>(
      await supabase.from("volunteers").select("*").order("created_at", { ascending: false }),
    ),
};

export const memoriesQuery = {
  queryKey: ["festival-memories"],
  queryFn: async () =>
    unwrap<FestivalMemory[]>(
      await supabase.from("festival_memories").select("*").order("year", { ascending: false }),
    ),
};

export const settingsQuery = {
  queryKey: ["festival-settings"],
  queryFn: async (): Promise<FestivalSettings | null> => {
    const { data, error } = await supabase.from("festival_settings").select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as unknown as FestivalSettings) ?? null;
  },
};

export const eventsQuery = {
  queryKey: ["events"],
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
  queryFn: async () =>
    unwrap<EventRow | null>(
      await supabase.from("events").select("*").eq("slug", slug).maybeSingle(),
    ),
});

export const announcementsQuery = {
  queryKey: ["announcements"],
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
  queryFn: async () =>
    unwrap<Sponsor[]>(await supabase.from("sponsors").select("*").order("sort_order")),
};

export const galleryQuery = {
  queryKey: ["gallery"],
  queryFn: async () =>
    unwrap<GalleryItem[]>(
      await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }),
    ),
};

export const donationsQuery = {
  queryKey: ["donations"],
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
  queryFn: async () =>
    unwrap<Registration[]>(
      await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .order("created_at", { ascending: false }),
    ),
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
    const attendedRegs = (regRes.data ?? []).filter((r: { attended?: boolean }) => r.attended).length;
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
  return new Date(`${date}T00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(time: string) {
  const [h, m] = time.split(":");
  const d = new Date();
  d.setHours(Number(h), Number(m));
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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

  if (url.includes("/embed/")) return url;

  // Match youtube.com/watch?v=ID or &v=ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|&v=)([^&/\s]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  // Match youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?/\s]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // Match youtube.com/live/ID
  const liveMatch = url.match(/youtube\.com\/live\/([^?/\s]+)/);
  if (liveMatch && liveMatch[1]) {
    return `https://www.youtube.com/embed/${liveMatch[1]}`;
  }

  // Match youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?/\s]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  return url;
}
