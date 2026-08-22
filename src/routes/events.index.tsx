import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/features/events/EventCard";
import { CATEGORY_LABELS, eventCountsQuery, eventsQuery } from "@/lib/festival";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events & Competitions — Ganapathi Festival 2026" },
      {
        name: "description",
        content:
          "Dance, singing, drawing, cricket, kabaddi, quiz, rangoli, BGMI, Free Fire and more. Browse all competitions and register online.",
      },
      { property: "og:title", content: "Events & Competitions — Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Browse all 12 festival competitions and register online.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data: events = [], isLoading } = useQuery(eventsQuery);
  const { data: counts = {} } = useQuery(eventCountsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const categories = ["all", ...Array.from(new Set(events.map((e) => e.category)))];
  const filtered = events.filter(
    (e) =>
      (cat === "all" || e.category === cat) &&
      (e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.description.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        Compete & celebrate
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
        Events & Competitions
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Pick an event, register in under a minute and download your QR pass. Entry is open to
        everyone in the neighbourhood.
      </p>

      <div className="mt-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events…"
            className="h-12 rounded-full pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">No events match your search.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} count={counts[e.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
