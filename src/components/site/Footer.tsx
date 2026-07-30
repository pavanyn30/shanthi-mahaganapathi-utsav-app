import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, MapPin } from "lucide-react";
import { settingsQuery } from "@/lib/festival";

export function Footer() {
  const { data: settings } = useQuery(settingsQuery);

  return (
    <footer className="mt-24 border-t border-border/60 bg-sidebar">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <h3 className="font-display text-xl font-bold text-gradient-saffron">{settings?.festival_name || "Ganapathi Festival 2026"}</h3>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {(() => {
              const sDate = settings?.start_date ? new Date(settings.start_date) : new Date("2026-09-14");
              const eDate = settings?.end_date ? new Date(settings.end_date) : new Date("2026-09-24");
              const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
              const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
              const dayWords: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Eleven" };
              const word = dayWords[days] || `${days}`;
              return `${word} days of devotion, culture, sport and community. Organised by Sri Ganapathi Mandal with hundreds of volunteers and well-wishers.`;
            })()}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Explore</h4>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {[
              { to: "/events", label: "Events" },
              { to: "/live", label: "Live" },
              { to: "/gallery", label: "Gallery" },
              { to: "/donate", label: "Donate" },
              { to: "/sponsors", label: "Sponsors" },
              { to: "/volunteer", label: "Volunteer" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-foreground/80 transition-colors hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{settings?.address ?? "Sri Ganapathi Mandal, Bengaluru"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <span>{settings?.contact_phone ?? "+91 98860 12345"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span>{settings?.contact_email ?? "info@ganapathifest.in"}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        Ganapathi Bappa Morya · © {settings?.start_date ? new Date(settings.start_date).getFullYear() : "2026"} {settings?.festival_name || "Ganapathi Festival"}
      </div>
    </footer>
  );
}
