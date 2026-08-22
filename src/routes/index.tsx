import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
  Play,
  Download,
} from "lucide-react";
import { downloadMediaFile } from "@/lib/utils/video-downloader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/features/events/Countdown";
import { EventCard } from "@/components/features/events/EventCard";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { GanapathiNotificationPopup } from "@/components/features/notifications/GanapathiNotificationPopup";
import {
  announcementsQuery,
  eventCountsQuery,
  eventsQuery,
  festivalSchedulesQuery,
  formatTime,
  galleryQuery,
  liveStatsQuery,
  settingsQuery,
  sponsorsQuery,
  getEmbeddableYouTubeUrl,
} from "@/lib/festival";
import hero from "@/assets/ganapathi-hero.jpg";

import { getGalleryThumbnail } from "@/lib/utils/video-thumbnail";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHANTHI MAHA GANAPATHI 2026 — 11 Days of Devotion & Celebration" },
      {
        name: "description",
        content:
          "Countdown, daily schedule, competitions, QR event passes, live darshan, gallery and donations for SHANTHI MAHA GANAPATHI 2026 in Chitradurga.",
      },
      { property: "og:title", content: "SHANTHI MAHA GANAPATHI 2026" },
      {
        property: "og:description",
        content:
          "Register for competitions, get your QR pass, watch live darshan and support the mandal.",
      },
    ],
  }),
  component: Home,
});

const QUICK_ACTIONS = [
  { to: "/events", label: "Browse Events", icon: CalendarDays },
  { to: "/donate", label: "Donate / Seva", icon: HandHeart },
  { to: "/my-passes", label: "My QR Passes", icon: Ticket },
  { to: "/live", label: "Live Darshan", icon: Radio },
  { to: "/notifications", label: "Live Alerts", icon: Megaphone },
  { to: "/gallery", label: "Photo Gallery", icon: Images },
] as const;

function Home() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: events = [] } = useQuery(eventsQuery);
  const { data: schedules = [] } = useQuery(festivalSchedulesQuery);
  const { data: announcements = [] } = useQuery(announcementsQuery);
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  const { data: gallery = [] } = useQuery(galleryQuery);
  const { data: counts = {} } = useQuery(eventCountsQuery);
  const { data: stats } = useQuery(liveStatsQuery);

  const isDonateEnabled = settings?.manual_upi_enabled !== false;
  const activeQuickActions = QUICK_ACTIONS.filter(
    (a) => a.to !== "/donate" || isDonateEnabled,
  );

  const visitors = stats?.liveVisitors ?? 1250;

  // Local YYYY-MM-DD date calculation
  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = events.filter((e) => e.event_date >= today || e.is_published).slice(0, 6);
  const activeSchedules = schedules.filter((s) => s.is_published !== false);

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
                const sDate = settings?.start_date
                  ? new Date(settings.start_date)
                  : new Date("2026-09-14");
                const eDate = settings?.end_date
                  ? new Date(settings.end_date)
                  : new Date("2026-09-24");
                const sDay = sDate.getDate();
                const eDay = eDate.getDate();
                const mYear = sDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
                const city = settings?.address
                  ? settings.address.split(",").pop()?.trim() || "Chitradurga"
                  : "Chitradurga";
                return `${sDay} – ${eDay} ${mYear} · ${city}`;
              })()}
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              <span className="text-gradient-saffron">
                {settings?.festival_name || "SHANTHI MAHA GANAPATHI 2026"}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-foreground/85 sm:text-lg">
              {(() => {
                const sDate = settings?.start_date
                  ? new Date(settings.start_date)
                  : new Date("2026-09-14");
                const eDate = settings?.end_date
                  ? new Date(settings.end_date)
                  : new Date("2026-09-24");
                const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
                const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                const dayWords: Record<number, string> = {
                  1: "One",
                  2: "Two",
                  3: "Three",
                  4: "Four",
                  5: "Five",
                  6: "Six",
                  7: "Seven",
                  8: "Eight",
                  9: "Nine",
                  10: "Ten",
                  11: "Eleven",
                };
                const word = dayWords[days] || `${days}`;
                return `${word} days of aarti, culture, sport and seva. Register for competitions, collect your QR pass, and celebrate with the whole neighbourhood.`;
              })()}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full gradient-saffron px-7 text-primary-foreground shadow-warm"
              >
                <Link to="/memories">
                  Watch memories <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              {isDonateEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full px-7 font-bold border border-amber-500/30"
                >
                  <Link to="/donate">
                    <HandHeart className="mr-1.5 h-5 w-5 text-amber-600 dark:text-amber-400" /> Donate
                    / Seva
                  </Link>
                </Button>
              )}
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
              <span
                key={`${a.id}-${i}`}
                className="flex items-center gap-2 text-sm font-medium text-temple-foreground"
              >
                <Megaphone className="h-4 w-4" /> {a.title} — {a.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Stream Active Alert Banner */}
      {Boolean(settings?.live_stream_url && settings.live_stream_url.trim()) && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-red-500/40 bg-gradient-to-r from-stone-950 via-red-950/90 to-stone-950 p-5 sm:p-6 text-white shadow-2xl animate-in fade-in-50 duration-300">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-600 text-white shadow-lg">
                  <Radio className="h-6 w-6 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 animate-ping" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-600 text-white font-extrabold text-[10px] tracking-wider animate-pulse px-2 py-0.5">
                      🔴 LIVE DARSHAN HAS STARTED
                    </Badge>
                    <span className="text-xs text-amber-300 font-semibold hidden sm:inline-block">
                      • Official Pandal Stream
                    </span>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold sm:text-xl text-white truncate">
                    Watch Live Festival Rituals &amp; Maha Aarti Now!
                  </h3>
                  <p className="text-xs text-stone-300 line-clamp-1 mt-0.5">
                    Live streaming is active. Join thousands of devotees watching live from the main
                    pandal.
                  </p>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto rounded-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold shadow-lg px-7 py-6 shrink-0 active:scale-95 transition-transform"
              >
                <Link to="/live">
                  <Play className="mr-2 h-5 w-5 fill-current" /> Watch Live Stream Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Quick actions section - Hidden on Mobile View Only */}
        <section className="hidden sm:block -mt-2 py-12 w-full max-w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full max-w-full">
            {activeQuickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="card-premium flex flex-col items-start gap-3 p-5 transition-all hover:scale-[1.02]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-saffron text-primary-foreground shadow-sm">
                  <a.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Today's Schedule — Timeline (Festival Schedule Module) */}
        <section id="schedule" className="py-12 scroll-mt-20">
          <SectionHeading eyebrow="Daily programme" title="Festival schedule" />

          <div className="relative mt-10">
            {/* Vertical timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-amber-500/50 to-transparent sm:left-8" />

            <div className="space-y-6">
              {activeSchedules.map((s) => (
                <div key={s.id} className="relative flex items-start gap-4 sm:gap-6">
                  {/* Timeline node */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-saffron text-primary-foreground shadow-warm ring-4 ring-background sm:h-14 sm:w-14">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>

                  {/* Schedule Item Card */}
                  <div className="card-premium flex-1 overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {s.schedule_date && (
                            <Badge variant="outline" className="rounded-full text-[10px]">
                              {s.schedule_date}
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-2 font-display text-base font-bold sm:text-lg">
                          {s.title}
                        </h3>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                            {s.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {formatTime(s.start_time)}
                          {s.end_time ? ` – ${formatTime(s.end_time)}` : ""}
                        </span>
                        {s.venue && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-amber-500" /> {s.venue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                  {a.is_pinned && (
                    <Badge variant="outline" className="rounded-full">
                      Pinned
                    </Badge>
                  )}
                </div>
                <h3 className="mt-3 font-display text-base font-bold">{a.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Gallery preview */}
        <section className="py-12">
          <SectionHeading
            eyebrow="Memories"
            title="Festival gallery"
            action={{ to: "/gallery", label: "View all" }}
          />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            {gallery.slice(0, 6).map((g) => {
              const thumbnail = getGalleryThumbnail(g);
              const mediaUrl = g.video_url || g.media_url || thumbnail;

              return (
                <Link
                  key={g.id}
                  to="/gallery"
                  search={{ video: g.id }}
                  className="group relative overflow-hidden rounded-3xl aspect-4/3 border border-amber-500/20 block cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <OptimizedImage
                    src={thumbnail}
                    alt={g.title || "Festival photo"}
                    aspectRatio="4/3"
                    containerClassName="h-full w-full"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Quick Download Overlay Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      downloadMediaFile(mediaUrl, { title: g.title });
                    }}
                    className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/70 hover:bg-amber-500 text-amber-400 hover:text-slate-950 backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-90 opacity-90 group-hover:opacity-100"
                    title="Download Media"
                    aria-label="Download Media"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>

                  <figcaption className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs font-medium text-white truncate">
                    {g.title}
                  </figcaption>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Sponsors */}
        <section className="pb-16 pt-12">
          <SectionHeading
            eyebrow="With gratitude"
            title="Our sponsors"
            action={{ to: "/sponsors", label: "All sponsors" }}
          />
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

      {/* Realtime Animated Ganapathi & Mooshika Notification Popup rendered globally via __root.tsx */}
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
