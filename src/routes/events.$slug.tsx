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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  CATEGORY_LABELS,
  eventBySlugQuery,
  eventCountsQuery,
  formatCurrency,
  formatEventDate,
  formatTime,
  myRegistrationsQuery,
  type EventRow,
} from "@/lib/festival";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — Ganapathi Festival 2026` },
        { name: "description", content: `Rules, prizes, timing and online registration for ${name} at Ganapathi Festival 2026.` },
        { property: "og:title", content: `${name} — Ganapathi Festival 2026` },
        { property: "og:description", content: `Register online for ${name} and get your QR event pass.` },
      ],
    };
  },
  component: EventDetail,
});

function EventDetail() {
  const { slug } = Route.useParams();
  const { data: event, isLoading } = useQuery(eventBySlugQuery(slug));
  const { data: counts = {} } = useQuery(eventCountsQuery);
  const { user } = useSession();
  const { data: myRegs = [] } = useQuery(myRegistrationsQuery(user?.id));

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-20"><div className="h-96 animate-pulse rounded-3xl bg-muted" /></div>;
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Event not found</h1>
        <Button asChild className="mt-6 rounded-full"><Link to="/events">Back to events</Link></Button>
      </div>
    );
  }

  const count = counts[event.id] ?? 0;
  const full = count >= event.max_participants;
  const already = myRegs.find((r) => r.event_id === event.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <header className="mt-6 card-premium overflow-hidden">
        <div className="gradient-temple px-6 py-8 text-temple-foreground sm:px-8 sm:py-10">
          <Badge className="rounded-full bg-white/20 text-temple-foreground">
            {CATEGORY_LABELS[event.category] ?? event.category}
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{event.name}</h1>
          <p className="mt-3 max-w-2xl text-sm opacity-95 sm:text-base">{event.description}</p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 sm:p-8">
          <Fact icon={CalendarDays} label="Date" value={formatEventDate(event.event_date)} />
          <Fact icon={Clock} label="Time" value={formatTime(event.start_time)} />
          <Fact icon={MapPin} label="Venue" value={event.venue} />
          <Fact
            icon={IndianRupee}
            label="Entry fee"
            value={event.entry_fee > 0 ? formatCurrency(event.entry_fee) : "Free"}
          />
          <Fact icon={Users} label="Slots" value={`${count} / ${event.max_participants}`} />
          <Fact icon={Users} label="Team size" value={event.team_size > 1 ? `${event.team_size} players` : "Solo"} />
          <Fact
            icon={Users}
            label="Age limit"
            value={event.age_min || event.age_max ? `${event.age_min ?? 0} – ${event.age_max ?? 99} yrs` : "Open"}
          />
          <Fact icon={Phone} label="Organizer" value={`${event.organizer_name ?? "Mandal"} · ${event.organizer_phone ?? ""}`} />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <InfoCard icon={ScrollText} title="Rules" body={event.rules || "Standard festival rules apply."} />
          <InfoCard icon={Trophy} title="Prizes" body={event.prize_details || "Certificates for all participants."} />
        </div>

        <aside className="card-premium h-fit p-6">
          {already ? (
            <>
              <p className="font-display text-lg font-bold text-primary">You're registered!</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pass ID <span className="font-mono font-semibold text-foreground">{already.pass_code}</span>
              </p>
              <Button asChild className="mt-5 w-full rounded-full">
                <Link to="/my-passes">View QR pass</Link>
              </Button>
            </>
          ) : !event.registration_open ? (
            <p className="text-sm font-semibold text-destructive">Registrations are closed for this event.</p>
          ) : full ? (
            <p className="text-sm font-semibold text-destructive">All slots are full.</p>
          ) : user ? (
            <RegisterDialog event={event} userId={user.id} email={user.email ?? ""} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Sign in to register and receive your QR event pass.</p>
              <Button asChild className="mt-5 w-full rounded-full gradient-saffron text-primary-foreground">
                <Link to="/auth">Sign in to register</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-secondary p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, body }: { icon: typeof Trophy; title: string; body: string }) {
  return (
    <section className="card-premium p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{body}</p>
    </section>
  );
}

function RegisterDialog({ event, userId, email }: { event: EventRow; userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { error } = await supabase.from("registrations").insert({
        event_id: event.id,
        user_id: userId,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        address: form.address || null,
        team_name: form.team_name || null,
        teammates: form.teammates || null,
        emergency_contact: form.emergency_contact || null,
        payment_status: event.entry_fee > 0 ? "pending" : "not_required",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      setOpen(false);
      toast.success("Registered! Your QR pass is ready.");
      navigate({ to: "/my-passes" });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "You have already registered for this event." : e.message),
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
        <p className="text-sm text-muted-foreground">
          {event.entry_fee > 0
            ? `Entry fee ${formatCurrency(event.entry_fee)}, payable at the registration desk or via UPI.`
            : "Free entry. Registration closes when slots fill up."}
        </p>
        <DialogTrigger asChild>
          <Button className="mt-5 w-full rounded-full gradient-saffron text-primary-foreground shadow-warm">
            Register now
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Register for {event.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field name="full_name" label="Full name" required maxLength={100} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Phone" required maxLength={15} />
            <Field name="email" label="Email" type="email" defaultValue={email} maxLength={255} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="age" label="Age" type="number" />
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <select id="gender" name="gender" defaultValue="Male" className="rounded-2xl border border-input bg-background p-2.5 text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} maxLength={300} className="rounded-2xl" />
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
                  className="rounded-2xl"
                />
              </div>
            </>
          )}
          <Field name="emergency_contact" label="Emergency contact" maxLength={15} />

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 w-full rounded-full gradient-saffron text-primary-foreground"
          >
            {mutation.isPending ? "Registering…" : "Confirm registration"}
          </Button>
        </form>
      </DialogContent>
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
      <Input id={name} name={name} className="rounded-2xl" {...props} />
    </div>
  );
}
