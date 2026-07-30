import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Ticket,
  HandHeart,
  Users,
  Radio,
  Images,
  Megaphone,
  Eye,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/site/Countdown";
import { EventCard } from "@/components/site/EventCard";
import { OptimizedImage } from "@/components/ui/optimized-image";
import {
  announcementsQuery,
  eventCountsQuery,
  eventsQuery,
  formatTime,
  galleryQuery,
  liveStatsQuery,
  settingsQuery,
  sponsorsQuery,
} from "@/lib/festival";
import hero from "@/assets/ganapathi-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ganapathi Festival 2026 — 11 Days of Devotion & Celebration" },
      {
        name: "description",
        content:
          "Countdown, daily schedule, competitions, QR event passes, live darshan, gallery and donations for Ganapathi Festival 2026 in Bengaluru.",
      },
      { property: "og:title", content: "Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Register for competitions, get your QR pass, watch live darshan and support the mandal.",
      },
    ],
  }),
  component: Home,
});

const QUICK_ACTIONS = [
  { to: "/events", label: "Browse Events", icon: CalendarDays },
  { to: "/my-passes", label: "My QR Passes", icon: Ticket },
  { to: "/donate", label: "Donate", icon: HandHeart },
  { to: "/volunteer", label: "Volunteer", icon: Users },
  { to: "/live", label: "Live Darshan", icon: Radio },
  { to: "/gallery", label: "Gallery", icon: Images },
] as const;

function Home() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: announcements = [] } = useQuery(announcementsQuery);
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  const { data: gallery = [] } = useQuery(galleryQuery);
  const { data: counts = {} } = useQuery(eventCountsQuery);
  const { data: stats } = useQuery(liveStatsQuery);

  const visitors = stats?.liveVisitors ?? 1250;

  // Local YYYY-MM-DD date calculation
  const today = new Date().toLocaleDateString("en-CA");
  const todaysEvents = events.filter((e) => e.event_date === today);
  const upcoming = events.filter((e) => e.event_date >= today).slice(0, 6);
  const scheduleForStrip = todaysEvents.length ? todaysEvents : events.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <OptimizedImage
          src={hero}
          priority={true}
          alt="Decorated Ganesha idol at the festival pandal"
          width={1536}
          height={1024}
          containerClassName="absolute inset-0 h-full w-full"
          className="h-full w-full object-cover object-top sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent sm:from-background/90 sm:via-background/60 sm:to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
          <div className="max-w-2xl">
            <Badge className="rounded-full gradient-temple px-4 py-1.5 text-temple-foreground font-semibold">
              {(() => {
                const sDate = settings?.start_date ? new Date(settings.start_date) : new Date("2026-09-14");
                const eDate = settings?.end_date ? new Date(settings.end_date) : new Date("2026-09-24");
                const sDay = sDate.getDate();
                const eDay = eDate.getDate();
                const mYear = sDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
                const city = settings?.address ? settings.address.split(",").pop()?.trim() || "Bengaluru" : "Bengaluru";
                return `${sDay} – ${eDay} ${mYear} · ${city}`;
              })()}
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              <span className="text-gradient-saffron">{settings?.festival_name || "Ganapathi Festival 2026"}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-foreground/85 sm:text-lg">
              {(() => {
                const sDate = settings?.start_date ? new Date(settings.start_date) : new Date("2026-09-14");
                const eDate = settings?.end_date ? new Date(settings.end_date) : new Date("2026-09-24");
                const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
                const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                const dayWords: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven" };
                const word = dayWords[days] || `${days}`;
                return `${word} days of aarti, culture, sport and seva. Register for competitions, collect your QR pass, and celebrate with the whole neighbourhood.`;
              })()}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full gradient-saffron px-7 text-primary-foreground shadow-warm">
                <Link to="/events">
                  Register for events <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link to="/live">Watch live darshan</Link>
              </Button>
            </div>
            <div className="mt-10 max-w-lg">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Festival begins in
              </p>
              <Countdown date={settings?.start_date ?? "2026-09-14"} />
            </div>
          </div>
        </div>
      </section>

      {/* Announcement ticker */}
      {announcements.length > 0 && (
        <div className="overflow-hidden border-y border-border/60 gradient-temple py-2.5">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap px-6">
            {[...announcements, ...announcements].map((a, i) => (
              <span key={`${a.id}-${i}`} className="flex items-center gap-2 text-sm font-medium text-temple-foreground">
                <Megaphone className="h-4 w-4" /> {a.title} — {a.message}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Quick actions + live count */}
        <section className="-mt-2 py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="card-premium flex flex-col items-start gap-3 p-5"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-saffron text-primary-foreground">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{a.label}</span>
                </Link>
              ))}
            </div>

            <div className="card-premium flex flex-col justify-between gap-6 p-6">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Eye className="h-4 w-4 text-primary" /> Live visitors at the pandal
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime
                  </span>
                </div>
                <p className="mt-3 font-display text-5xl font-extrabold tabular-nums text-gradient-saffron">
                  {visitors.toLocaleString("en-IN")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Updated in real-time</span>
                  {stats && stats.totalRegs > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-foreground">{stats.totalRegs} Event Registrations</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's schedule
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {scheduleForStrip.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{e.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatTime(e.start_time)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3">
                    <span className="font-medium">Maha Aarti</span>
                    <span className="shrink-0 text-xs text-muted-foreground">7:30 PM</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Today's Schedule — Timeline (Memories-style) */}
        <section className="py-12">
          <SectionHeading
            eyebrow="Daily programme"
            title={todaysEvents.length > 0 ? "Today's schedule" : "Festival schedule"}
            action={{ to: "/events", label: "All events" }}
          />

          <div className="relative mt-10">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-amber-500/50 to-transparent sm:left-8" />

            <div className="space-y-6">
              {scheduleForStrip.map((e, idx) => {
                const slotsTaken = counts[e.id] ?? 0;
                const isFull = slotsTaken >= e.max_participants;
                return (
                  <div key={e.id} className="relative flex items-start gap-4 sm:gap-6">
                    {/* Timeline node */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-saffron text-primary-foreground shadow-warm ring-4 ring-background sm:h-14 sm:w-14">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    {/* Event card */}
                    <Link
                      to="/events/$slug"
                      params={{ slug: e.slug }}
                      className="card-premium group flex-1 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full gradient-temple text-temple-foreground text-[10px]">
                              {e.category === "cultural" ? "Cultural" : e.category === "sports" ? "Sports" : e.category === "kids" ? "Kids" : e.category === "esports" ? "eSports" : e.category}
                            </Badge>
                            {isFull && <Badge variant="destructive" className="rounded-full text-[10px]">Full</Badge>}
                          </div>
                          <h3 className="mt-2 font-display text-base font-bold group-hover:text-primary transition-colors sm:text-lg">
                            {e.name}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
                            {e.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1.5">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold text-foreground">{formatTime(e.start_time)}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {e.venue}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {slotsTaken}/{e.max_participants}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}

              {/* Fixed Maha Aarti entry */}
              <div className="relative flex items-start gap-4 sm:gap-6">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow-warm ring-4 ring-background sm:h-14 sm:w-14">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="card-premium flex-1 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Badge className="rounded-full bg-amber-600/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">Daily Ritual</Badge>
                      <h3 className="mt-2 font-display text-base font-bold sm:text-lg">Maha Aarti &amp; Prasada</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Evening worship with devotional songs, followed by prasada distribution to all visitors.</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" /> 7:30 PM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming events */}
        <section className="py-12">
          <SectionHeading
            eyebrow="Compete & celebrate"
            title="Upcoming events"
            action={{ to: "/events", label: "All events" }}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />
            ))}
          </div>
        </section>

        {/* Announcements */}
        <section className="py-12">
          <SectionHeading eyebrow="Notice board" title="Latest announcements" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {announcements.slice(0, 4).map((a) => (
              <article key={a.id} className="card-premium p-5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={a.type === "urgent" ? "destructive" : "secondary"}
                    className="rounded-full"
                  >
                    {a.type === "urgent" ? "Urgent" : a.type === "winner" ? "Winner" : "Update"}
                  </Badge>
                  {a.is_pinned && <Badge variant="outline" className="rounded-full">Pinned</Badge>}
                </div>
                <h3 className="mt-3 font-display text-base font-bold">{a.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Gallery preview */}
        <section className="py-12">
          <SectionHeading eyebrow="Memories" title="Festival gallery" action={{ to: "/gallery", label: "View all" }} />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.slice(0, 6).map((g) => (
              <figure key={g.id} className="group relative overflow-hidden rounded-3xl aspect-4/3">
                <OptimizedImage
                  src={g.media_url}
                  alt={g.title || "Festival photo"}
                  aspectRatio="4/3"
                  containerClassName="h-full w-full"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-medium text-white">
                  {g.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Sponsors */}
        <section className="pb-16 pt-12">
          <SectionHeading eyebrow="With gratitude" title="Our sponsors" action={{ to: "/sponsors", label: "All sponsors" }} />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {sponsors.map((s) => (
              <div key={s.id} className="card-premium grid place-items-center p-5 text-center">
                <span className="text-sm font-semibold leading-tight">{s.name}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                  {s.tier}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
