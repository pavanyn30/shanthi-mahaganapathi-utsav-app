import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Sparkles, Code2 } from "lucide-react";
import { settingsQuery } from "@/lib/festival";
import { DeveloperCreditModal } from "@/components/common/DeveloperCreditModal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Ganapathi Festival 2026" },
      {
        name: "description",
        content: "Contact the mandal committee and technical partner for event, sponsorship and software queries.",
      },
      { property: "og:title", content: "Contact — Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Reach the Ganapathi Festival 2026 organising committee and tech partner PYN TECHNOLOGIES.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: settings } = useQuery(settingsQuery);
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">
          {settings?.festival_name || "Ganapathi Festival 2026"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reach the organising committee for event passes, seva, donations, and inquiries.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          icon={Phone}
          title="Call / Phone"
          value={settings?.contact_phone || "+91 98765 43210"}
        />
        <Card
          icon={Mail}
          title="Email"
          value={settings?.contact_email || "info@ganapathifest.in"}
        />
        <Card
          icon={MapPin}
          title="Pandal Address"
          value={settings?.address || "Chitradurga, Karnataka"}
        />
      </div>

      <div className="card-premium p-6">
        <h2 className="font-display text-lg font-bold">Daily Aarti Timings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Morning Aarti 7:00 AM · Evening Maha Aarti 7:30 PM · Mahaprasada distribution daily
          following evening aarti.
        </p>
      </div>

      {/* Technology & Software Partner Card */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Technology &amp; Software Partner
            </div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Code2 className="h-5 w-5 text-amber-500" />
              <a
                href="https://pyn-technologies.web.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-amber-500 transition-colors"
              >
                PYN TECHNOLOGIES
              </a>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              This application was designed, engineered, and built by <strong className="text-foreground font-semibold">PYN TECHNOLOGIES</strong> to power real-time updates, QR event passes, live darshan, and volunteer coordination for Sri Ganapathi Mandal.
            </p>
          </div>

          <a
            href="https://pyn-technologies.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full gradient-saffron text-primary-foreground font-semibold text-xs px-5 py-2.5 shadow-sm hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <span>Visit Website</span>
          </a>
        </div>
      </div>

      <DeveloperCreditModal open={developerModalOpen} onOpenChange={setDeveloperModalOpen} />
    </div>
  );
}

function Card({ icon: Icon, title, value }: { icon: typeof Phone; title: string; value: string }) {
  return (
    <div className="card-premium p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold break-words">{value}</p>
    </div>
  );
}
