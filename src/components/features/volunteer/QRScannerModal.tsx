import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Camera,
  Search,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Volume2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate } from "@/lib/festival";

import { useCameraPermission } from "@/hooks/use-camera-permission";
import { CameraPermissionDialog } from "@/components/features/camera/CameraPermissionDialog";

export type VerificationResult = {
  isValid: boolean;
  type: "event_pass" | "volunteer_badge" | "invalid";
  message: string;
  registration?: {
    id: string;
    pass_code: string;
    full_name: string;
    phone: string;
    email: string | null;
    status: string;
    payment_status: string;
    attended: boolean;
    created_at: string;
    events?: {
      name: string;
      event_date: string;
      start_time: string;
      venue: string;
      slug: string;
    } | null;
  } | null;
  volunteer?: {
    id: string;
    full_name: string;
    phone: string;
    duty: string | null;
    status: string;
  } | null;
};

export function QRScannerModal() {
  const { status: permissionStatus, errorMessage, requestCameraPermission } = useCameraPermission();
  const [open, setOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;

    if (open && cameraActive && permissionStatus === "granted") {
      const elementId = "reader";
      html5Qrcode = new Html5Qrcode(elementId);
      scannerRef.current = html5Qrcode;

      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Ignore scan errors while searching for QR frame
          },
        )
        .catch((err) => {
          console.warn("Camera start error:", err);
          toast.error("Camera access denied or unavailable. Please use manual code search.");
          setCameraActive(false);
        });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [open, cameraActive, permissionStatus]);

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setCameraActive(false);
  };

  const handleScanSuccess = async (scannedCode: string) => {
    await stopCamera();
    verifyCode(scannedCode);
  };

  const verifyCode = async (rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    setLoading(true);
    setResult(null);

    try {
      // 1. Check if Code is a Volunteer Badge (Format: VOLUNTEER:id:name:phone)
      if (cleanCode.startsWith("VOLUNTEER:")) {
        const parts = cleanCode.split(":");
        const volId = parts[1];
        const { data: volData } = await supabase
          .from("volunteers")
          .select("*")
          .eq("id", volId)
          .maybeSingle();

        if (volData) {
          setResult({
            isValid: true,
            type: "volunteer_badge",
            message: "Valid Approved Volunteer Seva Badge",
            volunteer: volData,
          });
          toast.success("Registered Volunteer Badge Verified!");
        } else {
          setResult({
            isValid: false,
            type: "invalid",
            message: "Invalid or Unknown Volunteer Badge",
          });
          toast.error("Invalid Volunteer Badge QR");
        }
        setLoading(false);
        return;
      }

      // 2. Parse Pass Code (Extract pass code if JSON)
      let targetPassCode = cleanCode;
      if (cleanCode.startsWith("{")) {
        try {
          const parsed = JSON.parse(cleanCode);
          targetPassCode = parsed.pass_code || parsed.code || cleanCode;
        } catch {
          // Keep raw string
        }
      }

      // 3. Query Supabase Registrations joined with Events
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(targetPassCode);
      const orFilter = isUuid
        ? `pass_code.eq.${targetPassCode},id.eq.${targetPassCode}`
        : `pass_code.eq.${targetPassCode}`;

      const { data: reg, error } = await supabase
        .from("registrations")
        .select("*, events(name, event_date, start_time, venue, slug)")
        .or(orFilter)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (reg) {
        setResult({
          isValid: true,
          type: "event_pass",
          message: "Registered for this event",
          registration: reg as any,
        });
        toast.success("Registered for this event!");
      } else {
        setResult({
          isValid: false,
          type: "invalid",
          message: "Invalid QR Code - No matching event registration found",
        });
        toast.error("Invalid / Unrecognized QR Code");
      }
    } catch (err: any) {
      setResult({
        isValid: false,
        type: "invalid",
        message: err.message || "Error verifying QR Code",
      });
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    verifyCode(manualCode);
  };

  const handleMarkAttendance = async () => {
    if (!result?.registration?.id) return;

    setMarkingAttendance(true);
    const { error } = await supabase
      .from("registrations")
      .update({
        attended: true,
      })
      .eq("id", result.registration.id);

    setMarkingAttendance(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Attendance / Check-In Marked Successfully!");
      setResult((prev) =>
        prev && prev.registration
          ? {
              ...prev,
              registration: { ...prev.registration, attended: true },
            }
          : prev,
      );
    }
  };

  const handleResetScan = () => {
    setResult(null);
    setManualCode("");
    setCameraActive(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopCamera();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full gradient-saffron text-primary-foreground font-bold shadow-warm gap-2">
          <QrCode className="h-4 w-4" /> Scan QR Pass
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <QrCode className="h-6 w-6 text-primary" /> Volunteer QR Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* CAMERA VIEWER & SCANNER CONTROLS */}
          {!result && (
            <div className="space-y-4">
              {cameraActive && permissionStatus !== "granted" ? (
                <CameraPermissionDialog
                  status={permissionStatus}
                  errorMessage={errorMessage}
                  onRequestPermission={requestCameraPermission}
                  onManualFallback={() => setCameraActive(false)}
                />
              ) : (
                <div className="relative overflow-hidden rounded-3xl border-2 border-primary/40 bg-black min-h-[260px] grid place-items-center">
                  <div id="reader" className="w-full h-full" />

                  {!cameraActive && (
                    <div className="p-6 text-center text-white space-y-3">
                      <Camera className="mx-auto h-12 w-12 text-primary opacity-80 animate-bounce" />
                      <p className="text-sm font-semibold">
                        Point camera at attendee's QR Pass to verify instantly
                      </p>
                      <Button
                        onClick={() => setCameraActive(true)}
                        className="rounded-full gradient-saffron text-primary-foreground font-bold px-6"
                      >
                        Turn On Camera Scanner
                      </Button>
                    </div>
                  )}

                  {cameraActive && (
                    <Button
                      onClick={stopCamera}
                      variant="destructive"
                      size="sm"
                      className="absolute top-3 right-3 rounded-full text-xs"
                    >
                      Stop Camera
                    </Button>
                  )}
                </div>
              )}

              {/* MANUAL CODE INPUT FALLBACK */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter Pass Code (e.g. GPU-X892K-2026)"
                  className="rounded-2xl text-xs"
                />
                <Button
                  disabled={loading}
                  type="submit"
                  className="rounded-2xl gradient-saffron text-primary-foreground shrink-0 text-xs font-bold"
                >
                  {loading ? "Checking..." : "Verify"}
                </Button>
              </form>
            </div>
          )}

          {/* VERIFICATION RESULT CARD */}
          {result && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* STATUS BANNER */}
              {result.isValid ? (
                <div className="rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/40 p-4 text-emerald-600 dark:text-emerald-400 text-center space-y-1">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <h3 className="font-display text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    Registered for this event
                  </h3>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {result.message}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-destructive/15 border-2 border-destructive/40 p-4 text-destructive text-center space-y-1">
                  <XCircle className="mx-auto h-10 w-10 text-destructive" />
                  <h3 className="font-display text-xl font-extrabold">INVALID / UNRECOGNIZED QR</h3>
                  <p className="text-xs font-medium">{result.message}</p>
                </div>
              )}

              {/* EVENT PASS DETAILS */}
              {result.registration && (
                <div className="card-premium p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Attendee Name
                      </span>
                      <h4 className="font-display text-lg font-bold text-foreground">
                        {result.registration.full_name}
                      </h4>
                    </div>
                    <Badge className="rounded-full font-mono text-xs gradient-saffron text-primary-foreground font-bold px-3 py-1">
                      {result.registration.pass_code}
                    </Badge>
                  </div>

                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div className="rounded-2xl bg-secondary p-3 border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Phone / Contact
                      </span>
                      <span className="font-semibold">{result.registration.phone}</span>
                    </div>

                    <div className="rounded-2xl bg-secondary p-3 border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Registration Status
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                        {result.registration.status} ({result.registration.payment_status})
                      </span>
                    </div>

                    {result.registration.events && (
                      <>
                        <div className="rounded-2xl bg-secondary p-3 border border-border sm:col-span-2 space-y-1">
                          <span className="text-[10px] font-bold text-primary uppercase block">
                            Registered Event
                          </span>
                          <h5 className="font-display text-base font-extrabold text-foreground">
                            {result.registration.events.name}
                          </h5>
                          <div className="flex flex-wrap gap-4 text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {formatEventDate(result.registration.events.event_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-primary" />
                              {result.registration.events.start_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {result.registration.events.venue}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ATTENDANCE STATUS & ACTION BUTTON */}
                  <div className="rounded-2xl bg-primary/10 p-4 border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Attendance Check-In
                      </span>
                      {result.registration.attended ? (
                        <Badge className="rounded-full bg-emerald-600 text-white font-bold">
                          ✓ ALREADY CHECKED-IN
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full text-amber-600 border-amber-500 font-bold"
                        >
                          NOT CHECKED-IN YET
                        </Badge>
                      )}
                    </div>

                    {!result.registration.attended && (
                      <Button
                        disabled={markingAttendance}
                        onClick={handleMarkAttendance}
                        className="w-full rounded-full gradient-saffron text-primary-foreground font-bold"
                      >
                        {markingAttendance
                          ? "Marking Check-In..."
                          : "Mark Attendance / Confirm Entry"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* VOLUNTEER BADGE DETAILS */}
              {result.volunteer && (
                <div className="card-premium p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-bold">{result.volunteer.full_name}</h4>
                    <Badge className="rounded-full bg-emerald-600 text-white font-bold">
                      VERIFIED VOLUNTEER
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between rounded-xl bg-secondary p-2.5">
                      <span className="text-muted-foreground">Mobile:</span>
                      <span className="font-semibold">{result.volunteer.phone}</span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-secondary p-2.5">
                      <span className="text-muted-foreground">Assigned Seva:</span>
                      <span className="font-semibold text-primary">
                        {result.volunteer.duty || "General Seva"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-2">
                <Button
                  onClick={handleResetScan}
                  variant="outline"
                  className="w-full rounded-full font-bold"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Scan Another Code
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
