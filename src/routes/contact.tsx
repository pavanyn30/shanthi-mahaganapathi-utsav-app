import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail } from "lucide-react";
import { settingsQuery } from "@/lib/festival";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Ganapathi Festival 2026" },
      { name: "description", content: "Contact the mandal committee for event, sponsorship and volunteering queries." },
      { property: "og:title", content: "Contact — Ganapathi Festival 2026" },
      { property: "og:description", content: "Reach the Ganapathi Festival 2026 organising committee." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { data: settings } = useQuery(settingsQuery);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">{settings?.festival_name || "Ganapathi Festival 2026"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Reach the organising committee for event passes, seva, donations, and inquiries.</p>
      
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card icon={Phone} title="Call / Phone" value={settings?.contact_phone || "+91 98765 43210"} />
        <Card icon={Mail} title="Email" value={settings?.contact_email || "info@ganapathifest.in"} />
        <Card icon={MapPin} title="Pandal Address" value={settings?.address || "Indiranagar, Bengaluru"} />
      </div>

      <div className="card-premium mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Daily Aarti Timings</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Morning Aarti 7:00 AM · Evening Maha Aarti 7:30 PM · Mahaprasada distribution daily following evening aarti.
        </p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, value }: { icon: typeof Phone; title: string; value: string }) {
  return (
    <div className="card-premium p-5">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold break-words">{value}</p>
    </div>
  );
}
