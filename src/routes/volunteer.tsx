import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, CheckCircle2, Clock, XCircle, ShieldCheck, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { sendVolunteerReceivedEmail } from "@/lib/email-service";
import { type VolunteerApplication } from "@/lib/festival";

export const Route = createFileRoute("/volunteer")({
  head: () => ({
    meta: [
      { title: "Volunteer Seva Registration — Ganapathi Festival 2026" },
      { name: "description", content: "Sign up as a volunteer for aarti, prasada distribution, decorations, and crowd management." },
      { property: "og:title", content: "Volunteer Seva Registration — Ganapathi Festival 2026" },
      { property: "og:description", content: "Join the Ganapathi Festival volunteer team." },
    ],
  }),
  component: VolunteerPage,
});

function VolunteerPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<VolunteerApplication | null>(null);

  // Fetch existing application if user is logged in
  const { data: existingApp, isLoading: isCheckingApp } = useQuery({
    queryKey: ["my-volunteer-app", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<VolunteerApplication | null> => {
      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as VolunteerApplication) ?? null;
    },
  });

  const activeApp = submittedApp || existingApp;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first to submit your volunteer application.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("full_name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? user.email ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();
    const gender = String(fd.get("gender") ?? "Male").trim();
    const duty = String(fd.get("preferred_role") ?? "General Seva").trim();
    const skills = String(fd.get("skills") ?? "").trim();
    const availability = String(fd.get("availability") ?? "").trim();

    // Input Validation
    if (!name || name.length < 2) {
      return toast.error("Please enter your full name.");
    }
    if (!/^[0-9+\s-]{8,15}$/.test(phone)) {
      return toast.error("Please enter a valid 10-digit phone number.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Please enter a valid email address.");
    }

    // Duplicate Registration Check
    if (activeApp) {
      return toast.error("You have already submitted a volunteer application.");
    }

    setLoading(true);

    // Save details to database with status 'pending'
    const { data, error } = await supabase
      .from("volunteers")
      .insert({
        user_id: user.id,
        full_name: name,
        phone,
        email,
        gender,
        address: address || null,
        duty,
        skills: skills || null,
        availability: availability || null,
        status: "pending",
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        toast.error("You have already registered as a volunteer!");
      } else {
        toast.error(error.message);
      }
      return;
    }

    const appData = data as unknown as VolunteerApplication;
    setSubmittedApp(appData);
    qc.invalidateQueries({ queryKey: ["my-volunteer-app"] });
    qc.invalidateQueries({ queryKey: ["volunteers"] });

    // Automatically send confirmation email
    await sendVolunteerReceivedEmail({
      toEmail: email,
      recipientName: name,
    });

    toast.success("Registration submitted! Pending admin verification.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-saffron text-primary-foreground shadow-warm">
          <Users className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold">Join the Seva Team</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
          Serve during the festival for Aarti, Prasada distribution, decorations, cultural stages, and Visarjan procession.
        </p>
      </div>

      {/* If user already registered, display application status card */}
      {activeApp ? (
        <div className="card-premium mt-8 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application Status</p>
              <h2 className="mt-1 font-display text-xl font-bold">{activeApp.full_name}</h2>
            </div>
            <StatusBadge status={activeApp.status} />
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>{activeApp.email || user?.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>{activeApp.phone}</span>
            </div>
            {activeApp.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{activeApp.address}</span>
              </div>
            )}
            <div className="rounded-2xl bg-secondary p-4 mt-2">
              <p className="text-xs font-semibold text-muted-foreground">Preferred Seva Duty:</p>
              <p className="mt-1 font-medium">{activeApp.duty || "General Seva"}</p>

              {activeApp.availability && (
                <>
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">Availability:</p>
                  <p className="mt-1 text-xs text-foreground/80">{activeApp.availability}</p>
                </>
              )}
            </div>
          </div>

          {/* Status Specific Helper Boxes */}
          {activeApp.status === "pending" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4" /> Application Under Review
              </p>
              <p>Your volunteer application has been received and is waiting for Mandal admin verification.</p>
              <p className="pt-1 text-[11px] opacity-90">A confirmation email has been dispatched to {activeApp.email || user?.email}.</p>
            </div>
          )}

          {activeApp.status === "approved" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <ShieldCheck className="h-4 w-4" /> Active Volunteer Verified!
              </p>
              <p>Congratulations! Your volunteer registration is approved. Thank you for your Seva.</p>
            </div>
          )}

          {activeApp.status === "rejected" && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sm">
                <XCircle className="h-4 w-4" /> Application Updated
              </p>
              <p>Your application status has been updated. Contact the mandal team for details.</p>
            </div>
          )}
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={submit} className="card-premium mt-8 grid gap-4 p-6 sm:p-8">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" name="full_name" required maxLength={100} className="rounded-2xl" placeholder="e.g. Ramesh Kumar" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" name="phone" required maxLength={15} className="rounded-2xl" placeholder="+91 98765 43210" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email} required maxLength={255} className="rounded-2xl" placeholder="you@example.com" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender *</Label>
              <select id="gender" name="gender" defaultValue="Male" className="rounded-2xl border border-input bg-background p-2.5 text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address / City</Label>
              <Input id="address" name="address" maxLength={200} className="rounded-2xl" placeholder="e.g. Indiranagar, Bengaluru" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="preferred_role">Preferred Seva Duty</Label>
            <select id="preferred_role" name="preferred_role" className="rounded-2xl border border-input bg-background p-2.5 text-sm">
              <option value="Aarti & Puja Seva">Aarti & Puja Seva</option>
              <option value="Prasada Distribution">Prasada Distribution</option>
              <option value="Crowd Management & Security">Crowd Management & Security</option>
              <option value="Cultural Stage & Audio">Cultural Stage & Audio</option>
              <option value="Decoration & Cleanliness">Decoration & Cleanliness</option>
              <option value="Visarjan Procession">Visarjan Procession</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skills">Relevant Skills / Experience (Optional)</Label>
            <Input id="skills" name="skills" maxLength={150} className="rounded-2xl" placeholder="e.g. First Aid, Sound Systems, Photography" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="availability">Availability Timings</Label>
            <Textarea id="availability" name="availability" rows={2} maxLength={200} className="rounded-2xl" placeholder="e.g. Evening 6 PM - 9 PM during all festival days" />
          </div>

          <Button disabled={loading} className="mt-2 rounded-full gradient-saffron text-primary-foreground shadow-warm">
            {loading ? "Submitting Application..." : "Submit Volunteer Registration"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            By submitting, your registration will be reviewed by the Mandal Admin Team for approval.
          </p>
        </form>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 px-3 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="rounded-full gap-1 px-3 py-1">
        <XCircle className="h-3.5 w-3.5" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 px-3 py-1">
      <Clock className="h-3.5 w-3.5" /> Pending Verification
    </Badge>
  );
}
