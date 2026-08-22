import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Sparkles, Code2, Copy, Check, PhoneCall, ExternalLink } from "lucide-react";
import { settingsQuery } from "@/lib/festival";
import { DeveloperCreditModal } from "@/components/common/DeveloperCreditModal";
import { toast } from "sonner";

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

  const phoneValue = settings?.contact_phone || "+91 7483639318";
  const emailValue = settings?.contact_email || "info@shanthimahaganapathi.org";
  const addressValue = settings?.address || "Sri Ganapathi Mandal, Shanthinagara, Chitradurga";

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
        {/* Call / Phone Card */}
        <ContactCard
          type="phone"
          icon={Phone}
          title="CALL / PHONE"
          value={phoneValue}
          actionText="Click to Call & Copy"
        />

        {/* Email Card */}
        <ContactCard
          type="email"
          icon={Mail}
          title="EMAIL"
          value={emailValue}
          actionText="Click to Email & Copy"
        />

        {/* Address Card */}
        <ContactCard
          type="address"
          icon={MapPin}
          title="PANDAL ADDRESS"
          value={addressValue}
          actionText="Open Google Maps"
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

interface ContactCardProps {
  type: "phone" | "email" | "address";
  icon: typeof Phone;
  title: string;
  value: string;
  actionText: string;
}

function ContactCard({ type, icon: Icon, title, value, actionText }: ContactCardProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    // 1. Copy text to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
    } else {
      fallbackCopy(value);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    // 2. Action redirect based on card type
    if (type === "phone") {
      const cleanNumber = value.replace(/[^0-9+]/g, "");
      toast.success(`Copied ${value}! Redirecting to call dialer...`, {
        icon: "📞",
        duration: 3000,
      });

      setTimeout(() => {
        window.location.href = `tel:${cleanNumber}`;
      }, 200);
    } else if (type === "email") {
      toast.success(`Copied ${value}! Opening email client...`, {
        icon: "✉️",
        duration: 3000,
      });

      setTimeout(() => {
        window.location.href = `mailto:${value}`;
      }, 200);
    } else if (type === "address") {
      toast.success("Address copied to clipboard! Opening Google Maps...", {
        icon: "📍",
        duration: 3000,
      });

      setTimeout(() => {
        window.open(`https://maps.google.com/?q=${encodeURIComponent(value)}`, "_blank");
      }, 200);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="card-premium p-5 text-left w-full group relative overflow-hidden transition-all duration-200 hover:border-amber-500/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
      title={`${actionText}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
          {type === "phone" ? (
            <PhoneCall className="h-5 w-5 animate-pulse" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground group-hover:bg-amber-500/20 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Copied!</span>
            </>
          ) : (
            <>
              {type === "phone" && <PhoneCall className="h-3 w-3" />}
              {type === "email" && <Copy className="h-3 w-3" />}
              {type === "address" && <ExternalLink className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Call & Copy"}</span>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
        {title}
      </p>

      <p className="mt-1 text-base font-bold text-foreground break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
        <span>{value}</span>
      </p>

      <div className="mt-2 text-[11px] text-muted-foreground/80 flex items-center gap-1 group-hover:text-amber-500 transition-colors">
        <Copy className="h-3 w-3 shrink-0" />
        <span>Tap to copy number &amp; open call dialer</span>
      </div>
    </button>
  );
}

function fallbackCopy(text: string) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  } catch (err) {
    console.error("Fallback copy failed:", err);
  }
}

