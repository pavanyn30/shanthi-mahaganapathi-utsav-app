import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { SwitchCamera, Zap, ZapOff, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCameraPermission } from "@/hooks/use-camera-permission";
import { CameraPermissionDialog } from "@/components/features/camera/CameraPermissionDialog";
import { playSuccessChime } from "@/lib/audio-feedback";

export type EmbeddedQRScannerProps = {
  onScanSuccess: (scannedText: string) => void;
  isScanningActive?: boolean;
  onManualFallback?: () => void;
};

export function EmbeddedQRScanner({
  onScanSuccess,
  isScanningActive = true,
  onManualFallback,
}: EmbeddedQRScannerProps) {
  const { status: permissionStatus, errorMessage, requestCameraPermission } = useCameraPermission();
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "embedded-qr-reader";

  useEffect(() => {
    if (isScanningActive && permissionStatus === "granted") {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanningActive, facingMode, permissionStatus]);

  const startScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(() => {});
      }

      const instance = new Html5Qrcode(elementId);
      scannerRef.current = instance;

      await instance.start(
        { facingMode },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.75);
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          playSuccessChime();
          stopScanner();
          onScanSuccess(decodedText);
        },
        () => {
          // Continuous frame search
        },
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn("[EmbeddedQRScanner] Camera start error:", err);
      setIsScanning(false);
      toast.error("Failed to start camera. Please check camera access.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }
    setIsScanning(false);
  };

  const togglePauseResume = async () => {
    if (isScanning) {
      await stopScanner();
    } else {
      await startScanner();
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const capabilities = scannerRef.current.getRunningTrackCapabilities() as any;
        if (capabilities && capabilities.torch) {
          const nextTorch = !torchOn;
          await scannerRef.current.applyVideoConstraints({
            advanced: [{ torch: nextTorch } as any],
          });
          setTorchOn(nextTorch);
        } else {
          toast.info("Torch / Flashlight is not supported on this device camera.");
        }
      } catch {
        toast.info("Flashlight toggle not supported by browser.");
      }
    }
  };

  if (permissionStatus !== "granted") {
    return (
      <CameraPermissionDialog
        status={permissionStatus}
        errorMessage={errorMessage}
        onRequestPermission={requestCameraPermission}
        onManualFallback={onManualFallback}
      />
    );
  }

  return (
    <div className="card-premium relative overflow-hidden p-0 border-2 border-primary/40 shadow-xl bg-black">
      {/* Scanner Header / Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-black/80 px-4 py-3 text-white border-b border-white/10 z-10 relative">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isScanning ? "bg-emerald-400" : "bg-amber-400"} opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${isScanning ? "bg-emerald-500" : "bg-amber-500"}`}
            />
          </span>
          <span className="font-display text-xs font-bold uppercase tracking-wider">
            {isScanning ? "Live Camera Scanner Active" : "Scanner Paused"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleTorch}
            disabled={!isScanning}
            className="h-8 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Toggle Flashlight"
          >
            {torchOn ? (
              <ZapOff className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={switchCamera}
            className="h-8 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Switch Camera"
          >
            <SwitchCamera className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={togglePauseResume}
            className="h-8 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            {isScanning ? (
              <Pause className="h-3.5 w-3.5 text-amber-400 mr-1" />
            ) : (
              <Play className="h-3.5 w-3.5 text-emerald-400 mr-1" />
            )}
            {isScanning ? "Pause" : "Start"}
          </Button>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative min-h-[300px] sm:min-h-[360px] w-full bg-black flex items-center justify-center">
        <div id={elementId} className="w-full h-full" />

        {/* Viewfinder Target Overlay Box */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="h-64 w-64 border-2 border-emerald-500 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-500/60 shadow-[0_0_8px_#10b981] animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
