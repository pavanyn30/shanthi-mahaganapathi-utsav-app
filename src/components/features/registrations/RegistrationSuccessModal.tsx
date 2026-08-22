import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  Share2,
  CheckCircle2,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, formatTime, type Registration } from "@/lib/festival";
import { toast } from "sonner";

export type RegistrationSuccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: Registration | null;
};

export function RegistrationSuccessModal({
  open,
  onOpenChange,
  registration,
}: RegistrationSuccessModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    if (registration) {
      const payload = JSON.stringify({
        id: registration.id,
        pass_code: registration.pass_code,
        full_name: registration.full_name,
        phone: registration.phone,
        event: registration.events?.name,
      });

      QRCode.toDataURL(payload, {
        width: 400,
        margin: 1,
        color: { dark: "#1a0f06", light: "#ffffff" },
      })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(""));
    }
  }, [registration]);

  if (!registration) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pass for ${registration.events?.name || "Ganapathi Festival Event"}`,
          text: `My Registration ID: ${registration.pass_code} for ${registration.events?.name}`,
          url: window.location.href,
        });
      } catch {
        // Share cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `Registration ID: ${registration.pass_code} - ${registration.events?.name}`,
      );
      toast.success("Registration ID copied to clipboard!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-0 gap-0 rounded-3xl border-primary/30">
        <div className="gradient-saffron p-6 text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-20 pointer-events-none">
            <Sparkles className="h-24 w-24" />
          </div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md mb-3 shadow-lg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <Badge className="rounded-full bg-white/20 text-white border-white/30 font-bold px-3 py-0.5 text-xs">
            Registration Confirmed
          </Badge>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            You're All Set!
          </h2>
          <p className="mt-1 text-xs text-primary-foreground/90 font-medium">
            {registration.events?.name}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* QR Code Pass Card */}
          <div className="card-premium p-5 text-center border-2 border-primary/30 bg-gradient-to-b from-primary/5 via-card to-card">
            <div className="flex justify-center">
              <div className="rounded-2xl bg-white p-3 shadow-md border border-border">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`QR Pass ${registration.pass_code}`}
                    className="h-44 w-44 object-contain"
                  />
                ) : (
                  <div className="h-44 w-44 bg-muted animate-pulse rounded-xl" />
                )}
              </div>
            </div>

            <div className="mt-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                Official Registration ID
              </span>
              <p className="font-mono text-xl font-extrabold text-primary tracking-wider mt-0.5">
                {registration.pass_code}
              </p>
            </div>
          </div>

          {/* Detailed Registration Summary */}
          <div className="rounded-2xl bg-secondary/80 p-4 border border-border text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5 text-primary" /> Name:
              </span>
              <span className="font-bold text-foreground">{registration.full_name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Date & Time:
              </span>
              <span className="font-bold text-foreground">
                {registration.events
                  ? `${formatEventDate(registration.events.event_date)} · ${formatTime(registration.events.start_time)}`
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Venue:
              </span>
              <span className="font-bold text-foreground">
                {registration.events?.venue || "Main Pandal"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Mobile Contact:</span>
              <span className="font-bold">{registration.phone}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              asChild
              disabled={!qrCodeUrl}
              className="flex-1 rounded-full gradient-saffron text-primary-foreground font-bold shadow-md"
            >
              <a
                href={qrCodeUrl || "#"}
                download={`registration-pass-${registration.pass_code}.png`}
              >
                <Download className="mr-2 h-4 w-4" /> Download QR Pass
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="rounded-full font-bold border-border"
            >
              <Share2 className="mr-2 h-4 w-4" /> Share Pass
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
