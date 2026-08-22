import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export type PermissionState = "prompt" | "granted" | "denied" | "checking";

export function useCameraPermission() {
  const [status, setStatus] = useState<PermissionState>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (typeof window === "undefined") return;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const result = await Camera.checkPermissions();
        // Capacitor states: 'granted', 'denied', 'prompt', 'prompt-with-rationale'
        if (result.camera === "granted") {
          setStatus("granted");
        } else if (result.camera === "denied") {
          setStatus("denied");
        } else {
          setStatus("prompt");
        }
        return;
      } catch (err) {
        console.warn("[CameraPermission] Native check failed:", err);
      }
    }

    // Web Fallback
    if (!navigator.mediaDevices) {
      setStatus("denied");
      setErrorMessage("Camera is not supported on this browser or device.");
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "camera" as any });
        setStatus(result.state as PermissionState);

        result.onchange = () => {
          setStatus(result.state as PermissionState);
        };
      } else {
        setStatus("prompt");
      }
    } catch {
      setStatus("prompt");
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    setStatus("checking");
    setErrorMessage(null);

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        console.log("[CameraPermission] Requesting Native Permission...");
        const result = await Camera.requestPermissions({ permissions: ["camera"] });

        if (result.camera === "granted") {
          setStatus("granted");
          return true;
        } else {
          setStatus("denied");
          setErrorMessage("Camera permission was denied in your device settings.");
          return false;
        }
      } catch (err: any) {
        console.warn("[CameraPermission] Native request failed:", err);
      }
    }

    // Web Fallback / Browser Request
    if (!navigator.mediaDevices) {
      setStatus("denied");
      setErrorMessage("Camera media devices API unavailable.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      // Stop stream tracks immediately so other scanners can attach
      stream.getTracks().forEach((track) => track.stop());

      setStatus("granted");
      return true;
    } catch (err: any) {
      console.warn("[CameraPermission] Web request failed:", err);
      setStatus("denied");

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage(
          "Camera permission was denied. Please allow camera access in your browser/app settings.",
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No camera device found on this hardware.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setErrorMessage("Camera is currently in use by another application.");
      } else {
        setErrorMessage(err.message || "Failed to access camera.");
      }

      return false;
    }
  };

  return {
    status,
    errorMessage,
    checkPermission,
    requestCameraPermission,
  };
}
