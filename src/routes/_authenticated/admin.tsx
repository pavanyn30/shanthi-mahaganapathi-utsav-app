import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Users,
  HandHeart,
  Ticket,
  CheckCircle2,
  Plus,
  Pin,
  Trash2,
  Edit,
  Radio,
  Search,
  Settings,
  Image as ImageIcon,
  Building2,
  Sliders,
  DollarSign,
  UserCheck,
  Clock,
  XCircle,
  Eye,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Receipt,
  FileText,
  History,
  Sparkles,
  Layers,
  BarChart3,
  Activity,
  Megaphone,
  HeartHandshake,
  QrCode,
  Download,
  Filter,
  FileSpreadsheet,
  Loader2,
  Bell,
  PanelLeft,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession, useIsStaff, useUserRolePermissions } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { autoGenerateVideoThumbnail, getGalleryThumbnail } from "@/lib/utils/video-thumbnail";
import { notifyNewVideoUploaded } from "@/lib/services/onesignal-service";
import { ImageUploader } from "@/components/features/registrations/ImageUploader";
import {
  sendVolunteerApprovedEmail,
  sendVolunteerStatusUpdateEmail,
  sendDonationReceiptEmail,
} from "@/lib/email-service";
import { PaymentSettingsTab } from "@/components/features/admin/PaymentSettingsTab";
import { PushNotificationAdminTab } from "@/components/features/admin/PushNotificationAdminTab";
import { SplashScreenAdminTab } from "@/components/features/admin/SplashScreenAdminTab";
import { downloadDonationInvoicePDF } from "@/routes/donate";
import {
  announcementsQuery,
  donationsQuery,
  eventsQuery,
  festivalSchedulesQuery,
  DEFAULT_FESTIVAL_SCHEDULES,
  galleryQuery,
  settingsQuery,
  sponsorsQuery,
  volunteersQuery,
  memoriesQuery,
  getEmbeddableYouTubeUrl,
  formatCurrency,
  formatEventDate,
  type Registration,
  type EventRow,
  type FestivalScheduleItem,
  type Announcement,
  type Sponsor,
  type GalleryItem,
  type FestivalSettings,
  type VolunteerApplication,
  type Donation,
  type FestivalMemory,
} from "@/lib/festival";
import { QRScannerModal } from "@/components/features/volunteer/QRScannerModal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control Center — Executive Dashboard" },
      {
        name: "description",
        content:
          "Complete site management, memories, donations, volunteer applications, events, notices, gallery, sponsors and settings.",
      },
      { property: "og:title", content: "Admin Control Center — Executive Dashboard" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const userPerms = useUserRolePermissions(user?.id);
  const isStaff = userPerms.isStaff;
  const isMiniAdmin = userPerms.isMiniAdmin;
  const isFullAdmin = userPerms.isFullAdmin;
  const qc = useQueryClient();

  const { data: events = [] } = useQuery(eventsQuery);
  const { data: schedules = [] } = useQuery(festivalSchedulesQuery);
  const { data: donations = [] } = useQuery(donationsQuery);
  const { data: announcements = [] } = useQuery(announcementsQuery);
  const { data: gallery = [] } = useQuery(galleryQuery);
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: volunteers = [] } = useQuery(volunteersQuery);
  const { data: memories = [] } = useQuery(memoriesQuery);

  const [activeTab, setActiveTab] = useState(isMiniAdmin ? "schedules" : "memories");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTopStats, setShowTopStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [volSearchQuery, setVolSearchQuery] = useState("");
  const [donSearchQuery, setDonSearchQuery] = useState("");
  const [donStatusTab, setDonStatusTab] = useState<"all" | "pending" | "received" | "rejected">(
    "all",
  );
  const [donSort, setDonSort] = useState<"latest" | "oldest" | "highest" | "lowest">("latest");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");

  const activeTabDetails: Record<string, { label: string; icon: any }> = {
    schedules: { label: "Festival Schedule", icon: Clock },
    events: { label: "Upcoming Events", icon: CalendarDays },
    notices: { label: "Announcements", icon: Radio },
    gallery: { label: "Media Gallery", icon: ImageIcon },
    notifications: { label: "Push Notifications", icon: Bell },
    memories: { label: "Yearly Memories", icon: History },
    donations: { label: "Donations & Receipts", icon: Receipt },
    volunteers: { label: "Registered Forms", icon: Users },
    users: { label: "Users & Roles", icon: UserCheck },
    registrations: { label: "Pass Registrations", icon: Ticket },
    sponsors: { label: "Sponsors", icon: Building2 },
    settings: { label: "Site Settings", icon: Settings },
    "payment-settings": { label: "Payment Settings (UPI)", icon: QrCode },
    "splash-screen": { label: "Splash Screen Manager", icon: Smartphone },
    analytics: { label: "Analytics & Reports", icon: BarChart3 },
  };

  const currentTabInfo = activeTabDetails[activeTab] || {
    label: "Control Center",
    icon: ShieldCheck,
  };

  const { data: userRoles = [] } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) return [];
      return (data ?? []) as unknown as {
        id: string;
        user_id: string;
        role: string;
        created_at: string;
      }[];
    },
  });

  const { data: userProfiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) return [];
      return (data ?? []) as unknown as {
        id: string;
        full_name?: string;
        email?: string;
        phone?: string;
        avatar_url?: string;
        created_at?: string;
      }[];
    },
  });

  const { data: regs = [] } = useQuery({
    queryKey: ["all-registrations"],
    queryFn: async (): Promise<Registration[]> => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Registration[];
    },
  });

  // Fetch all donations (including pending / failed) for admin
  const { data: allDonations = [] } = useQuery({
    queryKey: ["all-donations"],
    queryFn: async (): Promise<Donation[]> => {
      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Donation[];
    },
  });

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Organiser Access Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have administrative access. Ask the secretary to grant permission.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const totalDonated = allDonations
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + Number(d.amount), 0);

  // Volunteers breakdown
  const pendingVolunteers = volunteers.filter((v) => v.status === "pending");
  const approvedVolunteers = volunteers.filter((v) => v.status === "approved");
  const rejectedVolunteers = volunteers.filter((v) => v.status === "rejected");

  const filteredVolunteers = volunteers.filter((v) => {
    const q = volSearchQuery.toLowerCase();
    return (
      v.full_name.toLowerCase().includes(q) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      v.phone.includes(q) ||
      (v.duty && v.duty.toLowerCase().includes(q))
    );
  });

  const filteredDonations = allDonations
    .filter((d) => {
      const statusMatch =
        donStatusTab === "all" ||
        (donStatusTab === "pending" &&
          (d.status === "pending_verification" || d.status === "pending")) ||
        (donStatusTab === "received" && (d.status === "received" || d.status === "approved")) ||
        (donStatusTab === "rejected" && d.status === "rejected");

      if (!statusMatch) return false;

      if (!donSearchQuery.trim()) return true;
      const q = donSearchQuery.toLowerCase();
      return (
        d.donor_name.toLowerCase().includes(q) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.phone && d.phone.toLowerCase().includes(q)) ||
        (d.utr_number && d.utr_number.toLowerCase().includes(q)) ||
        (d.reference_no && d.reference_no.toLowerCase().includes(q)) ||
        (d.payment_id && d.payment_id.toLowerCase().includes(q)) ||
        (d.order_id && d.order_id.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (donSort === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (donSort === "highest") return Number(b.amount) - Number(a.amount);
      if (donSort === "lowest") return Number(a.amount) - Number(b.amount);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const exportDonationsCSV = () => {
    const headers = [
      "Reference No",
      "Donor Name",
      "Email",
      "Phone",
      "Amount (INR)",
      "UTR / Payment ID",
      "Status",
      "Submitted Date",
      "Admin Notes",
    ];
    const rows = filteredDonations.map((d) => [
      d.reference_no || d.id,
      `"${d.donor_name.replace(/"/g, '""')}"`,
      d.email || "",
      d.phone || "",
      d.amount,
      d.utr_number || d.payment_id || "",
      d.status,
      new Date(d.created_at).toISOString(),
      `"${(d.admin_notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Ganapathi_Donations_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRegs = regs.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.pass_code.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.events?.name.toLowerCase().includes(q)
    );
  });

  const chartData = events.map((e) => ({
    name: e.name.split(" ")[0],
    registrations: regs.filter((r) => r.event_id === e.id).length,
  }));

  // Aggregate User Directory
  const usersMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      role: string;
      source: string;
      created_at: string;
    }
  >();

  const emailToKeyMap = new Map<string, string>();

  if (user) {
    usersMap.set(user.id, {
      id: user.id,
      name: user.user_metadata?.full_name || "Admin / Organiser",
      email: user.email || "pavandimpu30@gmail.com",
      phone: user.phone || "-",
      role: "admin",
      source: "Current Staff Session",
      created_at: user.created_at || new Date().toISOString(),
    });
    if (user.email) emailToKeyMap.set(user.email.toLowerCase(), user.id);
  }

  userProfiles.forEach((p) => {
    const existingKey = (p.email && emailToKeyMap.get(p.email.toLowerCase())) || p.id;
    const existing = usersMap.get(existingKey);
    usersMap.set(existingKey, {
      id: existingKey,
      name: p.full_name || existing?.name || "Devotee",
      email: p.email || existing?.email || "-",
      phone: p.phone || existing?.phone || "-",
      role: existing?.role || "user",
      source: "User Profile",
      created_at: p.created_at || existing?.created_at || new Date().toISOString(),
    });
    if (p.email) emailToKeyMap.set(p.email.toLowerCase(), existingKey);
  });

  volunteers.forEach((v) => {
    const matchedKey = (v.email && emailToKeyMap.get(v.email.toLowerCase())) || v.user_id || v.email || v.id;
    const existing = usersMap.get(matchedKey);
    usersMap.set(matchedKey, {
      id: matchedKey,
      name: v.full_name || existing?.name || "Volunteer Candidate",
      email: v.email || existing?.email || "-",
      phone: v.phone || existing?.phone || "-",
      role: existing?.role || (v.status === "approved" ? "volunteer" : "user"),
      source: "Volunteer Application",
      created_at: v.created_at || existing?.created_at || new Date().toISOString(),
    });
    if (v.email) emailToKeyMap.set(v.email.toLowerCase(), matchedKey);
  });

  regs.forEach((r) => {
    const matchedKey = (r.email && emailToKeyMap.get(r.email.toLowerCase())) || r.user_id || r.email || r.id;
    const existing = usersMap.get(matchedKey);
    usersMap.set(matchedKey, {
      id: matchedKey,
      name: r.full_name || existing?.name || "Pass Registrant",
      email: r.email || existing?.email || "-",
      phone: r.phone || existing?.phone || "-",
      role: existing?.role || "user",
      source: "Pass Registration",
      created_at: r.created_at || existing?.created_at || new Date().toISOString(),
    });
    if (r.email) emailToKeyMap.set(r.email.toLowerCase(), matchedKey);
  });

  allDonations.forEach((d) => {
    if (!d.email && !d.user_id) return;
    const matchedKey = (d.email && emailToKeyMap.get(d.email.toLowerCase())) || d.user_id || d.email || d.id;
    const existing = usersMap.get(matchedKey);
    usersMap.set(matchedKey, {
      id: matchedKey,
      name: d.donor_name || existing?.name || "Donor",
      email: d.email || existing?.email || "-",
      phone: d.phone || existing?.phone || "-",
      role: existing?.role || "user",
      source: "Donation Entry",
      created_at: d.created_at || existing?.created_at || new Date().toISOString(),
    });
    if (d.email) emailToKeyMap.set(d.email.toLowerCase(), matchedKey);
  });

  userRoles.forEach((ur) => {
    let existing = usersMap.get(ur.user_id);
    if (!existing) {
      for (const u of usersMap.values()) {
        if (
          u.id === ur.user_id ||
          (u.email &&
            u.email !== "-" &&
            userProfiles.some((p) => p.id === ur.user_id && p.email?.toLowerCase() === u.email.toLowerCase()))
        ) {
          existing = u;
          break;
        }
      }
    }

    if (existing) {
      existing.role = ur.role;
    } else {
      const p = userProfiles.find((prof) => prof.id === ur.user_id);
      usersMap.set(ur.user_id, {
        id: ur.user_id,
        name: p?.full_name || "System Staff User",
        email: p?.email || "-",
        phone: p?.phone || "-",
        role: ur.role,
        source: "User Roles Registry",
        created_at: ur.created_at || new Date().toISOString(),
      });
    }
  });

  const allUsersList = Array.from(usersMap.values());

  const filteredUsersList = allUsersList.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.source.toLowerCase().includes(q);
    const matchesRole = selectedRoleFilter === "all" || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Action to change or assign role
  const changeUserRole = async (targetUserId: string, newRole: string, targetEmail?: string) => {
    const { stringToUuid } = await import("@/hooks/use-session");
    const validUuid = stringToUuid(targetUserId);

    let actualAuthId = targetUserId;
    const searchEmail = targetEmail || (targetUserId.includes("@") ? targetUserId : undefined);

    if (searchEmail) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", searchEmail)
        .maybeSingle();
      if (prof?.id) {
        actualAuthId = prof.id;
      }
    }

    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const idsToUpdate = Array.from(
      new Set(
        [
          targetUserId,
          validUuid,
          actualAuthId,
          searchEmail ? stringToUuid(searchEmail) : "",
        ].filter((x): x is string => Boolean(x) && isUuid(x)),
      ),
    );

    // Delete existing role records by raw ID, UUID, and profile auth ID
    for (const id of idsToUpdate) {
      await supabase.from("user_roles").delete().eq("user_id", id);
    }

    const rowsToInsert = idsToUpdate.map((id) => ({
      user_id: id,
      role: newRole as any,
    }));

    const { error } = await supabase
      .from("user_roles")
      .upsert(rowsToInsert, { onConflict: "user_id,role" });

    if (error) {
      return toast.error(error.message);
    }
    toast.success(`Role updated to "${newRole.toUpperCase().replace("_", " ")}"!`);
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    qc.invalidateQueries({ queryKey: ["user_roles"] });
    qc.invalidateQueries({ queryKey: ["volunteers"] });
  };

  // Memory Actions
  const deleteMemory = async (id: string) => {
    if (!confirm("Delete this yearly memory card?")) return;
    const { error } = await supabase.from("festival_memories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Memory card deleted");
    qc.invalidateQueries({ queryKey: ["festival-memories"] });
  };

  // Registration Actions
  const toggleAttendance = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("registrations")
      .update({
        attended: !current,
        attended_at: !current ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(current ? "Attendance revoked" : "Attendance marked!");
    qc.invalidateQueries({ queryKey: ["all-registrations"] });
  };

  const deleteRegistration = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this registration?")) return;
    const { error } = await supabase.from("registrations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Registration removed");
    qc.invalidateQueries({ queryKey: ["all-registrations"] });
  };

  // Donation Actions
  const approveDonation = async (d: Donation) => {
    const { error } = await supabase
      .from("donations")
      .update({ status: "approved" })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(`Donation approved for ${d.donor_name}!`);
    qc.invalidateQueries({ queryKey: ["all-donations"] });
    qc.invalidateQueries({ queryKey: ["donations"] });

    if (d.email) {
      sendDonationReceiptEmail({
        toEmail: d.email,
        donorName: d.donor_name,
        amount: Number(d.amount),
        paymentId: d.payment_id || `OFFLINE_${Date.now()}`,
        date: new Date(d.created_at).toLocaleString("en-IN"),
      });
    }
  };

  const deleteDonation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this donation record?")) return;
    const { error } = await supabase.from("donations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Donation record removed");
    qc.invalidateQueries({ queryKey: ["all-donations"] });
    qc.invalidateQueries({ queryKey: ["donations"] });
  };

  // Volunteer Actions
  const approveVolunteer = async (app: VolunteerApplication) => {
    const { error } = await supabase
      .from("volunteers")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.email || "Admin",
      })
      .eq("id", app.id);

    if (error) return toast.error(error.message);

    // Automatically grant 'volunteer' role in user_roles for the user
    const { stringToUuid } = await import("@/hooks/use-session");
    const targetEmail = app.email;
    let actualAuthId = app.user_id;

    if (targetEmail) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", targetEmail)
        .maybeSingle();
      if (prof?.id) {
        actualAuthId = prof.id;
      }
    }

    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const idsToGrant = Array.from(
      new Set(
        [
          actualAuthId,
          app.user_id,
          stringToUuid(app.user_id),
          targetEmail ? stringToUuid(targetEmail) : "",
        ].filter((x): x is string => Boolean(x) && isUuid(x)),
      ),
    );

    for (const id of idsToGrant) {
      await supabase
        .from("user_roles")
        .upsert({ user_id: id, role: "volunteer" }, { onConflict: "user_id,role" });
    }

    toast.success(`Approved ${app.full_name} as active volunteer!`);
    qc.invalidateQueries({ queryKey: ["volunteers"] });
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
    qc.invalidateQueries({ queryKey: ["user_roles"] });

    if (app.email) {
      sendVolunteerApprovedEmail({ toEmail: app.email, recipientName: app.full_name });
    }
  };

  const rejectVolunteer = async (app: VolunteerApplication) => {
    const { error } = await supabase
      .from("volunteers")
      .update({
        status: "rejected",
      })
      .eq("id", app.id);

    if (error) return toast.error(error.message);

    toast.success(`Updated status for ${app.full_name}`);
    qc.invalidateQueries({ queryKey: ["volunteers"] });

    if (app.email) {
      sendVolunteerStatusUpdateEmail({
        toEmail: app.email,
        recipientName: app.full_name,
        status: "rejected",
      });
    }
  };

  const deleteVolunteer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this volunteer application?")) return;
    const { error } = await supabase.from("volunteers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Volunteer application deleted");
    qc.invalidateQueries({ queryKey: ["volunteers"] });
  };

  // Item Deletion Actions
  const deleteNotice = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Notice deleted");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const toggleNoticePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_pinned: !currentPinned })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(currentPinned ? "Notice unpinned" : "Notice pinned");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Delete this schedule item?")) return;
    const { error } = await (supabase.from as any)("festival_schedules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Schedule item deleted");
    qc.invalidateQueries({ queryKey: ["festival-schedules"] });
  };

  const toggleSchedulePublish = async (id: string, currentPublished: boolean) => {
    const { error } = await (supabase.from as any)("festival_schedules")
      .update({ is_published: !currentPublished })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(currentPublished ? "Schedule item hidden" : "Schedule item published live!");
    qc.invalidateQueries({ queryKey: ["festival-schedules"] });
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event? All associated data will be removed.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const deleteSponsor = async (id: string) => {
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Sponsor removed");
    qc.invalidateQueries({ queryKey: ["sponsors"] });
  };

  const deleteGalleryItem = async (id: string) => {
    const { error } = await supabase.from("gallery_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gallery photo removed");
    qc.invalidateQueries({ queryKey: ["gallery"] });
  };

  const renderNavContent = () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Management Menu
        </p>
        {isMiniAdmin && (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-amber-500 text-amber-600 font-bold"
          >
            Mini Admin
          </Badge>
        )}
      </div>
      <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 w-full text-left">
        {/* Allowed for Mini Admin: Schedules, Events, Notices, Gallery */}
        <TabsTrigger
          value="schedules"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-500" /> Festival Schedule
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
            {schedules.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="events"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4" /> Upcoming Events
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
            {events.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="notices"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <Radio className="h-4 w-4" /> Announcements
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
            {announcements.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="gallery"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <ImageIcon className="h-4 w-4" /> Media Gallery
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
            {gallery.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="notifications"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 text-amber-500" /> Push Notifications
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 font-bold border-amber-500 text-amber-600"
          >
            OneSignal
          </Badge>
        </TabsTrigger>
        <TabsTrigger
          value="splash-screen"
          className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
        >
          <span className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-amber-500" /> Splash Screen
          </span>
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 font-bold border-amber-500 text-amber-600"
          >
            App
          </Badge>
        </TabsTrigger>

        {/* Full Admin Sections */}
        {(!isMiniAdmin || isFullAdmin) && (
          <>
            <div className="pt-2 pb-1 px-3 border-t border-border/40 mt-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Executive & Financials
              </p>
            </div>
            <TabsTrigger
              value="memories"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <History className="h-4 w-4" /> Yearly Memories
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                {memories.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="donations"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Receipt className="h-4 w-4" /> Donations & Receipts
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                {allDonations.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="volunteers"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Users className="h-4 w-4" /> Registered Forms
              </span>
              {pendingVolunteers.length > 0 ? (
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-bold animate-pulse">
                  {pendingVolunteers.length} New
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                  {volunteers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4" /> Users & Roles
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                {allUsersList.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="registrations"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Ticket className="h-4 w-4" /> Pass Registrations
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                {regs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="sponsors"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4" /> Sponsors
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">
                {sponsors.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Settings className="h-4 w-4" /> Site Settings
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="payment-settings"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <QrCode className="h-4 w-4 text-amber-500" /> Payment Settings (UPI)
              </span>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 font-bold border-amber-500 text-amber-600"
              >
                UPI
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all"
            >
              <span className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4" /> Analytics & Reports
              </span>
            </TabsTrigger>
          </>
        )}
      </TabsList>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* NGX-Style Layout: Left Sidebar + Main Workspace */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setMobileMenuOpen(false);
        }}
        className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]"
      >
        {/* Mobile Header Bar with Left Drawer Trigger (Mobile Only < lg) */}
        <div className="lg:hidden sticky top-14 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/95 p-3 px-4 backdrop-blur shadow-xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-primary/30 bg-primary/5 text-primary font-bold hover:bg-primary/10 shrink-0"
                >
                  <PanelLeft className="h-4 w-4" />
                  <span>Admin Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[85%] max-w-xs p-0 bg-card border-r border-border flex flex-col h-full"
              >
                <SheetHeader className="p-4 border-b border-border bg-muted/30 shrink-0 text-left">
                  <SheetTitle className="text-left flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl gradient-saffron text-primary-foreground shadow-warm shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-display text-base font-bold block truncate">
                        Control Center
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isMiniAdmin ? "Mini Admin Mode" : "Realtime Active"}
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="p-4 flex-1 overflow-y-auto space-y-4">{renderNavContent()}</div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Active View
              </p>
              <div className="font-display text-xs font-bold truncate text-foreground flex items-center gap-1.5">
                {currentTabInfo.icon && (
                  <currentTabInfo.icon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className="truncate">{currentTabInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left Sidebar Navigation Panel (Desktop Only >= lg) */}
        <aside className="hidden lg:block w-72 shrink-0 bg-card border-r border-border p-6 space-y-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-warm shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold truncate">Control Center</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {isMiniAdmin ? "Mini Admin Mode" : "Realtime Active"}
              </div>
            </div>
          </div>

          {renderNavContent()}
        </aside>

        {/* Right Main Workspace Area */}
        <main className="flex-1 p-4 lg:p-8 space-y-6">
          {/* Top Overview Stat Cards (Collapsible) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTopStats(!showTopStats)}
                className="h-8 gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-card border-border/60"
              >
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                <span>{showTopStats ? "Hide Summary Stats" : "Show Summary Stats"}</span>
                {showTopStats ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {showTopStats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in-50 duration-200">
                <Stat icon={CalendarDays} label="Events" value={String(events.length)} />
                <Stat icon={Ticket} label="Registrations" value={String(regs.length)} />
                <Stat
                  icon={Users}
                  label="Volunteer Applications"
                  value={String(volunteers.length)}
                  badge={
                    pendingVolunteers.length > 0 ? `${pendingVolunteers.length} Pending` : undefined
                  }
                />
                <Stat
                  icon={HandHeart}
                  label="Donations Collected"
                  value={formatCurrency(totalDonated)}
                />
              </div>
            )}
          </div>

          {/* PUSH NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="m-0 space-y-6">
            <PushNotificationAdminTab userId={user?.id} />
          </TabsContent>

          {/* 1. MEMORIES TAB */}
          <TabsContent value="memories" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">
                  Yearly Memories & Heritage Timeline
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manage year-wise cards, cover banners, descriptions, and photo archives.
                </p>
              </div>
              <EditMemoryModal
                onSave={() => qc.invalidateQueries({ queryKey: ["festival-memories"] })}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[...memories]
                .sort((a, b) => a.year - b.year || (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((m) => (
                <div
                  key={m.id}
                  className="card-premium flex flex-col justify-between overflow-hidden p-0 group"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    <img
                      src={m.cover_image_url}
                      alt={m.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <Badge className="rounded-full gradient-saffron text-primary-foreground font-bold px-3 py-1">
                        {m.year}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <EditMemoryModal
                        memory={m}
                        onSave={() => qc.invalidateQueries({ queryKey: ["festival-memories"] })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-destructive"
                        onClick={() => deleteMemory(m.id)}
                        title="Delete memory"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-display text-xl font-bold">{m.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {m.description}
                    </p>

                    <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3 text-xs">
                      <span className="text-muted-foreground font-mono">Order: {m.sort_order}</span>
                    </div>
                  </div>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="col-span-2 card-premium p-12 text-center text-muted-foreground">
                  No memories added yet. Click "Add Yearly Memory" above.
                </div>
              )}
            </div>
          </TabsContent>

          {/* 2. DONATIONS & RECEIPTS TAB */}
          <TabsContent value="donations" className="m-0 space-y-6">
            {/* Stat Cards Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Collection
                </p>
                <p className="font-display text-xl font-extrabold text-primary mt-1">
                  {formatCurrency(totalDonated)}
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pending Verification
                </p>
                <p className="font-display text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {
                    allDonations.filter(
                      (d) => d.status === "pending_verification" || d.status === "pending",
                    ).length
                  }
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Verified &amp; Received
                </p>
                <p className="font-display text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {
                    allDonations.filter((d) => d.status === "received" || d.status === "approved")
                      .length
                  }
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Rejected Submissions
                </p>
                <p className="font-display text-xl font-extrabold text-destructive mt-1">
                  {allDonations.filter((d) => d.status === "rejected").length}
                </p>
              </div>
              <div className="card-premium p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Submissions
                </p>
                <p className="font-display text-xl font-extrabold text-foreground mt-1">
                  {allDonations.length}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 border border-border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 rounded-xl bg-secondary p-1 border border-border text-xs font-medium">
                  {(["all", "pending", "received", "rejected"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDonStatusTab(tab)}
                      className={`rounded-lg px-3 py-1.5 capitalize transition-all font-semibold ${
                        donStatusTab === tab
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "pending"
                        ? "Pending Verification"
                        : tab === "received"
                          ? "Verified & Received"
                          : tab}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-xs font-bold gap-1.5"
                    onClick={exportDonationsCSV}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
                  </Button>
                  <AddOfflineDonationModal
                    onAdded={() => {
                      qc.invalidateQueries({ queryKey: ["all-donations"] });
                      qc.invalidateQueries({ queryKey: ["donations"] });
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60">
                <div className="relative flex-1 min-w-60">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Name, Email, Phone, UTR, Ref #..."
                    value={donSearchQuery}
                    onChange={(e) => setDonSearchQuery(e.target.value)}
                    className="pl-9 rounded-2xl text-xs"
                  />
                </div>

                <select
                  value={donSort}
                  onChange={(e) => setDonSort(e.target.value as any)}
                  className="rounded-2xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                >
                  <option value="latest">Latest Submissions</option>
                  <option value="oldest">Oldest Submissions</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>

                <span className="text-xs text-muted-foreground font-semibold">
                  Showing {filteredDonations.length} of {allDonations.length} records
                </span>
              </div>
            </div>

            {/* Table View */}
            <div className="card-premium overflow-x-auto p-0 scroll-touch">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-4">Reference &amp; Donor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Contact Details</th>
                    <th className="p-4">UTR / Payment ID</th>
                    <th className="p-4">Proof</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map((d) => (
                    <tr
                      key={d.id}
                      className="border-t border-border/60 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="p-4 font-semibold text-foreground">
                        <div className="font-mono text-[11px] font-bold text-primary">
                          #{d.reference_no || d.id.slice(0, 8)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold">{d.donor_name}</span>
                          {d.is_anonymous && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-[9px] text-muted-foreground"
                            >
                              Anon
                            </Badge>
                          )}
                        </div>
                        {d.message && (
                          <div className="text-[11px] text-muted-foreground italic truncate max-w-xs">
                            {d.message}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-extrabold text-primary text-sm">
                        {formatCurrency(Number(d.amount))}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">{d.phone || "No phone"}</div>
                        <div className="text-muted-foreground">{d.email || "No email"}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-xs">
                        {d.utr_number ? (
                          <span className="text-foreground bg-secondary px-2 py-0.5 rounded-lg border">
                            {d.utr_number}
                          </span>
                        ) : d.payment_id ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {d.payment_id}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">Offline Entry</span>
                        )}
                      </td>
                      <td className="p-4">
                        {d.screenshot_url ? (
                          <a
                            href={d.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            <ImageIcon className="h-3.5 w-3.5" /> View Proof
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">No image</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        <DonationStatusBadge status={d.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AdminVerifyDonationModal
                            d={d}
                            onAction={() => {
                              qc.invalidateQueries({ queryKey: ["all-donations"] });
                              qc.invalidateQueries({ queryKey: ["donations"] });
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => deleteDonation(d.id)}
                            title="Delete record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDonations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No donation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 3. VOLUNTEER REGISTERED FORMS TAB */}
          <TabsContent value="volunteers" className="m-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Volunteer Registration Forms</h2>
                <p className="text-xs text-muted-foreground">
                  Review applications, assign events/roles, approve active volunteers, or reject
                  forms.
                </p>
              </div>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search volunteer name, email, phone or duty..."
                  value={volSearchQuery}
                  onChange={(e) => setVolSearchQuery(e.target.value)}
                  className="pl-9 rounded-2xl text-xs"
                />
              </div>
            </div>

            <div className="card-premium overflow-x-auto p-0 scroll-touch">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-4">Applicant Name</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Preferred Seva</th>
                    <th className="p-4">Date Submitted</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((app) => (
                    <tr
                      key={app.id}
                      className="border-t border-border/60 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="p-4 font-semibold text-foreground">
                        <div>{app.full_name}</div>
                        {app.address && (
                          <div className="text-[11px] text-muted-foreground font-normal">
                            {app.address}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold">{app.phone}</div>
                        <div className="text-muted-foreground">{app.email || "No email"}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="rounded-full font-semibold">
                          {app.duty || "General Seva"}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(app.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        <VolStatusBadge status={app.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ViewVolunteerModal app={app} events={events} />
                          {app.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                              onClick={() => approveVolunteer(app)}
                            >
                              Approve
                            </Button>
                          )}
                          {app.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full text-xs px-3 text-destructive border-destructive/40 hover:bg-destructive/10"
                              onClick={() => rejectVolunteer(app)}
                            >
                              Reject
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => deleteVolunteer(app.id)}
                            title="Delete application"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVolunteers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No volunteer applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* USER DIRECTORY & ROLES MANAGEMENT TAB */}
          <TabsContent value="users" className="m-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" /> User Directory & Role Control
                </h2>
                <p className="text-xs text-muted-foreground">
                  View all registered users, volunteers, organizers, and manage system roles in
                  real-time.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-xl bg-secondary p-1 border border-border text-xs font-medium">
                  {["all", "admin", "organizer", "mini_admin", "volunteer", "user"].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRoleFilter(role)}
                      className={`rounded-lg px-3 py-1 capitalize transition-all ${
                        selectedRoleFilter === role
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role === "mini_admin" ? "Mini Admin" : role}
                    </button>
                  ))}
                </div>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search user name, email, role..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 rounded-2xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="card-premium p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Registered Users
                  </p>
                  <p className="text-xl font-extrabold">{allUsersList.length}</p>
                </div>
                <Users className="h-6 w-6 text-primary opacity-80" />
              </div>
              <div className="card-premium p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Admins & Organisers
                  </p>
                  <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {
                      allUsersList.filter((u) => u.role === "admin" || u.role === "organizer")
                        .length
                    }
                  </p>
                </div>
                <ShieldCheck className="h-6 w-6 text-amber-500 opacity-80" />
              </div>
              <div className="card-premium p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mini Admins
                  </p>
                  <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                    {allUsersList.filter((u) => u.role === "mini_admin").length}
                  </p>
                </div>
                <Sliders className="h-6 w-6 text-blue-500 opacity-80" />
              </div>
              <div className="card-premium p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Volunteers
                  </p>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {allUsersList.filter((u) => u.role === "volunteer").length}
                  </p>
                </div>
                <UserCheck className="h-6 w-6 text-emerald-500 opacity-80" />
              </div>
            </div>

            {/* Active Control & Staff Roster (Admins & Mini Admins) */}
            {allUsersList.some(
              (u) => u.role === "admin" || u.role === "organizer" || u.role === "mini_admin",
            ) && (
              <div className="card-premium p-5 space-y-3 bg-gradient-to-r from-amber-500/5 via-primary/5 to-blue-500/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Active Management Roster
                    (Admins & Mini Admins)
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-primary/40 text-primary"
                  >
                    {
                      allUsersList.filter(
                        (u) =>
                          u.role === "admin" || u.role === "organizer" || u.role === "mini_admin",
                      ).length
                    }{" "}
                    Active Leaders
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                  {allUsersList
                    .filter(
                      (u) =>
                        u.role === "admin" || u.role === "organizer" || u.role === "mini_admin",
                    )
                    .map((staff) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 border border-border/80 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold text-xs uppercase ${
                              staff.role === "admin"
                                ? "gradient-saffron text-primary-foreground"
                                : staff.role === "mini_admin"
                                  ? "bg-blue-600 text-white"
                                  : "bg-purple-600 text-white"
                            }`}
                          >
                            {staff.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{staff.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {staff.email !== "-" ? staff.email : staff.phone}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                            staff.role === "admin"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                              : staff.role === "mini_admin"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40"
                                : "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40"
                          }`}
                        >
                          {staff.role === "mini_admin" ? "Mini Admin" : staff.role}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="card-premium overflow-x-auto p-0 scroll-touch">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-4">User Details</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Source System</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4 text-right">Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-border/60 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full gradient-saffron text-primary-foreground font-bold text-xs uppercase shrink-0">
                            {u.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{u.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate max-w-xs">
                              {u.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{u.email}</div>
                        <div className="text-muted-foreground text-[11px]">{u.phone}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="rounded-full text-[10px] font-medium">
                          {u.source}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                            u.role === "admin"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : u.role === "organizer"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                : u.role === "mini_admin"
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                  : u.role === "volunteer"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-secondary text-muted-foreground border border-border"
                          }`}
                        >
                          {u.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                          {u.role === "mini_admin" && <Sliders className="h-3 w-3" />}
                          {u.role === "volunteer" && <UserCheck className="h-3 w-3" />}
                          {u.role === "mini_admin" ? "Mini Admin" : u.role}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => changeUserRole(u.id, e.target.value, u.email)}
                          className="rounded-xl border border-input bg-background px-2.5 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="user">User (Devotee)</option>
                          <option value="volunteer">Volunteer</option>
                          <option value="mini_admin">Mini Admin (Content Manager)</option>
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredUsersList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No users found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* FESTIVAL SCHEDULE MANAGEMENT TAB */}
          <TabsContent value="schedules" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Festival Schedule Manager</h2>
                <p className="text-xs text-muted-foreground">
                  Manage daily festival rituals, aartis, mahaprasadam, and processions (dedicated
                  festival_schedules module).
                </p>
              </div>
              <EditScheduleModal
                onSave={() => qc.invalidateQueries({ queryKey: ["festival-schedules"] })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.map((s) => (
                <div key={s.id} className="card-premium flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="rounded-full capitalize gradient-saffron text-primary-foreground font-bold">
                        {s.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <EditScheduleModal
                          schedule={s}
                          onSave={() => qc.invalidateQueries({ queryKey: ["festival-schedules"] })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSchedule(s.id)}
                          title="Delete schedule item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                    {s.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <dl className="mt-3 grid gap-1.5 text-xs text-foreground/80">
                      <div>
                        📅 {formatEventDate(s.schedule_date)} from {s.start_time}
                        {s.end_time ? ` to ${s.end_time}` : ""}
                      </div>
                      <div>📍 {s.venue}</div>
                    </dl>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                    <Badge
                      variant={s.is_published !== false ? "default" : "secondary"}
                      className="rounded-full font-semibold"
                    >
                      {s.is_published !== false ? "Published Live" : "Hidden"}
                    </Badge>
                    <Button
                      size="sm"
                      variant={s.is_published !== false ? "default" : "outline"}
                      className="rounded-full text-xs font-bold"
                      onClick={() => toggleSchedulePublish(s.id, s.is_published !== false)}
                    >
                      {s.is_published !== false ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="col-span-3 card-premium p-12 text-center text-muted-foreground">
                  No schedule items found. Click "Add Schedule Item" above.
                </div>
              )}
            </div>
          </TabsContent>

          {/* UPCOMING EVENTS & COMPETITIONS MANAGEMENT TAB */}
          <TabsContent value="events" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Editable Festival Events</h2>
                <p className="text-xs text-muted-foreground">
                  Add new events, edit rules, times, venues, and toggle registration status live.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <QRScannerModal />
                <EditEventModal onSave={() => qc.invalidateQueries({ queryKey: ["events"] })} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <div key={e.id} className="card-premium flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="rounded-full capitalize gradient-saffron text-primary-foreground font-bold">
                        {e.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <EditEventModal
                          event={e}
                          onSave={() => qc.invalidateQueries({ queryKey: ["events"] })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => deleteEvent(e.id)}
                          title="Delete event"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{e.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {e.description}
                    </p>
                    <dl className="mt-3 grid gap-1.5 text-xs text-foreground/80">
                      <div>
                        📅 {formatEventDate(e.event_date)} at {e.start_time}
                      </div>
                      <div>📍 {e.venue}</div>
                      <div>💰 Entry: {e.entry_fee > 0 ? formatCurrency(e.entry_fee) : "Free"}</div>
                    </dl>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                    <Badge variant="outline" className="rounded-full font-semibold">
                      {regs.filter((r) => r.event_id === e.id).length}/{e.max_participants} Regs
                    </Badge>
                    <Button
                      size="sm"
                      variant={e.registration_open ? "default" : "outline"}
                      className="rounded-full text-xs font-bold"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("events")
                          .update({ registration_open: !e.registration_open })
                          .eq("id", e.id);
                        if (error) return toast.error(error.message);
                        toast.success(
                          e.registration_open ? "Registrations closed" : "Registrations opened",
                        );
                        qc.invalidateQueries({ queryKey: ["events"] });
                      }}
                    >
                      {e.registration_open ? "Close Reg" : "Open Reg"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 5. NOTICES & ANNOUNCEMENTS TAB */}
          <TabsContent value="notices" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full gradient-saffron text-primary-foreground font-bold text-[10px]">
                    Live Ticker Control
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({announcements.length} Active Lines)
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold mt-1">
                  Live Announcement Ticker Management
                </h2>
                <p className="text-xs text-muted-foreground">
                  Add, edit, pin, or remove scrolling ticker lines. Changes appear live immediately
                  across the site.
                </p>
              </div>
              <EditNoticeModal
                onSave={() => qc.invalidateQueries({ queryKey: ["announcements"] })}
              />
            </div>

            {/* Quick Add Ticker Line Card */}
            <div className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" /> Quick Add New Ticker Line
                </h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ⚡ Updates Live Ticker Instantly
                </span>
              </div>
              <QuickAddTickerForm
                onAdded={() => qc.invalidateQueries({ queryKey: ["announcements"] })}
              />
            </div>

            {/* Live Ticker Preview */}
            {announcements.length > 0 && (
              <div className="rounded-2xl border border-primary/30 overflow-hidden bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-primary" /> Current Live Ticker
                  Preview:
                </p>
                <div className="overflow-hidden rounded-xl gradient-temple py-2.5 px-4 shadow-inner">
                  <div className="flex items-center gap-6 whitespace-nowrap text-xs font-medium text-temple-foreground">
                    {announcements.map((a, i) => (
                      <span key={a.id} className="flex items-center gap-2">
                        <Megaphone className="h-3.5 w-3.5" /> <strong>{a.title}:</strong>{" "}
                        {a.message}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ticker Items Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="card-premium flex flex-col justify-between p-5 hover:border-primary/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={a.type === "urgent" ? "destructive" : "secondary"}
                          className="rounded-full capitalize font-bold text-[10px]"
                        >
                          {a.type}
                        </Badge>
                        {a.is_pinned ? (
                          <Badge
                            variant="outline"
                            className="rounded-full text-primary border-primary font-bold text-[10px]"
                          >
                            📌 Pinned to Ticker
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-full text-muted-foreground text-[10px]"
                          >
                            Standard Ticker Line
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <EditNoticeModal
                          notice={a}
                          onSave={() => qc.invalidateQueries({ queryKey: ["announcements"] })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 rounded-full ${a.is_pinned ? "text-primary bg-primary/10" : ""}`}
                          onClick={() => toggleNoticePin(a.id, a.is_pinned)}
                          title={a.is_pinned ? "Unpin line" : "Pin line to top"}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => deleteNotice(a.id)}
                          title="Remove ticker line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-display text-base font-bold">{a.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {a.message}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                    <span className="font-mono">
                      Posted {new Date(a.created_at).toLocaleString("en-IN")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] font-semibold text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() => deleteNotice(a.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Remove Line
                    </Button>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="col-span-2 card-premium p-12 text-center text-muted-foreground">
                  No active ticker lines. Use the form above to add a new ticker line.
                </div>
              )}
            </div>
          </TabsContent>

          {/* 6. PASS REGISTRATIONS TAB */}
          <TabsContent value="registrations" className="m-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pass ID, name, phone or event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-2xl text-xs"
                />
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                Showing {filteredRegs.length} of {regs.length} registrations
              </span>
            </div>

            <div className="card-premium overflow-x-auto p-0 scroll-touch">
              <table className="w-full min-w-[600px] text-xs">
                <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-4">Pass ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Event</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-border/60 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs font-bold text-primary">
                        {r.pass_code}
                      </td>
                      <td className="p-4 font-semibold text-foreground">{r.full_name}</td>
                      <td className="p-4 font-medium">{r.events?.name}</td>
                      <td className="p-4 text-muted-foreground">{r.phone}</td>
                      <td className="p-4">
                        <Badge
                          variant={r.attended ? "default" : "secondary"}
                          className="rounded-full font-semibold"
                        >
                          {r.attended ? "Attended" : r.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant={r.attended ? "outline" : "default"}
                            className="rounded-full text-xs font-semibold"
                            onClick={() => toggleAttendance(r.id, r.attended)}
                          >
                            {r.attended ? "Revoke" : "Mark Attended"}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                            onClick={() => deleteRegistration(r.id)}
                            title="Delete pass"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 7. SPONSORS MANAGEMENT TAB */}
          <TabsContent value="sponsors" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Manage Sponsors</h2>
                <p className="text-xs text-muted-foreground">
                  Sponsor logos and tier badges displayed on home and sponsors page.
                </p>
              </div>
              <EditSponsorModal onSave={() => qc.invalidateQueries({ queryKey: ["sponsors"] })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((s) => (
                <div key={s.id} className="card-premium flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge className="rounded-full capitalize font-bold gradient-saffron text-primary-foreground">
                        {s.tier}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <EditSponsorModal
                          sponsor={s}
                          onSave={() => qc.invalidateQueries({ queryKey: ["sponsors"] })}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSponsor(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{s.name}</h3>
                    {s.website && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{s.website}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 8. GALLERY & MEDIA TAB */}
          <TabsContent value="gallery" className="m-0 space-y-6">
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-bold">
                Upload Gallery Media (Auto WebP Images & Videos) 📷 🎥
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Publish high-resolution festival photos with auto-WebP compression, or upload/embed
                festival videos.
              </p>
              <div className="mt-4">
                <AddGalleryItemForm
                  onUploaded={() => qc.invalidateQueries({ queryKey: ["gallery"] })}
                />
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="font-display font-bold">Existing Gallery Media ({gallery.length})</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {gallery.map((item) => {
                  const isVideo = item.media_type === "video";
                  const displayImg = getGalleryThumbnail(item);
                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-card"
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-stone-950">
                        <img
                          src={displayImg}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/40">
                          {isVideo ? "VIDEO 🎥" : "PHOTO 📷"}
                        </div>
                      </div>
                      <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-90 sm:opacity-0 transition-opacity group-hover:opacity-100">
                        <EditGalleryItemModal
                          item={item}
                          onSave={() => qc.invalidateQueries({ queryKey: ["gallery"] })}
                        />
                        <button
                          onClick={() => deleteGalleryItem(item.id)}
                          className="rounded-full bg-destructive p-1.5 text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-md"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="truncate p-2 text-xs font-semibold">{item.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* 9. SITE SETTINGS TAB */}
          <TabsContent value="settings" className="m-0 space-y-6">
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-bold">Site Configuration & Details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Edit festival dates, live stream URL, donation goal, UPI details, and contact
                information.
              </p>
              <div className="mt-6">
                <FestivalSettingsForm
                  settings={settings}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["festival-settings"] })}
                />
              </div>
            </div>

            <SplashScreenAdminTab />
          </TabsContent>

          {/* 9B. PAYMENT SETTINGS (MANUAL UPI) TAB */}
          <TabsContent value="payment-settings" className="m-0">
            <PaymentSettingsTab />
          </TabsContent>

          {/* 9C. SPLASH SCREEN TAB */}
          <TabsContent value="splash-screen" className="m-0">
            <SplashScreenAdminTab />
          </TabsContent>

          {/* 10. ANALYTICS TAB */}
          <TabsContent value="analytics" className="m-0">
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-bold">Event Registrations Overview Chart</h2>
              <div className="mt-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "var(--color-muted)" }} />
                    <Bar
                      dataKey="registrations"
                      fill="var(--color-primary)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

function DonationStatusBadge({ status }: { status: string }) {
  if (status === "received" || status === "approved") {
    return (
      <Badge className="rounded-full bg-emerald-600 text-white font-bold gap-1 text-[10px]">
        <CheckCircle2 className="h-3 w-3" /> Verified &amp; Received
      </Badge>
    );
  }
  if (status === "rejected" || status === "failed") {
    return (
      <Badge variant="destructive" className="rounded-full gap-1 font-bold text-[10px]">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400 gap-1 font-bold text-[10px]">
      <Clock className="h-3 w-3" /> Pending Verification
    </Badge>
  );
}

function AdminVerifyDonationModal({ d, onAction }: { d: Donation; onAction: () => void }) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(d.admin_notes || "");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("donations")
        .update({
          status: "received",
          admin_notes: notes.trim() || "Verified by admin",
          verified_at: new Date().toISOString(),
          verified_by: user?.id || null,
        } as any)
        .eq("id", d.id);

      if (error) {
        toast.error(`Verification error: ${error.message}`);
      } else {
        toast.success(`Donation #${d.reference_no || d.id} marked as Received & Verified!`);
        if (d.email) {
          sendDonationReceiptEmail({
            toEmail: d.email,
            donorName: d.donor_name,
            amount: Number(d.amount),
            paymentId: d.payment_id || d.utr_number || d.id,
            date: new Date().toLocaleString("en-IN"),
          });
        }
        setOpen(false);
        onAction();
      }
    } catch (err: any) {
      toast.error(err.message || "Error verifying payment");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error("Please add internal notes explaining why the payment was rejected.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from("donations")
        .update({
          status: "rejected",
          admin_notes: notes.trim(),
        } as any)
        .eq("id", d.id);

      if (error) {
        toast.error(`Rejection error: ${error.message}`);
      } else {
        toast.success(`Donation #${d.reference_no || d.id} marked as Rejected.`);
        setOpen(false);
        onAction();
      }
    } catch (err: any) {
      toast.error(err.message || "Error rejecting payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full text-xs font-bold gap-1">
          <Eye className="h-3.5 w-3.5" /> Review / Verify
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6 rounded-3xl space-y-4">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify Donation Payment Proof
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3 border">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Reference Number
              </p>
              <p className="font-mono font-bold text-sm text-primary">#{d.reference_no || d.id}</p>
            </div>
            <DonationStatusBadge status={d.status} />
          </div>

          <div className="space-y-2 rounded-xl border p-3 bg-card">
            <div className="flex justify-between border-b pb-1.5">
              <span className="font-semibold text-muted-foreground">Donor Name:</span>
              <span className="font-bold text-foreground">
                {d.donor_name} {d.is_anonymous && "(Anonymous)"}
              </span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="font-semibold text-muted-foreground">Amount:</span>
              <span className="font-extrabold text-sm text-primary">
                ₹{Number(d.amount).toLocaleString("en-IN")}.00
              </span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="font-semibold text-muted-foreground">UTR / Ref No:</span>
              <span className="font-mono font-bold text-foreground">
                {d.utr_number || d.payment_id || "N/A"}
              </span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="font-semibold text-muted-foreground">Mobile Phone:</span>
              <span className="font-semibold text-foreground">{d.phone || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="font-semibold text-muted-foreground">Email:</span>
              <span className="font-semibold text-foreground">{d.email || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-muted-foreground">Submission Date:</span>
              <span>{new Date(d.created_at).toLocaleString("en-IN")}</span>
            </div>
          </div>

          {d.screenshot_url && (
            <div className="space-y-1.5">
              <p className="font-bold text-muted-foreground">Uploaded Payment Screenshot:</p>
              <a
                href={d.screenshot_url}
                target="_blank"
                rel="noreferrer"
                className="block relative group overflow-hidden rounded-xl border"
              >
                <img
                  src={d.screenshot_url}
                  alt="Payment Proof Screenshot"
                  className="max-h-56 w-full object-contain bg-black/90 p-2"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs transition-opacity">
                  <Eye className="h-4 w-4 mr-1" /> Click to view full image
                </div>
              </a>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="admin_notes_input" className="font-bold">
              Internal Admin Notes / Rejection Reason
            </Label>
            <Textarea
              id="admin_notes_input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified against bank statement OR UTR number incorrect"
              rows={2}
              className="rounded-xl text-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full text-destructive border-destructive/40 hover:bg-destructive/10 font-bold"
              onClick={handleReject}
              disabled={loading}
            >
              Reject Payment
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-warm"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Mark Received"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewDonationReceiptModal({ d }: { d: Donation }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
          title="View receipt details"
        >
          <Receipt className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Official Donation Receipt
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 text-sm">
          <div className="rounded-2xl bg-secondary p-4 text-center border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Amount Donated</p>
            <p className="font-display text-3xl font-extrabold text-primary mt-1">
              {formatCurrency(Number(d.amount))}
            </p>
            <div className="mt-2 flex justify-center">
              <DonationStatusBadge status={d.status} />
            </div>
          </div>

          <dl className="grid gap-2.5 text-xs">
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Payment / Transaction ID:</span>
              <span className="font-mono font-bold text-foreground">
                {d.payment_id || "Offline Cash / UPI"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Razorpay Order ID:</span>
              <span className="font-mono text-muted-foreground">{d.order_id || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Donor Name:</span>
              <span className="font-semibold">
                {d.donor_name} {d.is_anonymous ? "(Anonymous)" : ""}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Donor Email:</span>
              <span className="font-semibold">{d.email || "Not provided"}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Donor Phone:</span>
              <span className="font-semibold">{d.phone || "Not provided"}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Date Received:</span>
              <span className="font-semibold">
                {new Date(d.created_at).toLocaleString("en-IN")}
              </span>
            </div>
            {d.message && (
              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] font-semibold">
                  Devotional Message:
                </span>
                <span className="font-medium text-foreground italic">{d.message}</span>
              </div>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddOfflineDonationModal({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const donor_name = String(fd.get("donor_name") ?? "").trim();
    const amount = Number(fd.get("amount") ?? 0);
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!donor_name || isNaN(amount) || amount < 1) {
      toast.error("Please enter donor name and valid amount");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("donations").insert({
      donor_name,
      amount,
      email: email || null,
      phone: phone || null,
      message: message || null,
      payment_id: `OFFLINE_${Date.now()}`,
      status: "approved",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Offline donation recorded successfully!");
      setOpen(false);
      onAdded();

      if (email) {
        sendDonationReceiptEmail({
          toEmail: email,
          donorName: donor_name,
          amount,
          paymentId: `OFFLINE_${Date.now()}`,
          date: new Date().toLocaleString("en-IN"),
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
          <Plus className="mr-1.5 h-4 w-4" /> Add Offline Donation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Record Offline Cash / UPI Donation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="donor_name">Donor Name *</Label>
            <Input
              id="donor_name"
              name="donor_name"
              required
              className="rounded-2xl"
              placeholder="e.g. Anand Gowda"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                required
                className="rounded-2xl"
                placeholder="1001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                className="rounded-2xl"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address (For Receipt)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              className="rounded-2xl"
              placeholder="donor@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Notes / Devotional Message</Label>
            <Input
              id="message"
              name="message"
              className="rounded-2xl"
              placeholder="e.g. Cash collected at pandal desk"
            />
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Offline Donation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VolStatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="rounded-full gap-1 font-semibold">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold"
    >
      <Clock className="h-3 w-3" /> Pending Review
    </Badge>
  );
}

function ViewVolunteerModal({ app, events }: { app: VolunteerApplication; events: EventRow[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const [assignedEventId, setAssignedEventId] = useState(app.assigned_event_id || "");
  const [assignedRole, setAssignedRole] = useState(app.assigned_role || app.duty || "");
  const [assignedShift, setAssignedShift] = useState(
    app.assigned_shift || "Morning Shift (8 AM - 2 PM)",
  );

  const handleSaveAssignment = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("volunteers")
      .update({
        assigned_event_id: assignedEventId || null,
        assigned_role: assignedRole || null,
        assigned_shift: assignedShift || null,
      })
      .eq("id", app.id);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Volunteer event assignment updated!");
      qc.invalidateQueries({ queryKey: ["volunteers"] });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full"
          title="View complete details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Volunteer Application Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2 text-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <p className="font-bold text-base">{app.full_name}</p>
              <p className="text-xs text-muted-foreground">ID: {app.id}</p>
            </div>
            <VolStatusBadge status={app.status} />
          </div>

          {/* Event & Task Assignment Editor */}
          <div className="rounded-2xl bg-secondary p-4 border border-border space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Assign Festival Event & Role
            </p>

            <div className="grid gap-2 text-xs">
              <Label htmlFor="assign_event">Assign Specific Event</Label>
              <select
                id="assign_event"
                value={assignedEventId}
                onChange={(e) => setAssignedEventId(e.target.value)}
                className="rounded-2xl border border-input bg-background p-2.5 text-xs"
              >
                <option value="">-- General Festival Pandal Seva --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({formatEventDate(ev.event_date)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 text-xs">
              <Label htmlFor="assign_role">Volunteer Role / Task Title</Label>
              <Input
                id="assign_role"
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value)}
                className="rounded-2xl text-xs"
                placeholder="e.g. Annadana Queue Coordinator"
              />
            </div>

            <div className="grid gap-2 text-xs">
              <Label htmlFor="assign_shift">Assigned Shift Timings</Label>
              <Input
                id="assign_shift"
                value={assignedShift}
                onChange={(e) => setAssignedShift(e.target.value)}
                className="rounded-2xl text-xs"
                placeholder="e.g. Morning 8 AM - 2 PM"
              />
            </div>

            <Button
              disabled={loading}
              onClick={handleSaveAssignment}
              size="sm"
              className="w-full rounded-full gradient-saffron text-primary-foreground font-semibold text-xs"
            >
              {loading ? "Saving..." : "Save Assignment Details"}
            </Button>
          </div>

          <dl className="grid gap-2.5 text-xs pt-2">
            <div>
              <dt className="font-semibold text-muted-foreground">Contact Email:</dt>
              <dd className="font-medium">{app.email || "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Phone Number:</dt>
              <dd className="font-medium">{app.phone}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Address / City:</dt>
              <dd className="font-medium">{app.address || "Not provided"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Preferred Seva Duty:</dt>
              <dd className="font-medium">{app.duty || "General Seva"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Relevant Skills:</dt>
              <dd className="font-medium">{app.skills || "None specified"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Availability Timings:</dt>
              <dd className="font-medium">{app.availability || "Not specified"}</dd>
            </div>
            <div className="border-t border-border/60 pt-2 text-muted-foreground">
              Submitted: {new Date(app.created_at).toLocaleString("en-IN")}
            </div>
            {app.approved_at && (
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Approved by {app.approved_by || "Admin"} on{" "}
                {new Date(app.approved_at).toLocaleString("en-IN")}
              </div>
            )}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="card-premium flex items-center justify-between p-5 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-warm">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate font-display text-2xl font-extrabold text-foreground mt-0.5">
            {value}
          </p>
        </div>
      </div>
      {badge && (
        <Badge className="rounded-full bg-amber-500 text-white font-bold text-[10px] animate-pulse">
          {badge}
        </Badge>
      )}
    </div>
  );
}

/* MODAL & FORM COMPONENTS */

// 1. Edit/Create Event Modal
function EditEventModal({ event, onSave }: { event?: EventRow; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const category = String(fd.get("category") ?? "cultural");
    const event_date = String(fd.get("event_date") ?? "");
    const start_time = String(fd.get("start_time") ?? "");
    const venue = String(fd.get("venue") ?? "").trim();
    const entry_fee = Number(fd.get("entry_fee") ?? 0);
    const max_participants = Number(fd.get("max_participants") ?? 50);
    const description = String(fd.get("description") ?? "").trim();
    const rules = String(fd.get("rules") ?? "").trim();
    const prize_details = String(fd.get("prize_details") ?? "").trim();

    if (!name || !event_date || !start_time || !venue) {
      toast.error("Please fill in event name, date, start time, and venue");
      return;
    }

    setLoading(true);
    const payload = {
      name,
      slug,
      category,
      event_date,
      start_time,
      venue,
      entry_fee,
      max_participants,
      description,
      rules,
      prize_details,
    };

    let res;
    if (event?.id) {
      res = await supabase.from("events").update(payload).eq("id", event.id);
    } else {
      res = await supabase
        .from("events")
        .insert({ ...payload, registration_open: true, is_published: true });
    }
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(event ? "Event updated live!" : "Event created live!");
      setOpen(false);
      onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {event ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="Edit event">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Create Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {event ? `Edit ${event.name}` : "Create New Event"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={event?.name}
              required
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                defaultValue={event?.category || "cultural"}
                className="rounded-2xl border border-input bg-background p-2.5 text-xs"
              >
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
                <option value="kids">Kids</option>
                <option value="indoor">Indoor</option>
                <option value="esports">eSports</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                defaultValue={event?.event_date}
                required
                className="rounded-2xl text-xs"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={event?.start_time}
                required
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                name="venue"
                defaultValue={event?.venue}
                required
                className="rounded-2xl text-xs"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="entry_fee">Entry Fee (₹)</Label>
              <Input
                id="entry_fee"
                name="entry_fee"
                type="number"
                defaultValue={event?.entry_fee ?? 0}
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_participants">Max Slots</Label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                defaultValue={event?.max_participants ?? 50}
                className="rounded-2xl text-xs"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={event?.description}
              rows={2}
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rules">Event Rules</Label>
            <Textarea
              id="rules"
              name="rules"
              defaultValue={event?.rules ?? ""}
              rows={2}
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prize_details">Prize Details</Label>
            <Input
              id="prize_details"
              name="prize_details"
              defaultValue={event?.prize_details ?? ""}
              className="rounded-2xl text-xs"
            />
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Event Live"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit/Create Festival Schedule Item Modal
function EditScheduleModal({
  schedule,
  onSave,
}: {
  schedule?: FestivalScheduleItem;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const category = String(fd.get("category") ?? "aarti");
    const schedule_date = String(fd.get("schedule_date") ?? "2026-09-14");
    const start_time = String(fd.get("start_time") ?? "08:00");
    const end_time = String(fd.get("end_time") ?? "").trim() || null;
    const venue = String(fd.get("venue") ?? "Main Pandal").trim();
    const description = String(fd.get("description") ?? "").trim();
    const is_published = fd.get("is_published") === "on";

    if (!title) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    const payload = {
      title,
      category,
      schedule_date,
      start_time,
      end_time,
      venue,
      description,
      is_published,
    };

    let res;
    if (schedule?.id && !schedule.id.startsWith("fs-")) {
      res = await (supabase.from as any)("festival_schedules")
        .update(payload)
        .eq("id", schedule.id);
    } else {
      res = await (supabase.from as any)("festival_schedules").insert(payload);
    }
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(schedule ? "Schedule item updated!" : "Schedule item added!");
      setOpen(false);
      onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {schedule ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
            title="Edit schedule item"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Add Schedule Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {schedule ? "Edit Festival Schedule Item" : "Add Festival Schedule Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="s-title">Schedule Title / Ritual Name</Label>
            <Input
              id="s-title"
              name="title"
              defaultValue={schedule?.title}
              required
              className="rounded-2xl text-xs"
              placeholder="e.g. Morning Maha Aarti & Sankalpa"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="s-category">Category</Label>
              <select
                id="s-category"
                name="category"
                defaultValue={schedule?.category || "aarti"}
                className="rounded-2xl border border-input bg-background p-2.5 text-xs"
              >
                <option value="aarti">Aarti & Worship</option>
                <option value="prasadam">Mahaprasadam</option>
                <option value="cultural">Cultural Performance</option>
                <option value="visarjan">Visarjan Procession</option>
                <option value="other">Other Ritual</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-date">Date</Label>
              <Input
                id="s-date"
                name="schedule_date"
                type="date"
                defaultValue={schedule?.schedule_date || "2026-09-14"}
                required
                className="rounded-2xl text-xs"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="s-start">Start Time</Label>
              <Input
                id="s-start"
                name="start_time"
                type="time"
                defaultValue={schedule?.start_time || "08:00"}
                required
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-end">End Time (Optional)</Label>
              <Input
                id="s-end"
                name="end_time"
                type="time"
                defaultValue={schedule?.end_time ?? ""}
                className="rounded-2xl text-xs"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-venue">Venue / Location</Label>
            <Input
              id="s-venue"
              name="venue"
              defaultValue={schedule?.venue || "Main Pandal"}
              required
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-desc">Description</Label>
            <Textarea
              id="s-desc"
              name="description"
              defaultValue={schedule?.description ?? ""}
              rows={2}
              className="rounded-2xl text-xs"
              placeholder="Details about rituals, prasadam timing..."
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="s-published"
              name="is_published"
              defaultChecked={schedule?.is_published !== false}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <Label htmlFor="s-published">Show in Festival Schedule on Website</Label>
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Schedule Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 2. Edit/Create Notice Modal
function EditNoticeModal({ notice, onSave }: { notice?: Announcement; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const type = String(fd.get("type") ?? "update");
    const is_pinned = fd.get("is_pinned") === "on";

    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }

    setLoading(true);
    let res;
    if (notice?.id) {
      res = await supabase
        .from("announcements")
        .update({ title, message, type, is_pinned })
        .eq("id", notice.id);
    } else {
      res = await supabase.from("announcements").insert({ title, message, type, is_pinned });
    }
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(notice ? "Notice updated!" : "Notice published!");
      setOpen(false);
      onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {notice ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="Edit notice">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Post Notice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {notice ? "Edit Announcement" : "Post Announcement"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={notice?.title}
              required
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              defaultValue={notice?.message}
              required
              rows={3}
              className="rounded-2xl text-xs"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue={notice?.type || "update"}
              className="rounded-2xl border border-input bg-background p-2.5 text-xs"
            >
              <option value="update">Update</option>
              <option value="urgent">Urgent</option>
              <option value="winner">Winner</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_pinned"
              name="is_pinned"
              defaultChecked={notice?.is_pinned}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <Label htmlFor="is_pinned">Pin to ticker</Label>
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Announcement"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3. Edit/Create Sponsor Modal
function EditSponsorModal({ sponsor, onSave }: { sponsor?: Sponsor; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const tier = String(fd.get("tier") ?? "gold");
    const website = String(fd.get("website") ?? "").trim();

    if (!name) return toast.error("Sponsor name is required");

    setLoading(true);
    let res;
    if (sponsor?.id) {
      res = await supabase
        .from("sponsors")
        .update({ name, tier, website: website || null })
        .eq("id", sponsor.id);
    } else {
      res = await supabase.from("sponsors").insert({ name, tier, website: website || null });
    }
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(sponsor ? "Sponsor updated!" : "Sponsor added!");
      setOpen(false);
      onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {sponsor ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="Edit sponsor">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Add Sponsor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {sponsor ? "Edit Sponsor" : "Add New Sponsor"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="name">Business / Sponsor Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={sponsor?.name}
              required
              className="rounded-2xl text-xs"
              placeholder="e.g. Royal Sweets Bengaluru"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tier">Tier</Label>
            <select
              id="tier"
              name="tier"
              defaultValue={sponsor?.tier || "gold"}
              className="rounded-2xl border border-input bg-background p-2.5 text-xs capitalize"
            >
              <option value="title">Title Sponsor</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="associate">Associate</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website URL (Optional)</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={sponsor?.website ?? ""}
              className="rounded-2xl text-xs"
              placeholder="https://example.com"
            />
          </div>
          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Sponsor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3B. Edit Gallery Item Modal
function EditGalleryItemModal({
  item,
  onSave,
}: {
  item: GalleryItem;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video">(
    item.media_type === "video" ? "video" : "image"
  );
  const [title, setTitle] = useState(item.title || "");
  const [category, setCategory] = useState<string>(() => {
    if (!item.category) return "aarti";
    const cleanCat = item.category.replace(/-202[0-9]/, "").replace(/-reel$/, "");
    return cleanCat || "aarti";
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (item.created_at) {
      const yr = new Date(item.created_at).getFullYear();
      if (yr >= 2020 && yr <= 2030) return yr;
    }
    const match = item.title?.match(/\b(202[0-9])\b/);
    if (match) return parseInt(match[1]);
    return 2026;
  });
  const [mediaUrl, setMediaUrl] = useState(item.media_url || "");
  const [videoUrl, setVideoUrl] = useState(item.video_url || (item.media_type === "video" ? item.media_url : "") || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail_url || "");

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMediaType(item.media_type === "video" ? "video" : "image");
      setTitle(item.title || "");
      const cleanCat = (item.category || "").replace(/-202[0-9]/, "").replace(/-reel$/, "");
      setCategory(cleanCat || "aarti");
      if (item.created_at) {
        const yr = new Date(item.created_at).getFullYear();
        if (yr >= 2020 && yr <= 2030) setSelectedYear(yr);
      }
      setMediaUrl(item.media_url || "");
      setVideoUrl(item.video_url || (item.media_type === "video" ? item.media_url : "") || "");
      setThumbnailUrl(item.thumbnail_url || "");
    }
    setOpen(newOpen);
  };

  const handleVideoFileUploadInEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file is too large (max 100MB)");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("🚀 Uploading replacement video file directly to CDN storage...");
    try {
      const { uploadMediaToStorageCDN } = await import("@/lib/utils/fast-media-uploader");
      const res = await uploadMediaToStorageCDN(file, file.name || "video");
      if (res.success && res.url) {
        setVideoUrl(res.url);
        toast.success("📹 Video uploaded & CDN link generated!", { id: toastId });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setVideoUrl(reader.result as string);
            toast.success("📹 Video file loaded!", { id: toastId });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload video file", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file for the thumbnail");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("🖼️ Uploading thumbnail image file to CDN storage...");
    try {
      const { compressAndConvertToWebP } = await import("@/lib/image-optimizer");
      const { uploadMediaToStorageCDN } = await import("@/lib/utils/fast-media-uploader");

      const optResult = await compressAndConvertToWebP(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        format: "webp",
      });

      const res = await uploadMediaToStorageCDN(optResult.file, `thumb-${Date.now()}`);
      if (res.success && res.url) {
        setThumbnailUrl(res.url);
        toast.success("🖼️ Thumbnail uploaded to CDN storage!", { id: toastId });
      } else if (optResult.dataUrl) {
        setThumbnailUrl(optResult.dataUrl);
        toast.success("🖼️ Thumbnail image compressed & ready!", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to process thumbnail file", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title/caption for this media");
      return;
    }

    setLoading(true);
    try {
      const yearTimestamp = `${selectedYear}-08-15T12:00:00.000Z`;
      let finalTitle = title.trim();
      if (!/\b(202[0-9])\b/.test(finalTitle)) {
        finalTitle = `${finalTitle} (${selectedYear})`;
      }

      const finalMediaUrl = mediaType === "video" ? (videoUrl.trim() || mediaUrl.trim()) : mediaUrl.trim();
      const finalThumbnail = thumbnailUrl.trim() || (mediaType === "image" ? finalMediaUrl : null);

      const payload = {
        title: finalTitle,
        category: `${category}-${selectedYear}`,
        media_type: mediaType,
        media_url: finalMediaUrl,
        video_url: mediaType === "video" ? (videoUrl.trim() || finalMediaUrl) : null,
        thumbnail_url: finalThumbnail,
        created_at: yearTimestamp,
      };

      const { error } = await supabase
        .from("gallery_items")
        .update(payload)
        .eq("id", item.id);

      if (error) {
        toast.error(`Update failed: ${error.message}`);
      } else {
        toast.success("Gallery item updated live!");
        setOpen(false);
        onSave();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="rounded-full bg-black/75 p-1.5 text-white hover:bg-amber-500 hover:text-slate-950 transition-colors shadow-md border border-white/20"
          title="Edit media item"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base">
            <Edit className="h-4 w-4 text-primary" /> Edit Gallery Media
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5 border border-border">
            <button
              type="button"
              onClick={() => setMediaType("image")}
              className={`flex-1 rounded-xl py-1.5 font-bold text-xs transition ${
                mediaType === "image"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📷 Photo
            </button>
            <button
              type="button"
              onClick={() => setMediaType("video")}
              className={`flex-1 rounded-xl py-1.5 font-bold text-xs transition ${
                mediaType === "video"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🎥 Video
            </button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-g-title">Title / Caption</Label>
            <Input
              id="edit-g-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-2xl text-xs"
              placeholder="Media title or caption..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-g-year">Festival Year 🗓️</Label>
              <select
                id="edit-g-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-2xl border border-input bg-background p-2.5 text-xs font-semibold"
              >
                <option value={2026}>2026 Celebration</option>
                <option value={2025}>2025 Archive</option>
                <option value={2024}>2024 Archive</option>
                <option value={2023}>2023 Archive</option>
                <option value={2022}>2022 Archive</option>
                <option value={2021}>2021 Archive</option>
                <option value={2020}>2020 Archive</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-g-cat">Category</Label>
              <select
                id="edit-g-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-input bg-background p-2.5 text-xs font-semibold"
              >
                <option value="aarti">Maha Aarti & Puja 🪔</option>
                <option value="cultural">Cultural Performances 🎭</option>
                <option value="visarjan">Visarjan Procession 🥁</option>
                <option value="photos">Festival Memories 📸</option>
              </select>
            </div>
          </div>

          {mediaType === "image" ? (
            <div className="grid gap-2">
              <Label htmlFor="edit-g-img-url">Photo Image URL / CDN Link</Label>
              <Input
                id="edit-g-img-url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                required
                className="rounded-2xl text-xs"
                placeholder="https://..."
              />
              <div className="mt-1">
                <ImageUploader
                  label="Upload New Replacement Photo"
                  onImageOptimized={(res) => {
                    setMediaUrl(res.dataUrl);
                    toast.success("New photo loaded & ready to save!");
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-g-video-url">Video Direct / Embed Link (MP4 / YouTube / CDN)</Label>
                <Input
                  id="edit-g-video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                  className="rounded-2xl text-xs font-mono"
                  placeholder="https://..."
                />
                <div className="mt-1">
                  <Label htmlFor="edit-v-file" className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold block">
                    ⚡ OR Select Video File from Device (.mp4, .webm, .mov)
                  </Label>
                  <Input
                    id="edit-v-file"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoFileUploadInEdit}
                    className="mt-1 rounded-2xl text-xs cursor-pointer bg-background"
                  />
                </div>
              </div>

              {/* Direct Thumbnail Upload Section */}
              <div className="grid gap-2 border-t border-border/80 pt-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-g-thumb-file" className="font-bold text-amber-600 dark:text-amber-400">
                    Custom Thumbnail Image 🖼️
                  </Label>
                  {thumbnailUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-destructive hover:bg-destructive/10 px-2 rounded-full font-bold"
                      onClick={() => setThumbnailUrl("")}
                    >
                      Clear Thumbnail
                    </Button>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <Label htmlFor="edit-g-thumb-file" className="cursor-pointer text-xs font-bold text-foreground block">
                    📸 Upload Thumbnail File Directly from Device
                  </Label>
                  <Input
                    id="edit-g-thumb-file"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailFileUpload}
                    className="rounded-2xl text-xs cursor-pointer bg-background"
                  />

                  <div className="pt-1">
                    <Label htmlFor="edit-g-thumb-url" className="text-[10px] text-muted-foreground font-semibold">
                      OR Paste Thumbnail URL / Data Link
                    </Label>
                    <Input
                      id="edit-g-thumb-url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="mt-1 rounded-2xl text-xs font-mono"
                      placeholder="https://... or upload file above"
                    />
                  </div>

                  {thumbnailUrl && (
                    <div className="relative mt-2 aspect-video w-36 overflow-hidden rounded-xl border border-amber-500/50 bg-stone-950 p-1 shadow-md">
                      <img
                        src={thumbnailUrl}
                        alt="Thumbnail Preview"
                        className="h-full w-full object-cover rounded-lg"
                      />
                      <div className="absolute top-1.5 left-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">
                        Thumbnail Preview
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold text-xs py-5"
          >
            {loading ? "Saving Changes..." : "Save Gallery Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 4. Add Gallery Media (Photo & Video) Form
function AddGalleryItemForm({ onUploaded }: { onUploaded: () => void }) {
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [aspectRatio, setAspectRatio] = useState<"square" | "reel" | "landscape">("square");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("aarti");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [optimizedData, setOptimizedData] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const handleMultipleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) {
      setSelectedImageFiles(files);
      toast.success(`Selected ${files.length} photo(s) for bulk upload`);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video file is too large (max 100MB)");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("🚀 Uploading video file directly to CDN storage...");
    try {
      const { uploadMediaToStorageCDN } = await import("@/lib/utils/fast-media-uploader");
      const res = await uploadMediaToStorageCDN(file, file.name || "video");
      if (res.success && res.url) {
        setVideoUrl(res.url);
        toast.success("📹 Video uploaded & CDN link generated in seconds!", { id: toastId });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setVideoUrl(reader.result as string);
            toast.success("📹 Video file loaded & ready!", { id: toastId });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload video file", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title/caption for this media");
      return;
    }

    const yearTimestamp = `${selectedYear}-08-15T12:00:00.000Z`;
    let rawTitle = title.trim();
    if (aspectRatio === "reel" && !/reel|short|9:16|9-16/i.test(rawTitle)) {
      rawTitle = `${rawTitle} (9:16 Reel)`;
    }

    const finalTitle = /\b(202[0-9])\b/.test(rawTitle)
      ? rawTitle
      : `${rawTitle} (${selectedYear})`;

    const finalCategory = aspectRatio === "reel" ? `${category}-reel` : category;

    if (mediaType === "image") {
      if (selectedImageFiles.length === 0 && !optimizedData) {
        toast.error("Please select at least one photo to upload");
        return;
      }

      setLoading(true);
      const { compressAndConvertToWebP } = await import("@/lib/image-optimizer");
      const { uploadMediaToStorageCDN } = await import("@/lib/utils/fast-media-uploader");

      const toastId = toast.loading("🚀 Preparing photos for live publishing...");

      try {
        if (selectedImageFiles.length > 0) {
          const total = selectedImageFiles.length;
          setUploadProgress({ current: 0, total });

          const uploadedUrls: string[] = [];

          for (let i = 0; i < total; i++) {
            const file = selectedImageFiles[i];
            setUploadProgress({ current: i + 1, total });
            toast.loading(`🚀 Uploading photo ${i + 1}/${total}: ${file.name}...`, { id: toastId });

            const optResult = await compressAndConvertToWebP(file, {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.80,
              format: "webp",
            });

            const storageRes = await uploadMediaToStorageCDN(optResult.file, file.name || `photo-${i + 1}`);

            let finalUrl = storageRes.url;
            if (!finalUrl) {
              const fallbackOpt = await compressAndConvertToWebP(file, {
                maxWidth: 900,
                maxHeight: 900,
                quality: 0.65,
                format: "webp",
              });
              finalUrl = fallbackOpt.dataUrl || optResult.dataUrl;
            }

            if (finalUrl) uploadedUrls.push(finalUrl);
          }

          if (uploadedUrls.length > 0) {
            // Bundle into 1 single Album item
            const mediaUrlPayload = uploadedUrls.length === 1 ? uploadedUrls[0] : JSON.stringify(uploadedUrls);
            const firstThumbnail = uploadedUrls[0];

            let { data: insertedData, error: insertError } = await supabase.from("gallery_items").insert({
              title: finalTitle,
              category: `${finalCategory}-${selectedYear}`,
              media_type: "image",
              media_url: mediaUrlPayload,
              thumbnail_url: firstThumbnail,
              created_at: yearTimestamp,
            }).select("id").single();

            if (insertError) {
              const { data: retryData, error: retryErr } = await supabase.from("gallery_items").insert({
                title: finalTitle,
                category: `${finalCategory}-${selectedYear}`,
                media_type: "image",
                media_url: mediaUrlPayload,
                thumbnail_url: firstThumbnail,
                created_at: yearTimestamp,
              }).select("id").single();
              if (retryErr) throw retryErr;
              insertedData = retryData;
            }

            const shareUrl = insertedData?.id ? `https://shanthimahaganapathi-2026.web.app/video/${insertedData.id}` : "https://shanthimahaganapathi-2026.web.app/gallery";

            toast.success(`📷 Published Album (${selectedYear}) containing ${uploadedUrls.length} photo(s)!`, {
              id: toastId,
              action: {
                label: "Copy Share Link",
                onClick: () => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("🔗 Link copied to clipboard!");
                },
              },
            });
          }
        } else if (optimizedData) {
          const { data: singleData, error: singleError } = await supabase.from("gallery_items").insert({
            title: finalTitle,
            category: `${finalCategory}-${selectedYear}`,
            media_type: "image",
            media_url: optimizedData,
            thumbnail_url: optimizedData,
            created_at: yearTimestamp,
          }).select("id").single();
          if (singleError) throw singleError;

          const shareUrl = singleData?.id ? `https://shanthimahaganapathi-2026.web.app/video/${singleData.id}` : "https://shanthimahaganapathi-2026.web.app/gallery";

          toast.success(`📷 Photo (${selectedYear}) published live to gallery!`, {
            id: toastId,
            action: {
              label: "Copy Share Link",
              onClick: () => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("🔗 Link copied to clipboard!");
              },
            },
          });
        }

        setTitle("");
        setSelectedImageFiles([]);
        setOptimizedData(null);
        onUploaded();
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to upload photo(s)", { id: toastId });
      } finally {
        setLoading(false);
        setUploadProgress({ current: 0, total: 0 });
      }
      return;
    }

    // Video Submission
    if (mediaType === "video" && !videoUrl.trim()) {
      toast.error("Please enter a video URL or upload a video file");
      return;
    }

    setLoading(true);
    try {
      const finalThumbnail = await autoGenerateVideoThumbnail(videoUrl.trim(), thumbnailUrl);

      let { data: insertedVideo, error } = await supabase.from("gallery_items").insert({
        title: finalTitle,
        category: `${finalCategory}-${selectedYear}`,
        media_type: mediaType,
        media_url: videoUrl.trim(),
        video_url: videoUrl.trim(),
        thumbnail_url: finalThumbnail,
        created_at: yearTimestamp,
      }).select("id").single();

      if (
        error &&
        (error.message.includes("video_url") ||
          error.message.includes("column") ||
          error.code === "PGRST204")
      ) {
        const retryRes = await supabase.from("gallery_items").insert({
          title: finalTitle,
          category: `${finalCategory}-${selectedYear}`,
          media_type: mediaType,
          media_url: videoUrl.trim(),
          thumbnail_url: finalThumbnail,
          created_at: yearTimestamp,
        }).select("id").single();
        error = retryRes.error;
        insertedVideo = retryRes.data;
      }

      if (error) throw error;

      const shareUrl = insertedVideo?.id ? `https://shanthimahaganapathi-2026.web.app/video/${insertedVideo.id}` : "https://shanthimahaganapathi-2026.web.app/gallery";

      toast.success(`📹 Video (${selectedYear}) published live to gallery!`, {
        action: {
          label: "Copy Share Link",
          onClick: () => {
            navigator.clipboard.writeText(shareUrl);
            toast.success("🔗 Link copied to clipboard!");
          },
        },
      });
      notifyNewVideoUploaded(title.trim(), finalThumbnail);
      setTitle("");
      setVideoUrl("");
      setThumbnailUrl(null);
      onUploaded();
    } catch (err: any) {
      toast.error(err?.message || "Failed to publish video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 text-xs">
      {/* Format Selector: Photo vs Video */}
      <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5 border border-border">
        <button
          type="button"
          onClick={() => {
            setMediaType("image");
            if (aspectRatio === "landscape") setAspectRatio("square");
          }}
          className={`flex-1 rounded-xl py-2 font-bold text-xs transition ${
            mediaType === "image"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📷 Photo (Single / Bulk Multi-Upload)
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType("video");
            setAspectRatio("reel");
          }}
          className={`flex-1 rounded-xl py-2 font-bold text-xs transition ${
            mediaType === "video"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🎥 Video (MP4 File / URL Embed)
        </button>
      </div>

      {/* Aspect Ratio Selector (9:16 Reel / 1:1 Square / 16:9 Landscape) */}
      <div className="grid gap-1.5">
        <Label className="font-bold text-amber-600 dark:text-amber-400">
          Display Aspect Ratio Format 📐
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAspectRatio("reel")}
            className={`rounded-xl py-2 px-2 text-[11px] font-bold border transition ${
              aspectRatio === "reel"
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            📱 9:16 Vertical Reel
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("square")}
            className={`rounded-xl py-2 px-2 text-[11px] font-bold border transition ${
              aspectRatio === "square"
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            🖼️ 1:1 Square
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("landscape")}
            className={`rounded-xl py-2 px-2 text-[11px] font-bold border transition ${
              aspectRatio === "landscape"
                ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            🖥️ 16:9 Landscape
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="g-title">Media Title / Base Caption</Label>
          <Input
            id="g-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-2xl text-xs"
            placeholder={
              mediaType === "video"
                ? "e.g. Dhol Tasha Pathak Performance 🥁"
                : "e.g. Evening Maha Aarti Celebrations 🪔"
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-year" className="font-bold text-amber-600 dark:text-amber-400">
            Festival Year 🗓️
          </Label>
          <select
            id="g-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-2xl border border-amber-500/40 bg-background p-2.5 text-xs font-extrabold text-amber-600 dark:text-amber-400"
          >
            <option value={2026}>2026 Celebration</option>
            <option value={2025}>2025 Archive</option>
            <option value={2024}>2024 Archive</option>
            <option value={2023}>2023 Archive</option>
            <option value={2022}>2022 Archive</option>
            <option value={2021}>2021 Archive</option>
            <option value={2020}>2020 Archive</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-cat">Category</Label>
          <select
            id="g-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-2xl border border-input bg-background p-2.5 text-xs font-semibold"
          >
            <option value="aarti">Maha Aarti & Puja 🪔</option>
            <option value="cultural">Cultural Performances 🎭</option>
            <option value="visarjan">Visarjan Procession 🥁</option>
            <option value="photos">Festival Memories 📸</option>
          </select>
        </div>
      </div>

      {/* Image Specific Uploader with Bulk Multi-Image Support */}
      {mediaType === "image" && (
        <div className="grid gap-4">
          <div className="rounded-3xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <Label htmlFor="multi-photo-input" className="cursor-pointer font-bold text-amber-600 dark:text-amber-400 block">
              📸 Select Multiple Photos for Bulk Upload
            </Label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Select any number of photos (PNG, JPG, WebP). All selected photos will be auto-compressed & published to gallery.
            </p>
            <Input
              id="multi-photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultipleImagesSelect}
              className="mt-3 rounded-2xl text-xs cursor-pointer bg-background"
            />
            {selectedImageFiles.length > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/20 p-2 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                <span>✨ {selectedImageFiles.length} photo(s) ready to publish:</span>
                <span className="truncate max-w-[200px]">
                  {selectedImageFiles.map((f) => f.name).join(", ")}
                </span>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center my-1">
            <span className="bg-background px-3 text-[10px] uppercase font-bold text-muted-foreground">
              OR Drag & Drop Single Photo with Live WebP Preview
            </span>
          </div>

          <ImageUploader
            label="Upload Single Photo with Live WebP Preview"
            onImageOptimized={(res) => setOptimizedData(res.dataUrl)}
          />
        </div>
      )}

      {/* Video Specific Inputs */}
      {mediaType === "video" && (
        <div className="grid gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="grid gap-2">
            <Label htmlFor="v-url" className="font-bold text-amber-500">
              Video Direct Link (MP4 / WebM / YouTube / CDN URL)
            </Label>
            <Input
              id="v-url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="rounded-2xl text-xs"
              placeholder="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            />
          </div>

          <div className="relative flex items-center justify-center my-1">
            <span className="bg-background px-3 text-[10px] uppercase font-bold text-muted-foreground">
              OR Upload Video File
            </span>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="v-file">Select Video File (.mp4, .webm, .mov)</Label>
            <Input
              id="v-file"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideoFileUpload}
              className="rounded-2xl text-xs cursor-pointer"
            />
          </div>

          <div className="mt-2 border-t border-amber-500/20 pt-3">
            <Label className="text-xs font-semibold">Optional Custom Video Poster/Thumbnail</Label>
            <div className="mt-2">
              <ImageUploader
                label="Upload Thumbnail Image (Auto WebP)"
                onImageOptimized={(res) => setThumbnailUrl(res.dataUrl)}
              />
            </div>
          </div>
        </div>
      )}

      <Button
        disabled={
          loading ||
          (mediaType === "image" && selectedImageFiles.length === 0 && !optimizedData) ||
          (mediaType === "video" && !videoUrl.trim())
        }
        type="submit"
        className="w-full rounded-full gradient-saffron text-primary-foreground font-bold shadow-lg py-5"
      >
        {loading
          ? `Publishing ${uploadProgress.total > 0 ? `${uploadProgress.current}/${uploadProgress.total} Photos…` : "Media…"}`
          : mediaType === "video"
            ? "Publish Video to Live Gallery 🎥"
            : selectedImageFiles.length > 1
              ? `Publish ${selectedImageFiles.length} Photos Live to Gallery 📸`
              : "Publish Photo Live to Gallery 📸"}
      </Button>
    </form>
  );
}

// 5. Festival Settings Form
function FestivalSettingsForm({
  settings,
  onSaved,
}: {
  settings?: FestivalSettings | null;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const festival_name = String(fd.get("festival_name") ?? "Ganapathi Festival 2026").trim();
    const start_date = String(fd.get("start_date") ?? "2026-09-14");
    const end_date = String(fd.get("end_date") ?? "2026-09-24");
    const raw_live_url = String(fd.get("live_stream_url") ?? "").trim();
    const live_stream_url = getEmbeddableYouTubeUrl(raw_live_url);
    const upi_id = String(fd.get("upi_id") ?? "").trim();
    const donation_goal = Number(fd.get("donation_goal") ?? 500000);
    const contact_phone = String(fd.get("contact_phone") ?? "").trim();
    const contact_email = String(fd.get("contact_email") ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();

    setLoading(true);
    const targetId = settings?.id ?? 1;
    const { error } = await supabase.from("festival_settings").upsert({
      id: targetId,
      festival_name,
      start_date,
      end_date,
      live_stream_url: live_stream_url || null,
      upi_id: upi_id || null,
      donation_goal,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      address: address || null,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Site configuration updated live!");
      qc.invalidateQueries({ queryKey: ["festival-settings"] });
      onSaved();
    }
  };

  return (
    <form
      key={
        settings
          ? `${settings.id}-${settings.contact_email}-${settings.contact_phone}`
          : "settings-loading"
      }
      onSubmit={handleSubmit}
      className="grid gap-4 text-xs"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="festival_name">Festival Name</Label>
          <Input
            id="festival_name"
            name="festival_name"
            defaultValue={settings?.festival_name ?? "Ganapathi Festival 2026"}
            required
            className="rounded-2xl text-xs"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={settings?.start_date ?? "2026-09-14"}
            required
            className="rounded-2xl text-xs"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={settings?.end_date ?? "2026-09-24"}
            required
            className="rounded-2xl text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="live_stream_url">Live Stream YouTube / Video URL</Label>
          <Input
            id="live_stream_url"
            name="live_stream_url"
            defaultValue={
              settings?.live_stream_url ??
              "https://www.youtube.com/embed/live_stream?channel=UCexample"
            }
            className="rounded-2xl text-xs"
            placeholder="YouTube embed or video URL"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="donation_goal">Donation Target Goal (₹)</Label>
          <Input
            id="donation_goal"
            name="donation_goal"
            type="number"
            defaultValue={settings?.donation_goal ?? 500000}
            required
            className="rounded-2xl text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="upi_id">UPI ID for Donations</Label>
          <Input
            id="upi_id"
            name="upi_id"
            defaultValue={settings?.upi_id ?? "mandal@upi"}
            className="rounded-2xl text-xs"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            defaultValue={settings?.contact_phone ?? "+91 98765 43210"}
            className="rounded-2xl text-xs"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings?.contact_email ?? "info@ganapathifestival.org"}
            className="rounded-2xl text-xs"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Festival Pandal Address</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={
            settings?.address ?? "Main Mandap, Chitradurga, Karnataka 577501"
          }
          rows={2}
          className="rounded-2xl text-xs"
        />
      </div>

      <Button
        disabled={loading}
        type="submit"
        className="w-full rounded-full gradient-saffron text-primary-foreground font-bold mt-2"
      >
        {loading ? "Saving Settings..." : "Save & Update Live Site Settings"}
      </Button>
    </form>
  );
}

function EditMemoryModal({ memory, onSave }: { memory?: FestivalMemory; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(memory?.cover_image_url || "");
  const [photosList, setPhotosList] = useState<string[]>(memory?.photos || []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const year = Number(fd.get("year") ?? new Date().getFullYear());
    const title = String(fd.get("title") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const sort_order = Number(fd.get("sort_order") ?? 0);

    if (!year || !title || !coverUrl) {
      toast.error("Please provide Year, Title, and upload a Cover Banner Image");
      return;
    }

    setLoading(true);
    const payload = {
      year,
      title,
      description,
      cover_image_url: coverUrl,
      photos: photosList,
      sort_order,
    };

    let res;
    if (memory?.id) {
      res = await supabase.from("festival_memories").update(payload).eq("id", memory.id);
    } else {
      res = await supabase.from("festival_memories").insert(payload);
    }
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(memory ? "Yearly memory updated!" : "Yearly memory added!");
      setOpen(false);
      onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {memory ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black"
            title="Edit memory"
          >
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs">
            <Plus className="mr-1.5 h-4 w-4" /> Add Yearly Memory
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {memory ? `Edit ${memory.year} Memory` : "Add Yearly Memory Card"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="year">Memory Year (e.g. 2025)</Label>
              <Input
                id="year"
                name="year"
                type="number"
                defaultValue={memory?.year ?? new Date().getFullYear()}
                required
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sort_order">Display Priority Order</Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                defaultValue={memory?.sort_order ?? 0}
                className="rounded-2xl text-xs"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Memory Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={memory?.title}
              required
              className="rounded-2xl text-xs"
              placeholder="e.g. Silver Jubilee Celebrations 2025"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Bio / Description / Highlights</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={memory?.description}
              rows={3}
              className="rounded-2xl text-xs"
              placeholder="Highlights, special events, crowd count..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Cover Banner Image (WebP Compressed)</Label>
            <ImageUploader
              label="Upload Cover Image"
              onImageOptimized={(res) => setCoverUrl(res.dataUrl)}
            />
            {coverUrl && (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-xl border border-border">
                <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>



          <Button
            disabled={loading}
            type="submit"
            className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            {loading ? "Saving..." : "Save Memory Card"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddTickerForm({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("update");
  const [isPinned, setIsPinned] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Ticker title and message are required");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      message: message.trim(),
      type,
      is_pinned: isPinned,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("New ticker line published live to banner!");
      setTitle("");
      setMessage("");
      onAdded();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 text-xs">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="t-title" className="font-semibold text-foreground">
            Ticker Header / Title *
          </Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-2xl text-xs"
            placeholder="e.g. Maha Aarti Timings"
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="t-message" className="font-semibold text-foreground">
            Announcement Line Details *
          </Label>
          <Input
            id="t-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="rounded-2xl text-xs"
            placeholder="e.g. Daily Maha Aarti at 7:30 PM. Prasada distribution follows immediately."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="t-type" className="text-muted-foreground">
              Badge Style:
            </Label>
            <select
              id="t-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-input bg-background p-1.5 text-xs"
            >
              <option value="update">Update</option>
              <option value="urgent">Urgent Alert</option>
              <option value="winner">Winner Announcement</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="t-pinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <Label htmlFor="t-pinned" className="font-semibold cursor-pointer">
              Pin to ticker stream
            </Label>
          </div>
        </div>

        <Button
          disabled={loading || !title.trim() || !message.trim()}
          type="submit"
          className="rounded-full gradient-saffron text-primary-foreground font-bold px-6 text-xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {loading ? "Publishing Line..." : "Publish Ticker Line Live"}
        </Button>
      </div>
    </form>
  );
}
