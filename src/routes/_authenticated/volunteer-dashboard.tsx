import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Search,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Sparkles,
  AlertCircle,
  RotateCcw,
  BadgeCheck,
  HeartHandshake,
  Filter,
  Users,
  Eye,
  Check,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSession, stringToUuid } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  formatEventDate,
  formatTime,
  type VolunteerApplication,
  type Registration,
  type EventRow,
} from "@/lib/festival";
import { EmbeddedQRScanner } from "@/components/features/volunteer/EmbeddedQRScanner";
import { playSuccessChime, playErrorTone } from "@/lib/audio-feedback";

export const Route = createFileRoute("/_authenticated/volunteer-dashboard")({
  head: () => ({
    meta: [
      { title: "Volunteer Seva Dashboard — Ganapathi Festival 2026" },
      {
        name: "description",
        content: "Official Seva Dashboard for QR verification and attendance management.",
      },
      { property: "og:title", content: "Volunteer Seva Dashboard — Ganapathi Festival 2026" },
    ],
  }),
  component: VolunteerDashboardPage,
});

export type ScannedResult = {
  isValid: boolean;
  message: string;
  registration?: Registration | null;
};

function VolunteerDashboardPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  const [scannedResult, setScannedResult] = useState<ScannedResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [manualQuery, setManualQuery] = useState("");
  const [selectedRegDetails, setSelectedRegDetails] = useState<Registration | null>(null);

  // Table Filters & Search
  const [tableSearch, setTableSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  // Fetch Current Volunteer Profile
  const { data: volunteer, isLoading: loadingVol } = useQuery({
    queryKey: ["my-volunteer-app", user?.id, user?.email],
    queryFn: async (): Promise<VolunteerApplication | null> => {
      if (!user) return null;
      const validUuid = stringToUuid(user.id);
      let query = supabase.from("volunteers").select("*");
      if (validUuid && user.email) {
        query = query.or(`user_id.eq.${validUuid},email.ilike.${user.email}`);
      } else if (validUuid) {
        query = query.eq("user_id", validUuid);
      } else if (user.email) {
        query = query.eq("email", user.email);
      } else {
        return null;
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
      if (error) throw new Error(error.message);
      return data && data.length > 0 ? (data[0] as VolunteerApplication) : null;
    },
    enabled: !!user,
  });

  // Fetch All Events for Filter Dropdown
  const { data: eventsList = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<EventRow[]> => {
      const { data } = await supabase.from("events").select("*").order("event_date");
      return (data ?? []) as EventRow[];
    },
  });

  // Fetch All Event Registrations with Realtime Listener
  const { data: registrations = [], refetch: refetchRegs } = useQuery({
    queryKey: ["volunteer-dashboard-registrations"],
    queryFn: async (): Promise<Registration[]> => {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Registration[];
    },
  });

  // Real-time listener for registrations updates (attendance, status)
  useEffect(() => {
    const channel = supabase
      .channel("public:registrations-seva")
      .on("postgres_changes", { event: "*", schema: "public", table: "registrations" }, () => {
        refetchRegs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchRegs]);

  // State to manage continuous camera scanning vs result viewing
  const [scannerActive, setScannerActive] = useState(true);

  // QR Scan Handler
  const handleScanCode = async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode || verifying) return;

    setVerifying(true);

    try {
      let targetCode = cleanCode;
      if (cleanCode.startsWith("{")) {
        try {
          const parsed = JSON.parse(cleanCode);
          targetCode = parsed.pass_code || parsed.pass || parsed.id || cleanCode;
        } catch {}
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(targetCode);
      const orFilter = isUuid
        ? `pass_code.eq.${targetCode},id.eq.${targetCode}`
        : `pass_code.eq.${targetCode}`;

      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const matchedReg = data && data.length > 0 ? data[0] : null;

      if (matchedReg) {
        playSuccessChime();
        setScannerActive(false); // Stop & hide camera preview immediately
        setScannedResult({
          isValid: true,
          message: "Registration Verified Successfully!",
          registration: matchedReg as unknown as Registration,
        });
        toast.success(`Verified: ${matchedReg.full_name} (${matchedReg.pass_code})`);
      } else {
        playErrorTone();
        setScannerActive(false);
        setScannedResult({
          isValid: false,
          message: `No registration found matching code "${targetCode}".`,
        });
        toast.error("Invalid or Unrecognized QR Pass");
      }
    } catch (err: any) {
      playErrorTone();
      setScannerActive(false);
      setScannedResult({
        isValid: false,
        message: err.message || "Failed to query database for scanned QR.",
      });
      toast.error("Scan verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleScanAgain = () => {
    setScannedResult(null);
    setScannerActive(true); // Re-open camera automatically and start scanning
  };

  // Manual Lookup Handler
  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = manualQuery.trim();
    if (!query) return;

    setVerifying(true);
    setScannedResult(null);

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(query);
      const orFilter = isUuid
        ? `pass_code.ilike.%${query}%,id.eq.${query},phone.ilike.%${query}%,full_name.ilike.%${query}%`
        : `pass_code.ilike.%${query}%,phone.ilike.%${query}%,full_name.ilike.%${query}%`;

      const { data, error } = await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .or(orFilter)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setScannedResult({
          isValid: true,
          message: "Registration Found via Manual Lookup!",
          registration: data[0] as unknown as Registration,
        });
        toast.success(`Found Registration: ${data[0].full_name}`);
      } else {
        setScannedResult({
          isValid: false,
          message: `No registration found matching query "${query}".`,
        });
        toast.error("No record found matching manual ID.");
      }
    } catch (err: any) {
      toast.error(err.message || "Manual search error");
    } finally {
      setVerifying(false);
    }
  };

  // One-Click Mark Attendance Handler
  const handleMarkAttendance = async (regId: string) => {
    setMarkingId(regId);
    try {
      const timestamp = new Date().toISOString();
      const { error } = await supabase
        .from("registrations")
        .update({
          attended: true,
          attended_at: timestamp,
        })
        .eq("id", regId);

      if (error) throw error;

      toast.success("Attendance marked successfully!");

      // Update local scan result state if active
      if (scannedResult?.registration?.id === regId) {
        setScannedResult({
          ...scannedResult,
          registration: {
            ...scannedResult.registration,
            attended: true,
            attended_at: timestamp,
          },
        });
      }

      // Update selected detail modal if open
      if (selectedRegDetails?.id === regId) {
        setSelectedRegDetails({
          ...selectedRegDetails,
          attended: true,
          attended_at: timestamp,
        });
      }

      refetchRegs();
      qc.invalidateQueries({ queryKey: ["volunteer-dashboard-registrations"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to mark attendance.");
    } finally {
      setMarkingId(null);
    }
  };

  // Filter Table Data
  const filteredRegistrations = registrations.filter((r) => {
    const q = tableSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.pass_code.toLowerCase().includes(q) ||
      r.full_name.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      (r.events?.name && r.events.name.toLowerCase().includes(q));

    const matchesEvent = eventFilter === "all" || r.event_id === eventFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesAttendance =
      attendanceFilter === "all" ||
      (attendanceFilter === "attended" && r.attended) ||
      (attendanceFilter === "not_attended" && !r.attended);

    return matchesSearch && matchesEvent && matchesStatus && matchesAttendance;
  });

  const totalAttended = registrations.filter((r) => r.attended).length;

  if (loadingVol) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">
          Loading Seva Dashboard...
        </p>
      </div>
    );
  }

  // Application pending / non-approved notice
  if (!volunteer || volunteer.status !== "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 text-center">
        <div className="card-premium border-amber-500/40 bg-amber-500/5 p-6 sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 text-amber-500 animate-pulse">
            <Clock className="h-8 w-8" />
          </div>
          <Badge className="mt-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            {volunteer ? `Status: ${volunteer.status.toUpperCase()}` : "Application Required"}
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Seva Verification Access</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {volunteer
              ? "Your volunteer application is currently under review by the Mandal Organising Committee. Scanner and Seva verification features will unlock upon approval."
              : "You must be an approved volunteer to access the Seva QR Verification & Attendance Dashboard."}
          </p>
          <Button
            asChild
            className="mt-6 rounded-full gradient-saffron text-primary-foreground font-bold"
          >
            <Link to="/volunteer">Apply as Volunteer</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Header & Stat Overview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold">
              <BadgeCheck className="h-3.5 w-3.5" /> VERIFIED SEVA VOLUNTEER
            </Badge>
            <span className="text-xs text-muted-foreground">• Real-time Sync Active</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Seva Attendance & Verification Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official Ganapathi Festival 2026 QR pass scanner & live attendance register.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="card-premium px-4 py-2 flex items-center gap-3 bg-card border-border">
            <div className="grid h-9 w-9 place-items-center rounded-full gradient-saffron text-primary-foreground font-bold">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Registrations
              </span>
              <span className="font-extrabold text-base">{registrations.length}</span>
            </div>
          </div>

          <div className="card-premium px-4 py-2 flex items-center gap-3 bg-card border-border">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white font-bold">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Attended
              </span>
              <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                {totalAttended}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP SECTION: Full-Width Embedded Camera QR Scanner & Manual Lookup */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Full-Width Auto Camera Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Live Camera QR Pass Scanner
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Auto-Scanning
            </span>
          </div>

          <EmbeddedQRScanner
            onScanSuccess={handleScanCode}
            isScanningActive={scannerActive}
            onManualFallback={() => setScannerActive(false)}
          />

          {/* Manual Registration ID Lookup Input Fallback */}
          <div className="card-premium p-4 bg-card border border-border space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-primary" /> Manual Registration ID / Phone
              Fallback Lookup
            </label>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <Input
                placeholder="Enter Registration ID (e.g. EVT-123456) or Mobile Number..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="rounded-2xl text-xs"
              />
              <Button
                type="submit"
                disabled={verifying}
                className="rounded-full gradient-saffron text-primary-foreground font-bold px-5 text-xs shrink-0"
              >
                {verifying ? "Searching..." : "Lookup ID"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: Scan Verification Result Card */}
        <div className="lg:col-span-5">
          <div className="h-full space-y-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Scanned Pass Verification Details
            </h2>

            {scannedResult ? (
              scannedResult.isValid && scannedResult.registration ? (
                /* VERIFIED SUCCESS CARD */
                <div className="card-premium p-6 border-2 border-emerald-500/50 bg-emerald-500/5 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
                    <Badge className="rounded-full bg-emerald-600 text-white font-bold px-3 py-1 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> VERIFIED REGISTRATION PASS
                    </Badge>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {scannedResult.registration.pass_code}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Event Name
                      </span>
                      <h3 className="font-display text-xl font-extrabold text-foreground">
                        {scannedResult.registration.events?.name || "Festival Competition / Event"}
                      </h3>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                      <div className="rounded-2xl bg-card p-3 border border-border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">
                          Attendee Name
                        </span>
                        <span className="font-bold text-foreground text-sm">
                          {scannedResult.registration.full_name}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-card p-3 border border-border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">
                          Mobile Contact
                        </span>
                        <span className="font-bold text-foreground text-sm">
                          {scannedResult.registration.phone}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-card p-3 border border-border sm:col-span-2">
                        <span className="text-muted-foreground block text-[10px] font-semibold">
                          Email Address
                        </span>
                        <span className="font-semibold text-foreground">
                          {scannedResult.registration.email || "Not provided"}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-card p-3 border border-border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">
                          Registration Date
                        </span>
                        <span className="font-semibold">
                          {new Date(scannedResult.registration.created_at).toLocaleDateString(
                            "en-IN",
                          )}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-card p-3 border border-border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">
                          Venue Location
                        </span>
                        <span className="font-semibold">
                          {scannedResult.registration.events?.venue || "Main Stage"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Action & Scan Again Buttons */}
                  <div className="border-t border-emerald-500/20 pt-4 space-y-2">
                    {scannedResult.registration.attended ? (
                      <div className="rounded-2xl bg-emerald-500/20 p-4 border border-emerald-500/40 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                          <CheckCircle2 className="h-5 w-5" /> ATTENDANCE MARKED
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Timestamp:{" "}
                          {new Date(scannedResult.registration.attended_at || "").toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    ) : (
                      <Button
                        disabled={markingId === scannedResult.registration.id}
                        onClick={() => handleMarkAttendance(scannedResult.registration!.id)}
                        className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-6 text-sm shadow-lg animate-bounce"
                      >
                        <UserCheck className="mr-2 h-5 w-5" />
                        {markingId === scannedResult.registration.id
                          ? "Marking..."
                          : "One-Click Mark Attendance"}
                      </Button>
                    )}

                    <Button
                      onClick={handleScanAgain}
                      variant="outline"
                      className="w-full rounded-full font-bold border-emerald-500/40 text-foreground py-5 text-xs"
                    >
                      <RotateCcw className="mr-2 h-4 w-4 text-emerald-600" /> Scan Again
                    </Button>
                  </div>
                </div>
              ) : (
                /* INVALID SCAN RESULT CARD */
                <div className="card-premium p-6 border-2 border-destructive/40 bg-destructive/5 text-center space-y-4 shadow-xl">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/15 text-destructive">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <Badge variant="destructive" className="rounded-full">
                    QR Verification Failed
                  </Badge>
                  <h3 className="font-display text-lg font-bold">{scannedResult.message}</h3>
                  <p className="text-xs text-muted-foreground">
                    Ensure the pass belongs to Ganapathi Festival 2026 or use manual search.
                  </p>

                  <Button
                    onClick={handleScanAgain}
                    className="w-full rounded-full gradient-saffron text-primary-foreground font-bold py-5 text-xs"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Scan Again
                  </Button>
                </div>
              )
            ) : (
              /* EMPTY SCANNER INSTRUCTION STATE */
              <div className="card-premium h-[380px] p-6 text-center flex flex-col items-center justify-center border-dashed border-2 border-border text-muted-foreground space-y-3">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-secondary text-primary">
                  <QrCode className="h-8 w-8" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Waiting for Camera Scan
                </h3>
                <p className="text-xs max-w-xs leading-relaxed">
                  Point the camera at the attendee's QR code pass or enter their Registration ID
                  manually to verify and mark attendance instantly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Searchable Interactive Registrations & Attendance Table */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Live Event Registrations & Attendance
              Register
            </h2>
            <p className="text-xs text-muted-foreground">
              Search, filter, and track attendance status for all festival participants in real
              time.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 border border-border">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, Name, Phone..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 rounded-2xl text-xs"
              />
            </div>

            {/* Event Filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-2xl border border-input bg-background px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Events ({eventsList.length})</option>
              {eventsList.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>

            {/* Attendance Filter */}
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              className="rounded-2xl border border-input bg-background px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All Attendance</option>
              <option value="attended">Attended Only</option>
              <option value="not_attended">Not Attended</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground font-semibold">
            Showing <b>{filteredRegistrations.length}</b> of {registrations.length} Registrations
          </div>
        </div>

        {/* Registrations Table */}
        <div className="card-premium overflow-x-auto p-0">
          <table className="w-full min-w-200 text-xs">
            <thead className="bg-secondary/80 text-left uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="p-4">Reg ID</th>
                <th className="p-4">Attendee Name</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Event</th>
                <th className="p-4">Status</th>
                <th className="p-4">Attendance</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedRegDetails(r)}
                >
                  <td className="p-4 font-mono font-bold text-primary">{r.pass_code}</td>
                  <td className="p-4 font-bold text-foreground">{r.full_name}</td>
                  <td className="p-4">
                    <div className="font-semibold">{r.phone}</div>
                    <div className="text-muted-foreground text-[11px] truncate max-w-xs">
                      {r.email || "No email"}
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-foreground">
                    {r.events?.name || "General Event"}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={r.status === "confirmed" ? "default" : "outline"}
                      className="rounded-full capitalize"
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {r.attended ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2.5 py-1 rounded-full text-[11px]">
                        <Check className="h-3.5 w-3.5" /> Attended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/15 px-2.5 py-1 rounded-full text-[11px]">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {r.attended ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="rounded-full text-[11px] h-7 px-3"
                      >
                        <Check className="mr-1 h-3 w-3 text-emerald-500" /> Done
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={markingId === r.id}
                        onClick={() => handleMarkAttendance(r.id)}
                        className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-7 px-3"
                      >
                        Mark Attendance
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No registrations found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION FULL DETAILS MODAL */}
      {selectedRegDetails && (
        <Dialog open={!!selectedRegDetails} onOpenChange={() => setSelectedRegDetails(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center justify-between">
                <span>Registration Details</span>
                <span className="font-mono text-xs text-primary">
                  {selectedRegDetails.pass_code}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs pt-2">
              <div className="rounded-2xl bg-secondary p-4 space-y-2 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event:</span>
                  <span className="font-bold text-foreground">
                    {selectedRegDetails.events?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="font-bold text-foreground">{selectedRegDetails.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number:</span>
                  <span className="font-semibold">{selectedRegDetails.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-semibold">{selectedRegDetails.email || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {selectedRegDetails.status}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl bg-card p-4 border border-border text-center space-y-3">
                <span className="text-muted-foreground font-semibold block">
                  Attendance Verification
                </span>
                {selectedRegDetails.attended ? (
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5" /> Attended at{" "}
                    {new Date(selectedRegDetails.attended_at || "").toLocaleString("en-IN")}
                  </div>
                ) : (
                  <Button
                    disabled={markingId === selectedRegDetails.id}
                    onClick={() => handleMarkAttendance(selectedRegDetails.id)}
                    className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Mark Attendance Now
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
