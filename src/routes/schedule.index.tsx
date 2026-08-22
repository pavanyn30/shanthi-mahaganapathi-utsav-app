import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  Bell,
  Check,
  Share2,
  Settings,
  Tag,
} from "lucide-react";
import {
  festivalSchedulesQuery,
  settingsQuery,
  type FestivalScheduleItem,
} from "@/lib/festival";
import { useSession, useIsStaff } from "@/hooks/use-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/schedule/")({
  head: () => ({
    meta: [
      { title: "Festival Schedule — Ganapathi Festival 2026" },
      {
        name: "description",
        content: "View full daily programme and event schedules for 14, 15, and 16 September 2026.",
      },
      { property: "og:title", content: "Festival Schedule — Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Daily pooja, Maha Aarti, Annadana prasadam, cultural programs and Visarjan schedule.",
      },
    ],
  }),
  component: SchedulePage,
});

function formatTime(timeStr?: string | null) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10));
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SchedulePage() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: schedules = [], isLoading } = useQuery(festivalSchedulesQuery);
  const { user } = useSession();
  const isStaff = useIsStaff(user?.id);

  // Dynamic today's date in YYYY-MM-DD format
  const todayDateStr = new Date().toLocaleDateString("en-CA");

  // Determine initial active date tab
  const [activeDateTab, setActiveDateTab] = useState<string>(() => {
    if (schedules.some((s) => s.schedule_date === todayDateStr)) {
      return todayDateStr;
    }
    return "2026-09-14";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [remindedIds, setRemindedIds] = useState<Record<string, boolean>>({});

  // Published schedules
  const publishedSchedules = useMemo(
    () => schedules.filter((s) => s.is_published !== false),
    [schedules],
  );

  // Group schedules by date
  const groupedByDate = useMemo(() => {
    const map: Record<string, FestivalScheduleItem[]> = {};
    publishedSchedules.forEach((item) => {
      const d = item.schedule_date || "2026-09-14";
      if (!map[d]) map[d] = [];
      map[d].push(item);
    });
    // Sort each group by start_time
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    });
    return map;
  }, [publishedSchedules]);

  // Target dates (14, 15, 16 Sep 2026 plus any others in DB)
  const allAvailableDates = useMemo(() => {
    const dates = new Set(["2026-09-14", "2026-09-15", "2026-09-16"]);
    Object.keys(groupedByDate).forEach((d) => dates.add(d));
    return Array.from(dates).sort();
  }, [groupedByDate]);

  // Filtered schedules for rendering
  const displayedSchedules = useMemo(() => {
    let list = publishedSchedules;

    if (activeDateTab !== "all") {
      list = list.filter((s) => s.schedule_date === activeDateTab);
    }

    if (categoryFilter !== "all") {
      list = list.filter((s) => s.category?.toLowerCase() === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.venue && s.venue.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [publishedSchedules, activeDateTab, categoryFilter, searchQuery]);

  const handleToggleReminder = (item: FestivalScheduleItem) => {
    const newReminded = !remindedIds[item.id];
    setRemindedIds((prev) => ({ ...prev, [item.id]: newReminded }));

    if (newReminded) {
      toast.success(`Reminder set for "${item.title}"!`, {
        icon: "🔔",
        description: `${formatTime(item.start_time)} at ${item.venue || "Pandal"}`,
      });
    } else {
      toast.info(`Reminder removed for "${item.title}"`);
    }
  };

  const handleShareSchedule = (item: FestivalScheduleItem) => {
    const text = `🪔 *${item.title}*\n📅 ${formatDateHeader(item.schedule_date)}\n⏰ ${formatTime(item.start_time)}\n📍 ${item.venue}\n\nJoin us at ${settings?.festival_name || "Ganapathi Festival 2026"}!`;
    if (navigator.share) {
      navigator.share({ title: item.title, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success("Schedule details copied to clipboard!");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-8">
      {/* Reference Image Header Style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 border border-amber-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* DAILY PROGRAMME Subtitle */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <span>DAILY PROGRAMME</span>
          </div>

          {/* Festival schedule Heading */}
          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-stone-100 tracking-tight leading-[1.05]">
            Festival schedule
          </h1>

          <p className="max-w-2xl text-xs sm:text-sm text-stone-400 leading-relaxed pt-1">
            Complete timetable of daily poojas, Maha Aarti rituals, Annadana Mahaprasadam, cultural performances, and Visarjan processions for 14, 15, and 16 September 2026.
          </p>
        </div>
      </div>

      {/* Date Filter Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {allAvailableDates.map((dateStr) => {
              const dateObj = new Date(dateStr + "T00:00:00");
              const dayNum = dateObj.getDate();
              const monthName = dateObj.toLocaleDateString("en-IN", { month: "short" });
              const weekday = dateObj.toLocaleDateString("en-IN", { weekday: "short" });

              const isToday = dateStr === todayDateStr;
              const isSelected = activeDateTab === dateStr;

              // Subtitle for key dates
              let labelNote = "";
              if (dateStr === "2026-09-14") labelNote = "Ganesh Chaturthi";
              if (dateStr === "2026-09-15") labelNote = "Cultural Day";
              if (dateStr === "2026-09-16") labelNote = "Visarjan Day";

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setActiveDateTab(dateStr)}
                  className={`group relative flex flex-col items-center justify-center px-5 py-3 rounded-2xl border text-center transition-all min-w-[110px] cursor-pointer ${
                    isSelected
                      ? "bg-amber-500 text-stone-950 border-amber-500 shadow-lg shadow-amber-500/20 font-bold"
                      : "bg-card/80 text-foreground border-border/70 hover:border-amber-500/50 hover:bg-card"
                  }`}
                >
                  {isToday && (
                    <span className="absolute -top-2 right-2 px-2 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-red-600 text-white shadow-sm">
                      Today
                    </span>
                  )}

                  <span className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
                    {weekday}
                  </span>

                  <span className="text-xl font-extrabold font-display leading-none my-0.5">
                    {dayNum} {monthName}
                  </span>

                  {labelNote && (
                    <span
                      className={`text-[10px] font-medium truncate max-w-[100px] ${
                        isSelected ? "text-stone-900" : "text-amber-500"
                      }`}
                    >
                      {labelNote}
                    </span>
                  )}
                </button>
              );
            })}

            {/* All Dates Tab */}
            <button
              type="button"
              onClick={() => setActiveDateTab("all")}
              className={`px-5 py-4 rounded-2xl border text-center transition-all font-bold text-xs shrink-0 cursor-pointer ${
                activeDateTab === "all"
                  ? "bg-amber-500 text-stone-950 border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-card/80 text-foreground border-border/70 hover:border-amber-500/50"
              }`}
            >
              All 3 Days ({publishedSchedules.length})
            </button>
          </div>
        </div>

        {/* Category & Search Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: "all", label: "All Categories" },
              { id: "pooja", label: "Pooja & Homam" },
              { id: "aarti", label: "Maha Aarti" },
              { id: "prasadam", label: "Mahaprasadam" },
              { id: "cultural", label: "Cultural & Music" },
              { id: "event", label: "Procession & Events" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  categoryFilter === cat.id
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
              className="pl-9 h-8 text-xs rounded-full bg-secondary/40 border-border/60"
            />
          </div>
        </div>
      </div>

      {/* Main Schedule Content */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          <p className="text-xs font-medium">Loading festival timetable...</p>
        </div>
      ) : displayedSchedules.length === 0 ? (
        <div className="card-premium p-12 text-center space-y-3">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="font-bold text-lg text-foreground">No Schedule Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? `No schedule items matched "${searchQuery}".`
              : "No schedule items found for the selected date."}
          </p>
          <Button
            onClick={() => {
              setActiveDateTab("all");
              setCategoryFilter("all");
              setSearchQuery("");
            }}
            variant="outline"
            className="rounded-full text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* If All Dates selected, group by Date */}
          {activeDateTab === "all" ? (
            allAvailableDates.map((dateStr) => {
              const itemsForDate = displayedSchedules.filter(
                (s) => s.schedule_date === dateStr,
              );
              if (itemsForDate.length === 0) return null;

              return (
                <div key={dateStr} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 border-b border-border/80 pb-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        {formatDateHeader(dateStr)}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {itemsForDate.length} scheduled events &amp; rituals
                      </p>
                    </div>
                  </div>

                  <ScheduleTimelineList
                    items={itemsForDate}
                    remindedIds={remindedIds}
                    onToggleReminder={handleToggleReminder}
                    onShare={handleShareSchedule}
                  />
                </div>
              );
            })
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-sm">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {formatDateHeader(activeDateTab)}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {displayedSchedules.length} scheduled events for this date
                    </p>
                  </div>
                </div>

                {activeDateTab === todayDateStr && (
                  <Badge className="bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full animate-pulse">
                    Today's Live Programme
                  </Badge>
                )}
              </div>

              <ScheduleTimelineList
                items={displayedSchedules}
                remindedIds={remindedIds}
                onToggleReminder={handleToggleReminder}
                onShare={handleShareSchedule}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleTimelineList({
  items,
  remindedIds,
  onToggleReminder,
  onShare,
}: {
  items: FestivalScheduleItem[];
  remindedIds: Record<string, boolean>;
  onToggleReminder: (item: FestivalScheduleItem) => void;
  onShare: (item: FestivalScheduleItem) => void;
}) {
  return (
    <div className="relative pl-2 sm:pl-4">
      {/* Timeline Bar */}
      <div className="absolute left-6 sm:left-8 top-3 bottom-3 w-0.5 bg-gradient-to-b from-amber-500 via-amber-500/40 to-transparent" />

      <div className="space-y-5">
        {items.map((item) => {
          const isReminded = remindedIds[item.id];

          return (
            <div key={item.id} className="relative flex items-start gap-4 sm:gap-6">
              {/* Timeline Icon Node */}
              <div className="relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl gradient-saffron text-primary-foreground shadow-lg ring-4 ring-background">
                <Clock className="h-5 w-5" />
              </div>

              {/* Schedule Card */}
              <div className="card-premium flex-1 p-5 space-y-3 transition-all hover:border-amber-500/50 hover:shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {formatTime(item.start_time)}
                      {item.end_time ? ` – ${formatTime(item.end_time)}` : ""}
                    </Badge>

                    <Badge variant="outline" className="rounded-full text-xs capitalize">
                      <Tag className="h-3 w-3 mr-1" />
                      {item.category || "pooja"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    📅 {item.schedule_date}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onShare(item)}
                      className="rounded-full h-8 text-xs px-3 gap-1"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onToggleReminder(item)}
                      className={`rounded-full h-8 text-xs px-3 gap-1.5 font-semibold transition-all ${
                        isReminded
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "gradient-saffron text-primary-foreground"
                      }`}
                    >
                      {isReminded ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Reminded
                        </>
                      ) : (
                        <>
                          <Bell className="h-3.5 w-3.5" /> Remind Me
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
