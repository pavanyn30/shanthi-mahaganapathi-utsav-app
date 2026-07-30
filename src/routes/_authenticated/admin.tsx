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
  Menu,
  Megaphone,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSession, useIsStaff } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "@/components/site/ImageUploader";
import { sendVolunteerApprovedEmail, sendVolunteerStatusUpdateEmail, sendDonationReceiptEmail } from "@/lib/email-service";
import {
  announcementsQuery,
  donationsQuery,
  eventsQuery,
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
  type Announcement,
  type Sponsor,
  type GalleryItem,
  type FestivalSettings,
  type VolunteerApplication,
  type Donation,
  type FestivalMemory,
} from "@/lib/festival";
import { QRScannerModal } from "@/components/volunteer/QRScannerModal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control Center — Executive Dashboard" },
      { name: "description", content: "Complete site management, memories, donations, volunteer applications, events, notices, gallery, sponsors and settings." },
      { property: "og:title", content: "Admin Control Center — Executive Dashboard" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useSession();
  const isStaff = useIsStaff(user?.id);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery(eventsQuery);
  const { data: donations = [] } = useQuery(donationsQuery);
  const { data: announcements = [] } = useQuery(announcementsQuery);
  const { data: gallery = [] } = useQuery(galleryQuery);
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { data: volunteers = [] } = useQuery(volunteersQuery);
  const { data: memories = [] } = useQuery(memoriesQuery);

  const [searchQuery, setSearchQuery] = useState("");
  const [volSearchQuery, setVolSearchQuery] = useState("");
  const [donSearchQuery, setDonSearchQuery] = useState("");

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

  const filteredDonations = allDonations.filter((d) => {
    const q = donSearchQuery.toLowerCase();
    return (
      d.donor_name.toLowerCase().includes(q) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.phone && d.phone.includes(q)) ||
      (d.payment_id && d.payment_id.toLowerCase().includes(q)) ||
      (d.order_id && d.order_id.toLowerCase().includes(q))
    );
  });

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

    toast.success(`Approved ${app.full_name} as active volunteer!`);
    qc.invalidateQueries({ queryKey: ["volunteers"] });

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
      sendVolunteerStatusUpdateEmail({ toEmail: app.email, recipientName: app.full_name, status: "rejected" });
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

  return (
    <div className="min-h-screen bg-background">
      {/* NGX-Style Layout: Left Sidebar + Main Workspace */}
      <Tabs defaultValue="memories" className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar Navigation Panel */}
        <aside className="w-full lg:w-72 shrink-0 bg-card border-r border-border p-4 lg:p-6 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-warm shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold truncate">Control Center</h2>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Realtime Active
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Management Menu</p>
            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-1 w-full text-left">
              <TabsTrigger value="memories" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <History className="h-4 w-4" /> Yearly Memories
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{memories.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="donations" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Receipt className="h-4 w-4" /> Donations & Receipts
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{allDonations.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="volunteers" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Users className="h-4 w-4" /> Registered Forms
                </span>
                {pendingVolunteers.length > 0 ? (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-bold animate-pulse">{pendingVolunteers.length} New</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{volunteers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="events" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4" /> Festival Events
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{events.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="notices" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Radio className="h-4 w-4" /> Announcements
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{announcements.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="registrations" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Ticket className="h-4 w-4" /> Pass Registrations
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{regs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="sponsors" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4" /> Sponsors
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{sponsors.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <ImageIcon className="h-4 w-4" /> Media Gallery
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold">{gallery.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="settings" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4" /> Site Settings
                </span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="w-full justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold data-[state=active]:gradient-saffron data-[state=active]:text-primary-foreground transition-all">
                <span className="flex items-center gap-2.5">
                  <BarChart3 className="h-4 w-4" /> Analytics & Reports
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </aside>

        {/* Right Main Workspace Area */}
        <main className="flex-1 p-4 lg:p-8 space-y-6">
          {/* Top Overview Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={CalendarDays} label="Events" value={String(events.length)} />
            <Stat icon={Ticket} label="Registrations" value={String(regs.length)} />
            <Stat
              icon={Users}
              label="Volunteer Applications"
              value={String(volunteers.length)}
              badge={pendingVolunteers.length > 0 ? `${pendingVolunteers.length} Pending` : undefined}
            />
            <Stat icon={HandHeart} label="Donations Collected" value={formatCurrency(totalDonated)} />
          </div>

          {/* 1. MEMORIES TAB */}
          <TabsContent value="memories" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Yearly Memories & Heritage Timeline</h2>
                <p className="text-xs text-muted-foreground">Manage year-wise cards, cover banners, descriptions, and photo archives.</p>
              </div>
              <EditMemoryModal onSave={() => qc.invalidateQueries({ queryKey: ["festival-memories"] })} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {memories.map((m) => (
                <div key={m.id} className="card-premium flex flex-col justify-between overflow-hidden p-0 group">
                  <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                    <img src={m.cover_image_url} alt={m.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <Badge className="rounded-full gradient-saffron text-primary-foreground font-bold px-3 py-1">
                        {m.year}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <EditMemoryModal memory={m} onSave={() => qc.invalidateQueries({ queryKey: ["festival-memories"] })} />
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

                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <ImageIcon className="h-3.5 w-3.5 text-primary" /> {m.photos?.length || 0} Gallery Photos
                      </span>
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
          <TabsContent value="donations" className="m-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Donations & Payment Receipts</h2>
                <p className="text-xs text-muted-foreground">View Razorpay payment IDs, donor info, receipt details, or add offline donations.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AddOfflineDonationModal onAdded={() => {
                  qc.invalidateQueries({ queryKey: ["all-donations"] });
                  qc.invalidateQueries({ queryKey: ["donations"] });
                }} />
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search donor, email, pay ID..."
                    value={donSearchQuery}
                    onChange={(e) => setDonSearchQuery(e.target.value)}
                    className="pl-9 rounded-2xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="card-premium overflow-x-auto p-0">
              <table className="w-full min-w-180 text-xs">
                <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="p-4">Donor Name</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Razorpay Payment ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map((d) => (
                    <tr key={d.id} className="border-t border-border/60 hover:bg-secondary/40 transition-colors">
                      <td className="p-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          {d.donor_name}
                          {d.is_anonymous && (
                            <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                              Anonymous
                            </Badge>
                          )}
                        </div>
                        {d.message && <div className="text-[11px] text-muted-foreground italic truncate max-w-xs">{d.message}</div>}
                      </td>
                      <td className="p-4 font-extrabold text-primary text-sm">{formatCurrency(Number(d.amount))}</td>
                      <td className="p-4">
                        <div className="font-semibold">{d.phone || "No phone"}</div>
                        <div className="text-muted-foreground">{d.email || "No email"}</div>
                      </td>
                      <td className="p-4 font-mono">
                        {d.payment_id ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{d.payment_id}</span>
                        ) : (
                          <span className="text-muted-foreground font-normal">Offline Entry</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4">
                        <DonationStatusBadge status={d.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ViewDonationReceiptModal d={d} />
                          {d.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3"
                              onClick={() => approveDonation(d)}
                            >
                              Approve
                            </Button>
                          )}
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
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">Review applications, assign events/roles, approve active volunteers, or reject forms.</p>
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

            <div className="card-premium overflow-x-auto p-0">
              <table className="w-full min-w-180 text-xs">
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
                    <tr key={app.id} className="border-t border-border/60 hover:bg-secondary/40 transition-colors">
                      <td className="p-4 font-semibold text-foreground">
                        <div>{app.full_name}</div>
                        {app.address && <div className="text-[11px] text-muted-foreground font-normal">{app.address}</div>}
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

          {/* 4. EVENTS MANAGEMENT TAB */}
          <TabsContent value="events" className="m-0 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 border border-border">
              <div>
                <h2 className="font-display text-lg font-bold">Editable Festival Events</h2>
                <p className="text-xs text-muted-foreground">Add new events, edit rules, times, venues, and toggle registration status live.</p>
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
                      <Badge className="rounded-full capitalize gradient-saffron text-primary-foreground font-bold">{e.category}</Badge>
                      <div className="flex items-center gap-1">
                        <EditEventModal event={e} onSave={() => qc.invalidateQueries({ queryKey: ["events"] })} />
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
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.description}</p>
                    <dl className="mt-3 grid gap-1.5 text-xs text-foreground/80">
                      <div>📅 {formatEventDate(e.event_date)} at {e.start_time}</div>
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
                        toast.success(e.registration_open ? "Registrations closed" : "Registrations opened");
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
                  <span className="text-xs text-muted-foreground font-mono">({announcements.length} Active Lines)</span>
                </div>
                <h2 className="font-display text-lg font-bold mt-1">Live Announcement Ticker Management</h2>
                <p className="text-xs text-muted-foreground">
                  Add, edit, pin, or remove scrolling ticker lines. Changes appear live immediately across the site.
                </p>
              </div>
              <EditNoticeModal onSave={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />
            </div>

            {/* Quick Add Ticker Line Card */}
            <div className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" /> Quick Add New Ticker Line
                </h3>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">⚡ Updates Live Ticker Instantly</span>
              </div>
              <QuickAddTickerForm onAdded={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />
            </div>

            {/* Live Ticker Preview */}
            {announcements.length > 0 && (
              <div className="rounded-2xl border border-primary/30 overflow-hidden bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-primary" /> Current Live Ticker Preview:
                </p>
                <div className="overflow-hidden rounded-xl gradient-temple py-2.5 px-4 shadow-inner">
                  <div className="flex items-center gap-6 whitespace-nowrap text-xs font-medium text-temple-foreground">
                    {announcements.map((a, i) => (
                      <span key={a.id} className="flex items-center gap-2">
                        <Megaphone className="h-3.5 w-3.5" /> <strong>{a.title}:</strong> {a.message}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ticker Items Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {announcements.map((a) => (
                <div key={a.id} className="card-premium flex flex-col justify-between p-5 hover:border-primary/50 transition-colors">
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
                          <Badge variant="outline" className="rounded-full text-primary border-primary font-bold text-[10px]">
                            📌 Pinned to Ticker
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full text-muted-foreground text-[10px]">
                            Standard Ticker Line
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <EditNoticeModal notice={a} onSave={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />
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
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.message}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                    <span className="font-mono">Posted {new Date(a.created_at).toLocaleString("en-IN")}</span>
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

            <div className="card-premium overflow-x-auto p-0">
              <table className="w-full min-w-160 text-xs">
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
                    <tr key={r.id} className="border-t border-border/60 hover:bg-secondary/40 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-primary">{r.pass_code}</td>
                      <td className="p-4 font-semibold text-foreground">{r.full_name}</td>
                      <td className="p-4 font-medium">{r.events?.name}</td>
                      <td className="p-4 text-muted-foreground">{r.phone}</td>
                      <td className="p-4">
                        <Badge variant={r.attended ? "default" : "secondary"} className="rounded-full font-semibold">
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
                <p className="text-xs text-muted-foreground">Sponsor logos and tier badges displayed on home and sponsors page.</p>
              </div>
              <EditSponsorModal onSave={() => qc.invalidateQueries({ queryKey: ["sponsors"] })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((s) => (
                <div key={s.id} className="card-premium flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <Badge className="rounded-full capitalize font-bold gradient-saffron text-primary-foreground">{s.tier}</Badge>
                      <div className="flex items-center gap-1">
                        <EditSponsorModal sponsor={s} onSave={() => qc.invalidateQueries({ queryKey: ["sponsors"] })} />
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
                    {s.website && <p className="mt-1 truncate text-xs text-muted-foreground">{s.website}</p>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 8. GALLERY & MEDIA TAB */}
          <TabsContent value="gallery" className="m-0 space-y-6">
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-bold">Upload Gallery Image (Auto WebP Optimization)</h2>
              <div className="mt-4">
                <AddGalleryItemForm onUploaded={() => qc.invalidateQueries({ queryKey: ["gallery"] })} />
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="font-display font-bold">Existing Photos</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {gallery.map((item) => (
                  <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-border">
                    <img src={item.media_url} alt={item.title} className="aspect-square w-full object-cover" />
                    <button
                      onClick={() => deleteGalleryItem(item.id)}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      title="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <p className="truncate bg-card p-2 text-xs font-semibold">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 9. SITE SETTINGS TAB */}
          <TabsContent value="settings" className="m-0">
            <div className="card-premium p-6">
              <h2 className="font-display text-lg font-bold">Site Configuration & Details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Edit festival dates, live stream URL, donation goal, UPI details, and contact information.
              </p>
              <div className="mt-6">
                <FestivalSettingsForm
                  settings={settings}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["festival-settings"] })}
                />
              </div>
            </div>
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
                    <Bar dataKey="registrations" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
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
  if (status === "approved") {
    return (
      <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-semibold">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="rounded-full gap-1 font-semibold">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
      <Clock className="h-3 w-3" /> Pending Verification
    </Badge>
  );
}

function ViewDonationReceiptModal({ d }: { d: Donation }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="View receipt details">
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
              <span className="font-mono font-bold text-foreground">{d.payment_id || "Offline Cash / UPI"}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Razorpay Order ID:</span>
              <span className="font-mono text-muted-foreground">{d.order_id || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground">Donor Name:</span>
              <span className="font-semibold">{d.donor_name} {d.is_anonymous ? "(Anonymous)" : ""}</span>
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
              <span className="font-semibold">{new Date(d.created_at).toLocaleString("en-IN")}</span>
            </div>
            {d.message && (
              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] font-semibold">Devotional Message:</span>
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
            <Input id="donor_name" name="donor_name" required className="rounded-2xl" placeholder="e.g. Anand Gowda" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input id="amount" name="amount" type="number" min={1} required className="rounded-2xl" placeholder="1001" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" className="rounded-2xl" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address (For Receipt)</Label>
            <Input id="email" name="email" type="email" className="rounded-2xl" placeholder="donor@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Notes / Devotional Message</Label>
            <Input id="message" name="message" className="rounded-2xl" placeholder="e.g. Cash collected at pandal desk" />
          </div>
          <Button disabled={loading} type="submit" className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold">
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
    <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 font-semibold">
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
  const [assignedShift, setAssignedShift] = useState(app.assigned_shift || "Morning Shift (8 AM - 2 PM)");

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
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="View complete details">
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
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Assign Festival Event & Role</p>
            
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
                Approved by {app.approved_by || "Admin"} on {new Date(app.approved_at).toLocaleString("en-IN")}
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
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="truncate font-display text-2xl font-extrabold text-foreground mt-0.5">{value}</p>
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
      res = await supabase.from("events").insert({ ...payload, registration_open: true, is_published: true });
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
          <DialogTitle className="font-display">{event ? `Edit ${event.name}` : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="name">Event Name</Label>
            <Input id="name" name="name" defaultValue={event?.name} required className="rounded-2xl text-xs" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" name="category" defaultValue={event?.category || "cultural"} className="rounded-2xl border border-input bg-background p-2.5 text-xs">
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
                <option value="kids">Kids</option>
                <option value="indoor">Indoor</option>
                <option value="esports">eSports</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event_date">Date</Label>
              <Input id="event_date" name="event_date" type="date" defaultValue={event?.event_date} required className="rounded-2xl text-xs" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input id="start_time" name="start_time" type="time" defaultValue={event?.start_time} required className="rounded-2xl text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" name="venue" defaultValue={event?.venue} required className="rounded-2xl text-xs" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="entry_fee">Entry Fee (₹)</Label>
              <Input id="entry_fee" name="entry_fee" type="number" defaultValue={event?.entry_fee ?? 0} className="rounded-2xl text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_participants">Max Slots</Label>
              <Input id="max_participants" name="max_participants" type="number" defaultValue={event?.max_participants ?? 50} className="rounded-2xl text-xs" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={event?.description} rows={2} className="rounded-2xl text-xs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rules">Event Rules</Label>
            <Textarea id="rules" name="rules" defaultValue={event?.rules ?? ""} rows={2} className="rounded-2xl text-xs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prize_details">Prize Details</Label>
            <Input id="prize_details" name="prize_details" defaultValue={event?.prize_details ?? ""} className="rounded-2xl text-xs" />
          </div>
          <Button disabled={loading} type="submit" className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold">
            {loading ? "Saving..." : "Save Event Live"}
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
      res = await supabase.from("announcements").update({ title, message, type, is_pinned }).eq("id", notice.id);
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
          <DialogTitle className="font-display">{notice ? "Edit Announcement" : "Post Announcement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={notice?.title} required className="rounded-2xl text-xs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" defaultValue={notice?.message} required rows={3} className="rounded-2xl text-xs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" defaultValue={notice?.type || "update"} className="rounded-2xl border border-input bg-background p-2.5 text-xs">
              <option value="update">Update</option>
              <option value="urgent">Urgent</option>
              <option value="winner">Winner</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="is_pinned" name="is_pinned" defaultChecked={notice?.is_pinned} className="h-4 w-4 rounded border-border text-primary" />
            <Label htmlFor="is_pinned">Pin to ticker</Label>
          </div>
          <Button disabled={loading} type="submit" className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold">
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
      res = await supabase.from("sponsors").update({ name, tier, website: website || null }).eq("id", sponsor.id);
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
          <DialogTitle className="font-display">{sponsor ? "Edit Sponsor" : "Add New Sponsor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-2">
            <Label htmlFor="name">Business / Sponsor Name</Label>
            <Input id="name" name="name" defaultValue={sponsor?.name} required className="rounded-2xl text-xs" placeholder="e.g. Royal Sweets Bengaluru" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tier">Tier</Label>
            <select id="tier" name="tier" defaultValue={sponsor?.tier || "gold"} className="rounded-2xl border border-input bg-background p-2.5 text-xs capitalize">
              <option value="title">Title Sponsor</option>
              <option value="platinum">Platinum</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="associate">Associate</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website URL (Optional)</Label>
            <Input id="website" name="website" type="url" defaultValue={sponsor?.website ?? ""} className="rounded-2xl text-xs" placeholder="https://example.com" />
          </div>
          <Button disabled={loading} type="submit" className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold">
            {loading ? "Saving..." : "Save Sponsor"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 4. Add Gallery Photo Form
function AddGalleryItemForm({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("aarti");
  const [optimizedData, setOptimizedData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !optimizedData) {
      toast.error("Please provide a title and upload an image");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("gallery_items").insert({
      title,
      category,
      media_url: optimizedData,
      media_type: "image",
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Photo published live to gallery!");
      setTitle("");
      setOptimizedData(null);
      onUploaded();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 text-xs">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="g-title">Photo Title / Caption</Label>
          <Input
            id="g-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-2xl text-xs"
            placeholder="e.g. Evening Maha Aarti Celebrations"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-cat">Category</Label>
          <select
            id="g-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-2xl border border-input bg-background p-2.5 text-xs"
          >
            <option value="aarti">Aarti & Puja</option>
            <option value="events">Events & Competitions</option>
            <option value="cultural">Cultural Performances</option>
            <option value="visarjan">Visarjan Procession</option>
          </select>
        </div>
      </div>

      <ImageUploader
        label="Upload & Compress Photo to WebP"
        onImageOptimized={(res) => setOptimizedData(res.dataUrl)}
      />

      <Button
        disabled={loading || !optimizedData}
        type="submit"
        className="w-full rounded-full gradient-saffron text-primary-foreground font-bold"
      >
        {loading ? "Publishing..." : "Add to Live Gallery"}
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
    const { error } = await supabase
      .from("festival_settings")
      .upsert({
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
    <form key={settings ? `${settings.id}-${settings.contact_email}-${settings.contact_phone}` : "settings-loading"} onSubmit={handleSubmit} className="grid gap-4 text-xs">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="festival_name">Festival Name</Label>
          <Input id="festival_name" name="festival_name" defaultValue={settings?.festival_name ?? "Ganapathi Festival 2026"} required className="rounded-2xl text-xs" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={settings?.start_date ?? "2026-09-14"} required className="rounded-2xl text-xs" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={settings?.end_date ?? "2026-09-24"} required className="rounded-2xl text-xs" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="live_stream_url">Live Stream YouTube / Video URL</Label>
          <Input id="live_stream_url" name="live_stream_url" defaultValue={settings?.live_stream_url ?? "https://www.youtube.com/embed/live_stream?channel=UCexample"} className="rounded-2xl text-xs" placeholder="YouTube embed or video URL" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="donation_goal">Donation Target Goal (₹)</Label>
          <Input id="donation_goal" name="donation_goal" type="number" defaultValue={settings?.donation_goal ?? 500000} required className="rounded-2xl text-xs" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="upi_id">UPI ID for Donations</Label>
          <Input id="upi_id" name="upi_id" defaultValue={settings?.upi_id ?? "mandal@upi"} className="rounded-2xl text-xs" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input id="contact_phone" name="contact_phone" defaultValue={settings?.contact_phone ?? "+91 98765 43210"} className="rounded-2xl text-xs" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input id="contact_email" name="contact_email" type="email" defaultValue={settings?.contact_email ?? "info@ganapathifestival.org"} className="rounded-2xl text-xs" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Festival Pandal Address</Label>
        <Textarea id="address" name="address" defaultValue={settings?.address ?? "Main Mandap, Indiranagar, Bengaluru, Karnataka 560038"} rows={2} className="rounded-2xl text-xs" />
      </div>

      <Button disabled={loading} type="submit" className="w-full rounded-full gradient-saffron text-primary-foreground font-bold mt-2">
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
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black" title="Edit memory">
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
          <DialogTitle className="font-display">{memory ? `Edit ${memory.year} Memory` : "Add Yearly Memory Card"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-2 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="year">Memory Year (e.g. 2025)</Label>
              <Input id="year" name="year" type="number" defaultValue={memory?.year ?? new Date().getFullYear()} required className="rounded-2xl text-xs" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sort_order">Display Priority Order</Label>
              <Input id="sort_order" name="sort_order" type="number" defaultValue={memory?.sort_order ?? 0} className="rounded-2xl text-xs" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Memory Title</Label>
            <Input id="title" name="title" defaultValue={memory?.title} required className="rounded-2xl text-xs" placeholder="e.g. Silver Jubilee Celebrations 2025" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Bio / Description / Highlights</Label>
            <Textarea id="description" name="description" defaultValue={memory?.description} rows={3} className="rounded-2xl text-xs" placeholder="Highlights, special events, crowd count..." />
          </div>

          <div className="grid gap-2">
            <Label>Cover Banner Image (WebP Compressed)</Label>
            <ImageUploader label="Upload Cover Image" onImageOptimized={(res) => setCoverUrl(res.dataUrl)} />
            {coverUrl && (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-xl border border-border">
                <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Add Photo Gallery Images</Label>
            <ImageUploader label="Upload Gallery Photo" onImageOptimized={(res) => setPhotosList([...photosList, res.dataUrl])} />
            
            {photosList.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photosList.map((url, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Gallery ${i}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotosList(photosList.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button disabled={loading} type="submit" className="mt-2 rounded-full gradient-saffron text-primary-foreground font-bold">
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
          <Label htmlFor="t-title" className="font-semibold text-foreground">Ticker Header / Title *</Label>
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
          <Label htmlFor="t-message" className="font-semibold text-foreground">Announcement Line Details *</Label>
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
            <Label htmlFor="t-type" className="text-muted-foreground">Badge Style:</Label>
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
            <Label htmlFor="t-pinned" className="font-semibold cursor-pointer">Pin to ticker stream</Label>
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

