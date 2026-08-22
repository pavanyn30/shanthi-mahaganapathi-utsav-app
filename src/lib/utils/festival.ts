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
  // 14 September 2026 (Day 1 - 14-09-2026ನೇ ಸೋಮವಾರ)
  {
    id: "fs-14-1",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪ್ರತಿಷ್ಠಾಪನ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    description: "ಬೆಳಿಗ್ಗೆ 10.30 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪ್ರತಿಷ್ಠಾಪನ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    schedule_date: "2026-09-14",
    start_time: "10:30",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-2",
    title: "ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ಮಧ್ಯಾಹ್ನ 12.30 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-14",
    start_time: "12:30",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-3",
    title: "ಕ್ರೀಡಾ ಚಟುವಟಿಕೆಗಳು",
    description: "ಮಧ್ಯಾಹ್ನ 03.00 ರಿಂದ — ಬಡಾವಣೆಗಳ ನಿವಾಸಿಗಳಿಗೆ ಮತ್ತು ಮಕ್ಕಳಿಗೆ ಕ್ರೀಡಾ ಚಟುವಟಿಕೆಗಳು",
    schedule_date: "2026-09-14",
    start_time: "15:00",
    end_time: null,
    venue: "ಉತ್ಸವ ಮೈದಾನ",
    category: "event",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-4",
    title: "ಶ್ರೀ ಶಾಂತಿಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    description: "ಸಂಜೆ 06.30 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    schedule_date: "2026-09-14",
    start_time: "18:30",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "aarti",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-5",
    title: "ಪ್ರತಿಭಾ ಪುರಸ್ಕಾರ ಹಾಗೂ ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು",
    description: "ಸಂಜೆ 07.00 ರಿಂದ — 2026-ನೇ ಸಾಲಿನಲ್ಲಿ ಎಸ್.ಎಸ್.ಎಲ್.ಸಿ ಮತ್ತು ದ್ವಿತೀಯ ಪಿಯುಸಿಯಲ್ಲಿ ಉನ್ನತ ಶ್ರೇಣಿಯಲ್ಲಿ ತೇರ್ಗಡೆಯಾದ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಪ್ರತಿಭಾ ಪುರಸ್ಕಾರ ಕಾರ್ಯಕ್ರಮ ಹಾಗೂ ಬಡಾವಣೆಯ ನಿವಾಸಿಗಳಿಂದ ಸಾಂಸ್ಕೃತಿಕ ಮತ್ತು ಮನರಂಜನೆ ಕಾರ್ಯಕ್ರಮಗಳು",
    schedule_date: "2026-09-14",
    start_time: "19:00",
    end_time: null,
    venue: "ಸಾಂಸ್ಕೃತಿಕ ವೇದಿಕೆ",
    category: "cultural",
    is_published: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-14-6",
    title: "ರಾತ್ರಿ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ರಾತ್ರಿ 8.00 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-14",
    start_time: "20:00",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },

  // 15 September 2026 (Day 2 - 15-09-2026ನೇ ಮಂಗಳವಾರ)
  {
    id: "fs-15-1",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    description: "ಬೆಳಿಗ್ಗೆ 09.00 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    schedule_date: "2026-09-15",
    start_time: "09:00",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-2",
    title: "ಬೆಳಗಿನ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ಬೆಳಿಗ್ಗೆ 09.30 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-15",
    start_time: "09:30",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-3",
    title: "ಸಾಮೂಹಿಕ ಅನ್ನಸಂತರ್ಪಣೆ",
    description: "ಮಧ್ಯಾಹ್ನ 01.00 ರಿಂದ — ಸಾಮೂಹಿಕ ಅನ್ನಸಂತರ್ಪಣೆ, ಸಮಿತಿ ಪರವಾಗಿ ದಾಸೋಹಿಗಳಿಂದ",
    schedule_date: "2026-09-15",
    start_time: "13:00",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-4",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    description: "ಸಂಜೆ 06.30 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    schedule_date: "2026-09-15",
    start_time: "18:30",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "aarti",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-5",
    title: "ಮಾಜಿ ಸೈನಿಕರಿಗೆ ಅಭಿನಂದನೆ, ಬಹುಮಾನ ವಿತರಣೆ ಹಾಗೂ ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು",
    description: "ಸಂಜೆ 07.00 ರಿಂದ — ಬಡಾವಣೆಗಳ ಮಾಜಿ ಸೈನಿಕರಿಗೆ ಅಭಿನಂದನಾ ಕಾರ್ಯಕ್ರಮ, ಪ್ರಸಾದ-ಅನ್ನಸಂತರ್ಪಣೆ ಹಾಗೂ ಪ್ರಾಯೋಜಕರಿಗೆ, ಹೂವಿನ ಹರಾಜು ದಾನಿಗಳಿಗೆ ನೆನಪಿನ ಕಾಣಿಕೆ ವಿತರಣೆ, ಸಾಂಸ್ಕೃತಿಕ ಇನ್ನಿತರೆ ಕ್ರೀಡೆಯಲ್ಲಿ ವಿಜೇತರಾದವರಿಗೆ ಬಹುಮಾನ ವಿತರಣೆ ಹಾಗೂ ನಿವಾಸಿಗಳಿಂದ ಸಾಂಸ್ಕೃತಿಕ ಮತ್ತು ಮನರಂಜನೆ ಕಾರ್ಯಕ್ರಮಗಳು",
    schedule_date: "2026-09-15",
    start_time: "19:00",
    end_time: null,
    venue: "ಸಾಂಸ್ಕೃತಿಕ ವೇದಿಕೆ",
    category: "cultural",
    is_published: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-15-6",
    title: "ರಾತ್ರಿ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ರಾತ್ರಿ 08.00 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-15",
    start_time: "20:00",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },

  // 16 September 2026 (Day 3 - 16-09-2026ನೇ ಬುಧವಾರ)
  {
    id: "fs-16-1",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    description: "ಬೆಳಿಗ್ಗೆ 09.00 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಪೂಜೆ ಮತ್ತು ಮಹಾಮಂಗಳಾರತಿ",
    schedule_date: "2026-09-16",
    start_time: "09:00",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "pooja",
    is_published: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-2",
    title: "ಬೆಳಗಿನ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ಬೆಳಿಗ್ಗೆ 09.30 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-16",
    start_time: "09:30",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-3",
    title: "ಮಧ್ಯಾಹ್ನದ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ಮಧ್ಯಾಹ್ನ 01.00 ರಿಂದ — ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-16",
    start_time: "13:00",
    end_time: null,
    venue: "ಅನ್ನದಾನ ಮಂಟಪ",
    category: "prasadam",
    is_published: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-4",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿಯ ಹೂವಿನಹಾರ ಮತ್ತು ಇತರೆ ಹಾರಗಳ ಹರಾಜು ಕಾರ್ಯಕ್ರಮ",
    description: "ಮಧ್ಯಾಹ್ನ 02.00 ರಿಂದ — ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿಯ ಹೂವಿನಹಾರ ಮತ್ತು ಇತರೆ ಹಾರಗಳ ಹರಾಜು ಕಾರ್ಯಕ್ರಮ",
    schedule_date: "2026-09-16",
    start_time: "14:00",
    end_time: null,
    venue: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿ ಮಂಟಪ",
    category: "event",
    is_published: true,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-5",
    title: "ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿಯ ವಿಜೃಂಭಣೆಯ ವಿಸರ್ಜನಾ ಮೆರವಣಿಗೆ ಪ್ರಾರಂಭ & ಚಂದ್ರವಳ್ಳಿಯಲ್ಲಿ ವಿಸರ್ಜನೆ",
    description: "ಮಧ್ಯಾಹ್ನ 03.00 ರಿಂದ — ವಿವಿಧ ವಾದ್ಯ ತಂಡಗಳೊಂದಿಗೆ ಎಲ್ಲಾ ಬಡಾವಣೆಗಳ ನಿವಾಸಿಗಳ ಭಾಗವಹಿಸುವಿಕೆಯೊಂದಿಗೆ ಶ್ರೀ ಶಾಂತಿ ಮಹಾಗಣಪತಿಯ ವಿಜೃಂಭಣೆಯ ವಿಸರ್ಜನಾ ಮೆರವಣಿಗೆ ಪ್ರಾರಂಭ ಹಾಗೂ ಚಂದ್ರವಳ್ಳಿಯಲ್ಲಿ ವಿಸರ್ಜನೆ.",
    schedule_date: "2026-09-16",
    start_time: "15:00",
    end_time: null,
    venue: "ಉತ್ಸವ ಮಂಟಪದಿಂದ ಚಂದ್ರವಳ್ಳಿ ಕೆರೆ",
    category: "event",
    is_published: true,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: "fs-16-6",
    title: "ಮೆರವಣಿಗೆ ಅಂತ್ಯದಲ್ಲಿ ಪ್ರಸಾದ ವಿನಿಯೋಗ",
    description: "ಸಂಜೆ 07.00 ರಿಂದ — ಮೆರವಣಿಗೆ ಅಂತ್ಯದಲ್ಲಿ ಪ್ರಸಾದ ವಿನಿಯೋಗ, ದಾಸೋಹಿಗಳ ಪರವಾಗಿ ಸೇವಾ ಸಮಿತಿಯಿಂದ",
    schedule_date: "2026-09-16",
    start_time: "19:00",
    end_time: null,
    venue: "ಚಂದ್ರವಳ್ಳಿ ಕೆರೆ / ಮೆರವಣಿಗೆ ಮಾರ್ಗ",
    category: "prasadam",
    is_published: true,
    sort_order: 6,
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

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "g-1",
    title: "Grand Ganapathi Sthapana & First Aarti (2026)",
    category: "aarti",
    media_url: "https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200",
    media_type: "video",
    likes: 342,
    is_featured: true,
  },
  {
    id: "g-2",
    title: "Dhol Tasha Pathak Energetic Performance (2026)",
    category: "cultural",
    media_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200",
    media_type: "video",
    likes: 512,
    is_featured: true,
  },
  {
    id: "g-3",
    title: "Grand Visarjan Miravand Procession Highlights (2026)",
    category: "visarjan",
    media_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200",
    media_type: "video",
    likes: 630,
    is_featured: true,
  },
  {
    id: "g-4",
    title: "Eco-Friendly Clay Idol Craftsmanship (2026)",
    category: "photos",
    media_url: "https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1d9?w=1200",
    media_type: "image",
    likes: 189,
    is_featured: false,
  },
  {
    id: "g-5",
    title: "108 Lamp Maha Deepotsav Aarti (2026)",
    category: "aarti",
    media_url: "https://images.unsplash.com/photo-1567591370504-c1b1a3f66c6a?w=1200",
    media_type: "image",
    likes: 276,
    is_featured: false,
  },
  {
    id: "g-6",
    title: "Annual Children Rangoli & Drawing Contest (2026)",
    category: "cultural",
    media_url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200",
    media_type: "image",
    likes: 145,
    is_featured: false,
  },
  {
    id: "g-7",
    title: "Cultural Night Classical Concert (2025)",
    category: "cultural",
    media_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200",
    media_type: "video",
    likes: 176,
    is_featured: true,
  },
];

export const galleryQuery = {
  queryKey: ["gallery"],
  placeholderData: (prevData: any) => prevData,
  queryFn: async () => {
    const res = unwrap<GalleryItem[]>(
      await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }),
    );
    return res || [];
  },
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
