import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Trophy,
  ScrollText,
  Phone,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Share2,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession, stringToUuid } from "@/hooks/use-session";
import {
  eventBySlugQuery,
  eventCountsQuery,
  formatCurrency,
  formatEventDate,
  formatTime,
  myRegistrationsQuery,
  type EventRow,
  type Registration,
} from "@/lib/festival";
import heroGanapathi from "@/assets/ganapathi-hero.jpg";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Ganapathi Festival 2026` },
        {
          name: "description",
          content: `Rules, prizes, timing and online registration for ${name} at Ganapathi Festival 2026.`,
        },
        { property: "og:title", content: `${name} — Ganapathi Festival 2026` },
        {
          property: "og:description",
          content: `Register online for ${name} and get your QR event pass.`,
        },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useQuery(eventBySlugQuery(slug));
  const { data: counts = {} } = useQuery(eventCountsQuery);
  const { user } = useSession();
  const { data: myRegs = [] } = useQuery(myRegistrationsQuery(user?.id));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-900 border border-slate-800" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Event not found.</h1>
        <p className="mt-2 text-xs text-slate-400">The requested event could not be found.</p>
        <Button asChild className="mt-6 rounded-full gradient-saffron text-slate-950 font-bold">
          <Link to="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const count = counts[event.id] ?? 0;
  const full = count >= event.max_participants;
  const already = myRegs.find((r) => r.event_id === event.id);

  // Generate Google Calendar Link
  const handleAddToCalendar = () => {
    try {
      const eventDate = new Date(event.event_date);
      const startTime = event.start_time || "19:00:00";
      const [hours, minutes] = startTime.split(":").map(Number);
      
      const startDateTime = new Date(eventDate);
      startDateTime.setHours(hours || 19, minutes || 0, 0);

      const endDateTime = new Date(startDateTime.getTime() + 2 * 3600 * 1000); // 2 hours duration

      const formatCalDate = (d: Date) =>
        d.toISOString().replace(/-|:|\.\d+/g, "");

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        event.name,
      )}&dates=${formatCalDate(startDateTime)}/${formatCalDate(
        endDateTime,
      )}&details=${encodeURIComponent(
        event.description || "Shanthi Maha Ganapathi Utsav Event",
      )}&location=${encodeURIComponent(event.venue || "Sri Ganapathi Mandal, Chitradurga")}`;

      window.open(gcalUrl, "_blank");
      toast.success("📅 Calendar event created!");
    } catch {
      toast.error("Could not generate calendar link.");
    }
  };

  // Highlights list
  const highlights = event.rules
    ? event.rules.split("\n").filter((r) => r.trim().length > 0).slice(0, 4)
    : ["Maha Aarti", "Bhajans", "Prasadam Distribution", "Fireworks"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <div className="mx-auto max-w-lg px-4 py-4 sm:py-6">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate({ to: "/events" })}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="font-display text-xl font-bold text-amber-300 tracking-wide text-center flex-1">
            Event Details
          </h1>

          <div className="w-9" />
        </div>

        {/* MAIN EVENT CARD (Matches Mockup Design) */}
        <div className="rounded-3xl bg-[#FDFBF7] dark:bg-stone-900/90 border border-amber-500/30 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
          {/* Top Event Poster Image */}
          <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-slate-950">
            <img
              src={event.poster_url || heroGanapathi}
              alt={event.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          </div>

          {/* Card Content */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Title */}
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-amber-200">
                {event.name}
              </h2>

              {/* Date & Time Badge */}
              <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400">
                <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  {formatEventDate(event.event_date)}, {formatTime(event.start_time)}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {event.description || "Join us for divine celebrations and seek blessings of Lord Ganapathi."}
            </p>

            {/* Event Highlights Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-stone-800">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-amber-300 mb-3">
                Event Highlights
              </h3>
              <div className="space-y-2">
                {highlights.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Facts Pills Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Venue</span>
                <span className="font-bold truncate block">{event.venue}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-stone-800/80 border border-slate-200 dark:border-stone-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Entry Fee</span>
                <span className="font-bold truncate block">
                  {event.entry_fee > 0 ? formatCurrency(event.entry_fee) : "Free Entry"}
                </span>
              </div>
            </div>

            {/* Main Action Buttons: Add to Calendar & Register */}
            <div className="pt-3 space-y-2.5">
              <button
                onClick={handleAddToCalendar}
                className="w-full py-3.5 rounded-full gradient-saffron text-slate-950 font-bold text-xs sm:text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 fill-slate-950" />
                <span>Add to Calendar</span>
              </button>

              {already ? (
                <Button asChild variant="outline" className="w-full rounded-full border-amber-500/40 text-amber-400 font-bold text-xs">
                  <Link to="/my-passes">
                    <Ticket className="w-4 h-4 mr-1.5" /> View QR Pass (Pass: {already.pass_code})
                  </Link>
                </Button>
              ) : !event.registration_open ? (
                <p className="text-center text-xs font-semibold text-red-400">
                  Registrations are currently closed.
                </p>
              ) : full ? (
                <p className="text-center text-xs font-semibold text-red-400">All slots are full.</p>
              ) : user ? (
                <RegisterDialog event={event} userId={stringToUuid(user.id)} email={user.email ?? ""} />
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-full border-slate-700 text-slate-300 font-bold text-xs"
                >
                  <Link to="/auth">Sign in to Register Online</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { RegistrationSuccessModal } from "@/components/features/registrations/RegistrationSuccessModal";
import { notifyEventPassConfirmed } from "@/lib/services/onesignal-service";

function RegisterDialog({
  event,
  userId,
  email,
}: {
  event: EventRow;
  userId: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [confirmedReg, setConfirmedReg] = useState<Registration | null>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const generatedPassCode = `EVT-${Math.floor(100000 + Math.random() * 900000)}`;

      const { data, error } = await supabase
        .from("registrations")
        .insert({
          event_id: event.id,
          user_id: userId,
          pass_code: generatedPassCode,
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          address: form.address || null,
          team_name: form.team_name || null,
          teammates: form.teammates || null,
          emergency_contact: form.emergency_contact || null,
          status: "confirmed",
          payment_status: event.entry_fee > 0 ? "pending" : "not_required",
        })
        .select("*, events(name, event_date, start_time, venue, slug)")
        .single();

      if (error) throw new Error(error.message);
      return data as unknown as Registration;
    },
    onSuccess: (newReg) => {
      qc.invalidateQueries();
      setOpen(false);
      setConfirmedReg(newReg);
      setSuccessModalOpen(true);
      toast.success("Registration Confirmed! Your QR pass is generated.");

      notifyEventPassConfirmed({
        userId,
        eventName: event.name,
        passCode: newReg.pass_code,
      });
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("duplicate") ? "You have already registered for this event." : e.message,
      ),
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (!form.full_name?.trim() || !form.phone?.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    if (!/^[0-9+\s-]{8,15}$/.test(form.phone.trim())) {
      toast.error("Enter a valid phone number.");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full rounded-full border-amber-500/40 text-amber-400 font-bold text-xs">
            Register Online for Pass
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg rounded-3xl bg-slate-950 border border-amber-500/40 text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-display text-amber-300">Register for {event.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 mt-2">
          <Field name="full_name" label="Full name" required maxLength={100} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Phone" required maxLength={15} />
            <Field name="email" label="Email" type="email" defaultValue={email} maxLength={255} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="age" label="Age" type="number" />
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                defaultValue="Male"
                className="rounded-2xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              maxLength={300}
              className="rounded-2xl border-slate-700 bg-slate-900"
            />
          </div>
          {event.team_size > 1 && (
            <>
              <Field name="team_name" label="Team name" maxLength={60} />
              <div className="grid gap-2">
                <Label htmlFor="teammates">Teammates ({event.team_size} players)</Label>
                <Textarea
                  id="teammates"
                  name="teammates"
                  rows={2}
                  maxLength={500}
                  placeholder="One name per line"
                  className="rounded-2xl border-slate-700 bg-slate-900"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 w-full rounded-full gradient-saffron text-slate-950 font-bold"
          >
            {mutation.isPending ? "Registering…" : "Confirm Registration"}
          </Button>
        </form>
      </DialogContent>
      <RegistrationSuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
        registration={confirmedReg}
      />
    </Dialog>
  );
}

function Field({
  name,
  label,
  ...props
}: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="rounded-2xl border-slate-700 bg-slate-900 text-slate-100" {...props} />
    </div>
  );
}
