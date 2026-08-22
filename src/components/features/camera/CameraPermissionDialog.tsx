import { useState } from "react";
import {
  Camera,
  ShieldAlert,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type CameraPermissionDialogProps = {
  status: "prompt" | "granted" | "denied" | "checking";
  errorMessage?: string | null;
  onRequestPermission: () => Promise<boolean>;
  onManualFallback?: () => void;
};

export function CameraPermissionDialog({
  status,
  errorMessage,
  onRequestPermission,
  onManualFallback,
}: CameraPermissionDialogProps) {
  const [requesting, setRequesting] = useState(false);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);

  const handleGrantAccess = async () => {
    setRequesting(true);
    const granted = await onRequestPermission();
    setRequesting(false);
    if (granted) {
      toast.success("Camera access granted! Starting scanner...");
    }
  };

  const handleOpenSettings = () => {
    setShowSettingsHelp((prev) => !prev);
    // If native Capacitor browser plugin available, open browser settings or alert guidance
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
      toast.info("Please open App Settings on your phone to grant Camera permissions.");
    }
  };

  if (status === "denied") {
    return (
      <div className="card-premium p-6 border-2 border-destructive/40 bg-card text-center space-y-4 shadow-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-destructive/15 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div>
          <Badge variant="destructive" className="rounded-full">
            Camera Permission Denied
          </Badge>
          <h3 className="mt-2 font-display text-xl font-extrabold text-foreground">
            Camera Access is Disabled
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {errorMessage ||
              "Camera access was denied or blocked by browser security settings. Enable camera access to scan QR passes."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button
            disabled={requesting}
            onClick={handleGrantAccess}
            className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs px-5 py-5"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${requesting ? "animate-spin" : ""}`} />
            {requesting ? "Requesting..." : "Try Permission Again"}
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenSettings}
            className="rounded-full font-bold text-xs border-border px-4 py-5"
          >
            <Settings className="mr-2 h-4 w-4" />
            How to Enable Settings
            {showSettingsHelp ? (
              <ChevronUp className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {showSettingsHelp && (
          <div className="mt-4 text-left rounded-2xl bg-secondary p-4 text-xs space-y-2 border border-border">
            <span className="font-bold text-foreground block">How to enable camera access:</span>
            <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground font-medium">
              <li>
                Tap the <b>Lock / Camera icon</b> in your browser address bar (or Android/iOS App
                Settings).
              </li>
              <li>
                Select <b>Site Settings / Permissions</b>.
              </li>
              <li>
                Change <b>Camera</b> from "Block" to <b>"Allow"</b>.
              </li>
              <li>
                Return here and click <b>Try Permission Again</b>.
              </li>
            </ol>
          </div>
        )}

        {onManualFallback && (
          <div className="pt-2">
            <button
              onClick={onManualFallback}
              className="text-xs text-primary font-bold hover:underline"
            >
              Use Manual Registration ID Lookup Instead
            </button>
          </div>
        )}
      </div>
    );
  }

  // Pre-Permission Rationale Card (Prompt / Checking State)
  return (
    <div className="card-premium p-6 border-2 border-primary/30 bg-gradient-to-b from-primary/5 via-card to-card text-center space-y-5 shadow-xl">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl gradient-saffron text-primary-foreground shadow-warm">
        <Camera className="h-8 w-8" />
      </div>

      <div>
        <Badge className="rounded-full bg-primary/15 text-primary border-primary/30 font-bold gap-1">
          <Sparkles className="h-3 w-3" /> OFFICIAL QR PASS VERIFICATION
        </Badge>
        <h3 className="mt-2 font-display text-xl font-extrabold text-foreground">
          Camera Access Needed
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
          We need permission to use your device camera to automatically scan event QR passes and
          verify volunteer seva badges in real time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
        <Button
          disabled={requesting}
          onClick={handleGrantAccess}
          className="rounded-full gradient-saffron text-primary-foreground font-bold text-xs px-6 py-5 shadow-md"
        >
          <Camera className="mr-2 h-4 w-4" />
          {requesting ? "Opening System Prompt..." : "Enable Camera Access"}
        </Button>

        {onManualFallback && (
          <Button
            variant="outline"
            onClick={onManualFallback}
            className="rounded-full font-bold text-xs border-border px-5 py-5"
          >
            Manual Search Only
          </Button>
        )}
      </div>
    </div>
  );
}
