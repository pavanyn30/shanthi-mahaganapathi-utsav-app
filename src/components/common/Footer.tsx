import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, MapPin, Sparkles, Code2, Heart } from "lucide-react";
import { settingsQuery } from "@/lib/festival";
import { DeveloperCreditModal } from "./DeveloperCreditModal";
import { toast } from "sonner";

export function Footer() {
  const { data: settings } = useQuery(settingsQuery);
  const isDonateEnabled = settings?.manual_upi_enabled !== false;
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);

  const exploreLinks = [
    { to: "/events", label: "Events" },
    ...(isDonateEnabled ? [{ to: "/donate", label: "Donate / Seva" }] : []),
    { to: "/live", label: "Live" },
    { to: "/gallery", label: "Gallery" },
    { to: "/sponsors", label: "Sponsors" },
    { to: "/child-safety", label: "Child Safety" },
    { to: "/contact", label: "Contact & Developer" },
  ];

  return (
    <>
      <footer className="hidden md:block mt-16 sm:mt-24 border-t border-border/60 bg-sidebar">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <h3 className="font-display text-xl font-bold text-gradient-saffron">
              {settings?.festival_name || "SHANTHI MAHA GANAPATHI 2026"}
            </h3>
            <p className="mt-3 max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
                return `${word} days of devotion, culture, sport and community. Organised by Sri Ganapathi Mandal with hundreds of volunteers and well-wishers.`;
              })()}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Explore
            </h4>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2 text-xs sm:text-sm">
              {exploreLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-foreground/80 transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-xs sm:text-sm text-foreground/80">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <button
                  type="button"
                  onClick={() => {
                    const addr = settings?.address ?? "Sri Ganapathi Mandal, Shanthinagara, Chitradurga";
                    if (navigator.clipboard) navigator.clipboard.writeText(addr);
                    toast.success("Address copied! Opening Google Maps...", { icon: "📍" });
                    setTimeout(() => {
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
                    }, 200);
                  }}
                  className="text-left hover:text-amber-500 hover:underline transition-colors"
                  title="Click to copy & open Google Maps"
                >
                  <span>{settings?.address ?? "Sri Ganapathi Mandal, Chitradurga"}</span>
                </button>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary animate-pulse" />
                <button
                  type="button"
                  onClick={() => {
                    const phone = settings?.contact_phone ?? "+91 7483639318";
                    const cleanNumber = phone.replace(/[^0-9+]/g, "");
                    if (navigator.clipboard) navigator.clipboard.writeText(phone);
                    toast.success(`Copied ${phone}! Redirecting to call dialer...`, { icon: "📞" });
                    setTimeout(() => {
                      window.location.href = `tel:${cleanNumber}`;
                    }, 200);
                  }}
                  className="text-left font-semibold text-foreground hover:text-amber-500 hover:underline transition-colors flex items-center gap-1.5"
                  title="Click to copy phone & open dialer"
                >
                  <span>{settings?.contact_phone ?? "+91 7483639318"}</span>
                </button>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <button
                  type="button"
                  onClick={() => {
                    const email = settings?.contact_email ?? "info@shanthimahaganapathi.org";
                    if (navigator.clipboard) navigator.clipboard.writeText(email);
                    toast.success(`Copied ${email}! Opening email app...`, { icon: "✉️" });
                    setTimeout(() => {
                      window.location.href = `mailto:${email}`;
                    }, 200);
                  }}
                  className="text-left hover:text-amber-500 hover:underline transition-colors"
                  title="Click to copy email & open mail client"
                >
                  <span>{settings?.contact_email ?? "info@shanthimahaganapathi.org"}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Technology Partner Section */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
                <Sparkles className="h-3 w-3 text-amber-500" /> Technology Partner
              </div>
              <h4 className="font-display text-base font-bold text-foreground">
                <a
                  href="https://pyn-technologies.web.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-amber-500 transition-colors"
                >
                  PYN TECHNOLOGIES
                </a>
              </h4>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Empowering Sri Ganapathi Mandal with modern web, mobile &amp; real-time event software solutions.
              </p>
            </div>
            
            <a
              href="https://pyn-technologies.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 py-2 px-3 text-xs font-semibold text-amber-600 dark:text-amber-400 transition-colors flex items-center justify-center gap-1.5 group"
            >
              <Code2 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>Built by PYN TECHNOLOGIES</span>
            </a>
          </div>
        </div>

        {/* Copyright & Credit Bar */}
        <div className="border-t border-border/60 py-4 px-4 bg-stone-950/30 text-center text-xs text-muted-foreground">
          <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl px-4 sm:px-6">
            <span>
              Ganapathi Bappa Morya · ©{" "}
              {settings?.start_date ? new Date(settings.start_date).getFullYear() : "2026"}{" "}
              {settings?.festival_name || "SHANTHI MAHA GANAPATHI 2026"}
            </span>

            <a
              href="https://pyn-technologies.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.1 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all font-medium text-[11px] group"
            >
              <span>Crafted with</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500 group-hover:scale-125 transition-transform" />
              <span>by</span>
              <strong className="font-bold underline decoration-amber-500/50">PYN TECHNOLOGIES</strong>
            </a>
          </div>
        </div>
      </footer>

      <DeveloperCreditModal open={developerModalOpen} onOpenChange={setDeveloperModalOpen} />
    </>
  );
}

