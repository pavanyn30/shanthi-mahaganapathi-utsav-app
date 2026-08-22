import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SplashScreen as NativeSplashScreen } from "@capacitor/splash-screen";
import { settingsQuery } from "@/lib/festival";
import splashImg from "@/assets/pavonix-splash.png";

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinish, durationMs = 3000 }: SplashScreenProps) {
  const { data: settings } = useQuery(settingsQuery);

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== "undefined") {
      const hasSeen = sessionStorage.getItem("has_seen_splash");
      if (hasSeen) {
        NativeSplashScreen.hide().catch(() => {});
        return false;
      }
    }
    return true;
  });

  // Sync to local storage when settings arrive
  useEffect(() => {
    if (settings) {
      if (settings.splash_screen_url) {
        localStorage.setItem("custom_splash_url", settings.splash_screen_url);
      }
      if (settings.splash_screen_enabled !== undefined) {
        localStorage.setItem("custom_splash_enabled", String(settings.splash_screen_enabled));
      }
      if (settings.splash_screen_redirect_url) {
        localStorage.setItem("custom_splash_redirect", settings.splash_screen_redirect_url);
      }
    }
  }, [settings]);

  const activeEnabled = settings?.splash_screen_enabled ?? (
    typeof window !== "undefined" && localStorage.getItem("custom_splash_enabled") !== null
      ? localStorage.getItem("custom_splash_enabled") === "true"
      : true
  );

  const activeImage = settings?.splash_screen_url || (
    typeof window !== "undefined" ? localStorage.getItem("custom_splash_url") : null
  ) || splashImg;

  const activeRedirect = settings?.splash_screen_redirect_url || (
    typeof window !== "undefined" ? localStorage.getItem("custom_splash_redirect") : null
  ) || "https://pyn-technologies.web.app/";

  const activeDuration = settings?.splash_screen_duration || durationMs || 3000;

  const [isFadingOut, setIsFadingOut] = useState(false);

  const dismiss = useCallback(() => {
    setIsFadingOut(true);
    NativeSplashScreen.hide().catch(() => {});
    if (typeof window !== "undefined") {
      sessionStorage.setItem("has_seen_splash", "true");
    }
    const timer = setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, 250);
    return () => clearTimeout(timer);
  }, [onFinish]);

  useEffect(() => {
    // Hide native splash screen as soon as web splash overlay is mounted in DOM
    const timer = setTimeout(() => {
      NativeSplashScreen.hide().catch(() => {});
    }, 50);

    if (!isVisible || !activeEnabled) {
      NativeSplashScreen.hide().catch(() => {});
      return () => clearTimeout(timer);
    }

    // Start smooth exit transition slightly before total duration
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(300, activeDuration - 350));

    // Complete unmount & record session completion
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      NativeSplashScreen.hide().catch(() => {});
      if (typeof window !== "undefined") {
        sessionStorage.setItem("has_seen_splash", "true");
      }
      onFinish?.();
    }, activeDuration);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [activeDuration, activeEnabled, isVisible, onFinish]);

  if (!isVisible || !activeEnabled) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Splash Screen"
      className={`fixed inset-0 z-[99999] md:hidden w-full h-full min-h-screen overflow-hidden bg-[#000c24] transition-opacity duration-300 ease-out select-none transform-gpu ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        willChange: "opacity",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Skip Button (Top Right with safe area notch protection) */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-[calc(env(safe-area-inset-top,0px)+0.75rem)] right-4 z-50 text-xs font-bold text-white/90 hover:text-white bg-stone-900/90 active:scale-95 px-3.5 py-1.5 rounded-full border border-white/20 shadow-xl transition-all flex items-center gap-1.5"
        aria-label="Skip splash screen"
      >
        <span>Skip</span>
        <span aria-hidden="true">&rarr;</span>
      </button>

      {/* Edge-to-Edge Optimized Sharp Splash Poster */}
      <a
        href={activeRedirect}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden active:opacity-95 transition-opacity z-10"
        aria-label="Visit PYN TECHNOLOGIES"
      >
        <img
          src={activeImage}
          alt="Shanthi Maha Ganapathi Utsav - Built by PYN TECHNOLOGIES"
          className="w-full h-full object-cover object-center shadow-2xl"
          loading="eager"
          decoding="sync"
          style={{
            imageRendering: "crisp-edges",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            transform: "translateZ(0)",
          }}
        />
      </a>
    </div>
  );
}
