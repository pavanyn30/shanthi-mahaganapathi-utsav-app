import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ScrollRestoration,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient-saffron">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Content not found.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested content or page doesn't exist or has been removed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full gradient-saffron px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  
  useEffect(() => {
    console.error("Root Error Boundary caught exception:", error);
  }, [error]);

  const handleTryAgain = () => {
    try {
      if (queryClient) {
        queryClient.resetQueries();
      }
      router.invalidate();
      reset();
    } catch {
      window.location.href = "/";
    }
  };

  const handleGoHome = () => {
    try {
      if (queryClient) {
        queryClient.resetQueries();
      }
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md rounded-3xl border border-stone-800 bg-stone-900/90 p-8 shadow-2xl backdrop-blur-md">
        <h1 className="font-serif text-xl font-bold text-amber-400">
          This page didn't load
        </h1>
        <p className="mt-2 text-xs text-stone-400">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {import.meta.env.DEV && error?.message && (
          <p className="mt-3 rounded-lg bg-stone-950/80 p-2 font-mono text-[10px] text-red-400 break-words">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={handleTryAgain}
            className="inline-flex items-center justify-center rounded-full gradient-saffron px-6 py-2.5 text-xs font-bold text-stone-950 shadow-md transition hover:scale-105 active:scale-95"
          >
            Try again
          </button>
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center rounded-full border border-stone-800 bg-stone-950 px-6 py-2.5 text-xs font-bold text-stone-300 hover:text-white transition"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FF6B00" },
      { title: "SHANTHI MAHA GANAPATHI 2026" },
      {
        name: "description",
        content:
          "Events, registrations, QR passes and live updates for SHANTHI MAHA GANAPATHI 2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SHANTHI MAHA GANAPATHI 2026" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "shortcut icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

import { PushNotificationPrompt } from "@/components/common/PushNotificationPrompt";
import { PullToRefreshContainer } from "@/components/common/PullToRefreshContainer";
import { MobileBottomNav } from "@/components/common/MobileBottomNav";
import { SplashScreen } from "@/components/common/SplashScreen";
import { useAutoScheduleNotifier } from "@/hooks/use-auto-schedule-notifier";
import { useDeepLinks } from "@/hooks/use-deep-links";
import { GanapathiNotificationPopup } from "@/components/features/notifications/GanapathiNotificationPopup";

function RootShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import { useRouterState } from "@tanstack/react-router";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const hash = routerState.location.hash;
  const isMemoriesPage = pathname === "/memories" || pathname.startsWith("/memories");
  const isGalleryPage = pathname === "/gallery" || pathname.startsWith("/gallery");
  const isEventPage = pathname.startsWith("/events") || pathname.startsWith("/event");
  const hideHeader = isGalleryPage || isEventPage;

  // Establish global Realtime Data Sync with Supabase
  useRealtimeSync(queryClient);

  // Deep Link Handling for Mobile (WhatsApp, Instagram, Telegram, SMS, Browser & Push Notifications)
  useDeepLinks();

  // Background Automatic Festival Schedule Notification Engine
  useAutoScheduleNotifier();

  // Automatically scroll page to top whenever user opens any new section/page
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }
  }, [pathname, hash]);

  useEffect(() => {
    // Non-blocking background service worker registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      setTimeout(() => {
        navigator.serviceWorker.register("/sw-image-cache.js").catch(() => {
          // Silent catch for dev/unsupported environments
        });
      }, 1000);
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <div
      className={`flex min-h-screen flex-col bg-background w-full max-w-full overflow-x-hidden ${
        isMemoriesPage
          ? "pb-0 lg:pb-0"
          : "pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
      }`}
    >
      <ScrollRestoration />
      <SplashScreen durationMs={3000} />
      <div className={hideHeader || isMemoriesPage ? "hidden md:block" : ""}>
        <Header />
      </div>
      {/* Spacer to offset fixed header so content is never hidden behind it */}
      <div
        className={`shrink-0 h-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:h-[calc(3.75rem+env(safe-area-inset-top,0px))] ${
          hideHeader || isMemoriesPage ? "hidden md:block" : ""
        }`}
        aria-hidden="true"
      />
      <PullToRefreshContainer>
        <main className="flex-1 w-full max-w-full overflow-x-hidden">
          {/* Required: nested routes render here. */}
          <Outlet />
        </main>
      </PullToRefreshContainer>
      <div className="hidden md:block">
        <Footer />
      </div>
      <div className={isMemoriesPage ? "hidden lg:block" : ""}>
        <MobileBottomNav />
      </div>
      <PushNotificationPrompt />
      <GanapathiNotificationPopup />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
