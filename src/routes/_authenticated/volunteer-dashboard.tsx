import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  QrCode,
  Printer,
  Sparkles,
  Award,
  BadgeCheck,
  HeartHandshake,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate, type VolunteerApplication, type EventRow } from "@/lib/festival";
import { QRScannerModal } from "@/components/volunteer/QRScannerModal";

export const Route = createFileRoute("/_authenticated/volunteer-dashboard")({
  head: () => ({
    meta: [
      { title: "Volunteer Seva Dashboard — Ganapathi Festival 2026" },
      { name: "description", content: "Official Seva Dashboard for approved festival volunteers." },
      { property: "og:title", content: "Volunteer Seva Dashboard — Ganapathi Festival 2026" },
    ],
  }),
  component: VolunteerDashboardPage,
});

function VolunteerDashboardPage() {
  const { user } = useSession();

  // Fetch current user's volunteer application
  const { data: volunteer, isLoading: loadingVol } = useQuery({
    queryKey: ["my-volunteer-app", user?.id, user?.email],
    queryFn: async (): Promise<VolunteerApplication | null> => {
      if (!user) return null;
      // Search by user_id or email match
      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);
      return data && data.length > 0 ? (data[0] as VolunteerApplication) : null;
    },
    enabled: !!user,
  });

  // Fetch assigned event details if available
  const { data: assignedEvent } = useQuery({
    queryKey: ["assigned-event", volunteer?.assigned_event_id],
    queryFn: async (): Promise<EventRow | null> => {
      if (!volunteer?.assigned_event_id) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", volunteer.assigned_event_id)
        .single();
      if (error) return null;
      return data as EventRow;
    },
    enabled: !!volunteer?.assigned_event_id,
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (volunteer) {
      QRCode.toDataURL(`VOLUNTEER:${volunteer.id}:${volunteer.full_name}:${volunteer.phone}`, {
        width: 240,
        margin: 1,
        color: { dark: "#ea580c", light: "#ffffff" },
      })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(""));
    }
  }, [volunteer]);

  const handlePrintBadge = () => {
    window.print();
  };

  if (loadingVol) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Loading your Volunteer Profile...</p>
      </div>
    );
  }

  // 1. NO APPLICATION FOUND
  if (!volunteer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-secondary text-primary">
          <HeartHandshake className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">No Volunteer Application Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't submitted a volunteer registration for Ganapathi Festival 2026 yet.
        </p>
        <Button asChild className="mt-6 rounded-full gradient-saffron text-primary-foreground font-bold">
          <Link to="/volunteer">Apply as Volunteer Now</Link>
        </Button>
      </div>
    );
  }

  // 2. PENDING APPROVAL SCREEN
  if (volunteer.status === "pending") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="card-premium border-amber-500/40 bg-amber-500/5 p-6 sm:p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/15 text-amber-500 animate-pulse">
            <Clock className="h-8 w-8" />
          </div>
          <Badge className="mt-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
            Status: Application Under Review
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-extrabold">Volunteer Application Received</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Thank you, <b>{volunteer.full_name}</b>! Your volunteer registration is currently pending review by the Mandal Organising Committee.
          </p>

          <div className="mt-6 rounded-2xl bg-card p-4 text-left border border-border text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registered Email:</span>
              <span className="font-semibold">{volunteer.email || user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile Phone:</span>
              <span className="font-semibold">{volunteer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preferred Seva:</span>
              <span className="font-semibold">{volunteer.duty || "General Seva"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submission Date:</span>
              <span className="font-semibold">{new Date(volunteer.created_at).toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-amber-600 dark:text-amber-400">
            Once approved by our team, full dashboard access and your assigned Seva event details will unlock here automatically.
          </div>
        </div>
      </div>
    );
  }

  // 3. REJECTED APPLICATION SCREEN
  if (volunteer.status === "rejected") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="card-premium border-destructive/40 bg-destructive/5 p-6 sm:p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive">
            <XCircle className="h-8 w-8" />
          </div>
          <Badge variant="destructive" className="mt-4 rounded-full">
            Status: Application Not Approved
          </Badge>
          <h1 className="mt-3 font-display text-2xl font-bold">Application Status</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Dear <b>{volunteer.full_name}</b>, all volunteer slots for your preferred category have been filled for this festival edition. We sincerely appreciate your intention to serve.
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 4. APPROVED VOLUNTEER DASHBOARD (ACCESS GRANTED)
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold">
              <BadgeCheck className="h-3.5 w-3.5" /> VERIFIED APPROVED VOLUNTEER
            </Badge>
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome, {volunteer.full_name}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official Volunteer Seva Dashboard & Assigned Duties — Ganapathi Festival 2026.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QRScannerModal />
          <Button
            onClick={handlePrintBadge}
            variant="outline"
            className="rounded-full font-bold"
          >
            <Printer className="mr-2 h-4 w-4" /> Print Seva ID Badge
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left Column: Official Volunteer Badge Card */}
        <div className="lg:col-span-1">
          <div className="card-premium relative overflow-hidden p-6 text-center border-2 border-primary/40 bg-gradient-to-b from-primary/5 via-card to-card">
            <div className="absolute right-0 top-0 h-24 w-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl gradient-saffron text-primary-foreground shadow-warm">
              <Award className="h-10 w-10" />
            </div>

            <h2 className="mt-4 font-display text-xl font-extrabold">{volunteer.full_name}</h2>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mt-0.5">
              {volunteer.assigned_role || volunteer.duty || "Festival Seva Volunteer"}
            </p>

            <div className="mt-4 flex justify-center">
              <div className="rounded-2xl bg-white p-3 shadow-inner">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Volunteer QR Badge" className="h-28 w-28 object-contain" />
                ) : (
                  <div className="h-28 w-28 bg-muted animate-pulse rounded-lg" />
                )}
              </div>
            </div>

            <p className="mt-3 font-mono text-[11px] font-bold text-muted-foreground uppercase">
              ID: {volunteer.id.slice(0, 8)}
            </p>

            <div className="mt-4 rounded-2xl bg-secondary p-3 text-xs text-left space-y-1.5 border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">ACTIVE VOLUNTEER</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved On:</span>
                <span className="font-semibold">
                  {volunteer.approved_at ? new Date(volunteer.approved_at).toLocaleDateString("en-IN") : "Verified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified By:</span>
                <span className="font-semibold">{volunteer.approved_by || "Mandal Committee"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Assigned Event & Complete Registration Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* ASSIGNED EVENT DETAILS CARD */}
          <div className="card-premium p-6 border-emerald-500/40 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <Badge className="rounded-full bg-emerald-600 text-white font-bold px-3 py-1">
                ASSIGNED SEVA EVENT & TASK
              </Badge>
              <Sparkles className="h-5 w-5 text-emerald-500 animate-pulse" />
            </div>

            {assignedEvent ? (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{assignedEvent.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{assignedEvent.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="flex items-center gap-2 rounded-2xl bg-card p-3 border border-border">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Event Date</span>
                      <span className="font-bold text-foreground">{formatEventDate(assignedEvent.event_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-card p-3 border border-border">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Reporting Time & Shift</span>
                      <span className="font-bold text-foreground">{assignedEvent.start_time} ({volunteer.assigned_shift || "Full Day Shift"})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-card p-3 border border-border sm:col-span-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Venue / Reporting Location</span>
                      <span className="font-bold text-foreground">{assignedEvent.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">Your Assigned Task & Responsibilities</span>
                  <p className="mt-1 font-display text-base font-extrabold text-foreground">
                    {volunteer.assigned_role || volunteer.duty || "General Pandal & Annadana Management"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <h3 className="font-display text-xl font-bold text-foreground">General Festival Seva</h3>
                <p className="text-xs text-muted-foreground">
                  You are assigned to General Pandal Operations, Annadana Distribution, and Visitor Coordination.
                </p>
                <div className="rounded-2xl bg-card p-3 border border-border text-xs flex justify-between">
                  <span className="text-muted-foreground">Assigned Role:</span>
                  <span className="font-bold text-primary">{volunteer.assigned_role || volunteer.duty || "General Seva"}</span>
                </div>
                <div className="rounded-2xl bg-card p-3 border border-border text-xs flex justify-between">
                  <span className="text-muted-foreground">Assigned Shift:</span>
                  <span className="font-bold">{volunteer.assigned_shift || "Morning / Evening Shift"}</span>
                </div>
              </div>
            )}
          </div>

          {/* COMPLETE SUBMITTED REGISTRATION FORM DETAILS */}
          <div className="card-premium p-6">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Submitted Registration Form Information
            </h3>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Full Name:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.full_name}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Registered Email:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.email || "Not specified"}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" /> Mobile Phone:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.phone}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Residential Address:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.address || "Bengaluru"}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-primary" /> Preferred Seva Department:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.duty || "General Seva"}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border">
                <dt className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Availability Timings:
                </dt>
                <dd className="mt-1 font-bold text-sm text-foreground">{volunteer.availability || "Flexible"}</dd>
              </div>

              <div className="rounded-2xl bg-secondary p-3.5 border border-border sm:col-span-2">
                <dt className="text-muted-foreground font-semibold">Submitted Relevant Skills / Notes:</dt>
                <dd className="mt-1 font-medium text-foreground">{volunteer.skills || "None specified"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
