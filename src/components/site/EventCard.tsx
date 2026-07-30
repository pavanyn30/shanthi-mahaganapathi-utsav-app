import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Users, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, formatEventDate, formatTime, type EventRow } from "@/lib/festival";

export function EventCard({ event, count = 0 }: { event: EventRow; count?: number }) {
  const full = count >= event.max_participants;
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="card-premium group flex flex-col overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge className="rounded-full gradient-saffron text-primary-foreground">
          {CATEGORY_LABELS[event.category] ?? event.category}
        </Badge>
        <Badge variant="outline" className="rounded-full">
          {event.entry_fee > 0 ? (
            <span className="flex items-center gap-0.5">
              <IndianRupee className="h-3 w-3" />
              {event.entry_fee}
            </span>
          ) : (
            "Free"
          )}
        </Badge>
      </div>

      <h3 className="mt-4 font-display text-lg font-bold leading-snug group-hover:text-primary">
        {event.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>

      <dl className="mt-4 grid gap-2 text-sm text-foreground/80">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          {formatEventDate(event.event_date)}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          {formatTime(event.start_time)}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{event.venue}</span>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {count}/{event.max_participants} registered
        </span>
        <span
          className={`text-xs font-bold ${
            !event.registration_open || full ? "text-destructive" : "text-primary"
          }`}
        >
          {!event.registration_open ? "Closed" : full ? "Full" : "Register →"}
        </span>
      </div>
    </Link>
  );
}
