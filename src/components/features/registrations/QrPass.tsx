import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { formatEventDate, formatTime, type Registration } from "@/lib/festival";

export function QrPass({ registration }: { registration: Registration }) {
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    const payload = JSON.stringify({
      id: registration.id,
      pass: registration.pass_code,
      name: registration.full_name,
      event: registration.events?.name,
    });
    QRCode.toDataURL(payload, {
      width: 480,
      margin: 1,
      color: { dark: "#1a0f06", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, [registration]);

  return (
    <article className="card-premium overflow-hidden">
      <div className="gradient-saffron px-5 py-4 text-primary-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">Event Pass</p>
        <h3 className="font-display text-lg font-extrabold leading-tight">
          {registration.events?.name ?? "Festival event"}
        </h3>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        {qr ? (
          <OptimizedImage
            src={qr}
            priority={true}
            alt={`QR code for pass ${registration.pass_code}`}
            width={140}
            height={140}
            aspectRatio="1/1"
            containerClassName="h-35 w-35 shrink-0 rounded-2xl border border-border bg-white p-2"
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            className="h-35 w-35 rounded-2xl skeleton-shimmer"
            style={{ width: 140, height: 140 }}
          />
        )}

        <dl className="grid gap-2 text-sm">
          <Row label="Pass ID" value={registration.pass_code} mono />
          <Row label="Name" value={registration.full_name} />
          <Row
            label="Date"
            value={
              registration.events
                ? `${formatEventDate(registration.events.event_date)} · ${formatTime(registration.events.start_time)}`
                : "—"
            }
          />
          <Row label="Venue" value={registration.events?.venue ?? "—"} />
          {registration.team_name && <Row label="Team" value={registration.team_name} />}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              className="rounded-full"
              variant={registration.status === "confirmed" ? "default" : "secondary"}
            >
              {registration.status}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              Payment: {registration.payment_status.replace("_", " ")}
            </Badge>
            {registration.attended && (
              <Badge variant="outline" className="rounded-full text-primary">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Attended
              </Badge>
            )}
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/70 px-5 py-4 print:hidden">
        <Button asChild size="sm" variant="outline" className="rounded-full" disabled={!qr}>
          <a href={qr || "#"} download={`pass-${registration.pass_code}.png`}>
            <Download className="mr-1.5 h-4 w-4" /> Download QR
          </a>
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print pass
        </Button>
      </div>
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={`truncate font-medium ${mono ? "font-mono tracking-wider text-primary" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
