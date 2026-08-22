import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";

const ALLOWED_HOSTS = [
  "shanthimahaganapathi-2026.web.app",
  "shanthimahaganapathi-2026.firebaseapp.com",
  "shanthimahaganapathi.web.app",
  "shanthimahaganapathi.firebaseapp.com",
  "shanthimahaganapathi.org",
  "www.shanthimahaganapathi.org",
];

const ALLOWED_SCHEMES = [
  "https:",
  "http:",
  "shanthimahaganapathi:",
  "com.shanthimahaganapathi.app:",
];

const AUTH_ROUTES = ["/my-passes", "/volunteer-dashboard", "/admin", "/profile"];

export const processedOAuthKeys = new Set<string>();

/**
 * Process OAuth hash tokens (#access_token=...) or PKCE codes (?code=...)
 * originating from browser or custom scheme redirects.
 */
export async function processOAuthCallback(rawUrl: string): Promise<boolean> {
  if (!rawUrl) return false;
  try {
    console.log("🔗 OAuth Deep Link Callback URL received:", rawUrl);

    if (rawUrl.includes("access_token=") || rawUrl.includes("code=")) {
      try {
        await Browser.close();
      } catch {}

      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let code: string | null = null;

      // Extract tokens/code from hash or query
      const hashIndex = rawUrl.indexOf("#");
      const queryIndex = rawUrl.indexOf("?");

      if (hashIndex !== -1) {
        const hashStr = rawUrl.substring(hashIndex + 1);
        const params = new URLSearchParams(hashStr);
        accessToken = params.get("access_token");
        refreshToken = params.get("refresh_token");
      }

      if (!accessToken && queryIndex !== -1) {
        const queryStr = rawUrl.substring(queryIndex + 1);
        const params = new URLSearchParams(queryStr);
        accessToken = params.get("access_token");
        refreshToken = params.get("refresh_token");
        code = params.get("code");
      }

      const dedupeKey = code ? `code:${code}` : accessToken ? `token:${accessToken}` : null;
      if (dedupeKey) {
        if (processedOAuthKeys.has(dedupeKey)) {
          console.log("🔗 OAuth callback already processed for key:", dedupeKey);
          const { data } = await supabase.auth.getSession();
          return Boolean(data?.session);
        }
        processedOAuthKeys.add(dedupeKey);
      }

      if (accessToken && refreshToken) {
        console.log("🔑 Setting Supabase session from OAuth access_token...");
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data?.session) {
          console.log("✅ Supabase OAuth session established successfully!");
          console.log("👤 Authenticated User ID:", data.session.user.id);
          console.log("📧 Authenticated User Email:", data.session.user.email);
          return true;
        } else if (error) {
          console.error("❌ Supabase setSession error:", error);
        }
      } else if (code) {
        console.log("🔑 Exchanging PKCE code for Supabase session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          console.log("✅ Supabase OAuth code exchanged successfully!");
          console.log("👤 Authenticated User ID:", data.session.user.id);
          console.log("📧 Authenticated User Email:", data.session.user.email);
          return true;
        } else if (error) {
          console.error("❌ Supabase exchangeCodeForSession error:", error);
        }
      }
    }
  } catch (err) {
    console.warn("OAuth callback processing error:", err);
  }
  return false;
}

/**
 * Security: Validates whether an incoming raw URL originates from an allowed host/scheme.
 */
export function isAllowedHost(urlString: string): boolean {
  if (!urlString) return false;
  try {
    const trimmed = urlString.trim();
    if (trimmed.startsWith("/")) return true; // Local relative path

    const parsed = new URL(trimmed);

    if (!ALLOWED_SCHEMES.includes(parsed.protocol.toLowerCase())) {
      return false;
    }

    if (
      parsed.protocol === "shanthimahaganapathi:" ||
      parsed.protocol === "com.shanthimahaganapathi.app:"
    ) {
      return true;
    }

    const hostname = parsed.hostname.toLowerCase();
    return (
      ALLOWED_HOSTS.includes(hostname) ||
      hostname.endsWith(".shanthimahaganapathi.org") ||
      hostname.endsWith(".web.app") ||
      hostname.endsWith(".firebaseapp.com")
    );
  } catch (_e) {
    return false;
  }
}

/**
 * Extracts and maps raw input deep link URLs to standardized application routes.
 */
export function extractRelativePath(urlString: string): string | null {
  if (!urlString) return null;

  if (!isAllowedHost(urlString)) {
    console.warn("🔒 Security: Deep link from unauthorized host ignored:", urlString);
    return null;
  }

  try {
    let urlToParse = urlString.trim();
    let pathname = "";
    let search = "";
    let hash = "";

    if (urlToParse.startsWith("/")) {
      const parsed = new URL("https://shanthimahaganapathi-2026.web.app" + urlToParse);
      pathname = parsed.pathname;
      search = parsed.search;
      hash = parsed.hash;
    } else if (urlToParse.includes("://")) {
      const parts = urlToParse.split("://");
      const scheme = parts[0].toLowerCase();
      const rest = parts.slice(1).join("://");

      if (scheme === "http" || scheme === "https") {
        const parsed = new URL(urlToParse);
        pathname = parsed.pathname;
        search = parsed.search;
        hash = parsed.hash;
      } else {
        // Custom schemes: shanthimahaganapathi://video/123 or com.shanthimahaganapathi.app://event/456
        let pathPart = rest;
        if (
          pathPart.startsWith("shanthimahaganapathi-2026.web.app") ||
          pathPart.startsWith("shanthimahaganapathi.web.app") ||
          pathPart.startsWith("shanthimahaganapathi.org") ||
          pathPart.startsWith("com.shanthimahaganapathi.app")
        ) {
          const firstSlash = pathPart.indexOf("/");
          pathPart = firstSlash !== -1 ? pathPart.substring(firstSlash) : "/";
        }
        if (!pathPart.startsWith("/")) pathPart = "/" + pathPart;

        const parsed = new URL("https://shanthimahaganapathi-2026.web.app" + pathPart);
        pathname = parsed.pathname;
        search = parsed.search;
        hash = parsed.hash;
      }
    } else {
      const parsed = new URL("https://shanthimahaganapathi-2026.web.app/" + urlToParse);
      pathname = parsed.pathname;
      search = parsed.search;
      hash = parsed.hash;
    }

    // Sanitize parameters to avoid XSS or path injection
    pathname = pathname.replace(/[<>'"\\]/g, "");

    // Central Route Mapping Engine for deep links
    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments[0] === "video" && pathSegments[1]) {
      const videoId = encodeURIComponent(pathSegments[1]);
      return `/gallery?video=${videoId}${hash}`;
    }

    if (pathSegments[0] === "event" && pathSegments[1]) {
      const eventSlug = encodeURIComponent(pathSegments[1]);
      return `/events/${eventSlug}${search}${hash}`;
    }

    if (pathSegments[0] === "schedule" && pathSegments[1]) {
      const scheduleId = encodeURIComponent(pathSegments[1]);
      return `/?schedule=${scheduleId}${hash}`;
    }

    if (pathSegments[0] === "notification" && pathSegments[1]) {
      const notifId = encodeURIComponent(pathSegments[1]);
      return `/notifications?id=${notifId}${hash}`;
    }

    if (pathSegments[0] === "profile") {
      const profileId = pathSegments[1] ? encodeURIComponent(pathSegments[1]) : "";
      return profileId ? `/my-passes?user=${profileId}${hash}` : `/my-passes${hash}`;
    }

    if (pathSegments[0] === "auth" || pathname.includes("access_token") || urlString.includes("access_token=")) {
      return "/my-passes";
    }

    const fullPath = pathname + search;
    return fullPath || "/";
  } catch (err) {
    console.warn("Could not parse deep link URL:", urlString, err);
    return null;
  }
}

export function isAuthRequired(path: string): boolean {
  const cleanPath = path.split("?")[0].split("#")[0];
  return AUTH_ROUTES.some((route) => cleanPath === route || cleanPath.startsWith(route + "/"));
}

export function navigateToDeepLink(
  rawUrl: string,
  router: any,
  user: any,
  loading: boolean,
  lastNavRef?: React.MutableRefObject<string | null>
) {
  const targetPath = extractRelativePath(rawUrl);
  if (!targetPath || targetPath === "/") return;

  if (lastNavRef && lastNavRef.current === targetPath) {
    console.log("🔗 Deep Link Duplicate Suppressed:", targetPath);
    return;
  }

  if (lastNavRef) {
    lastNavRef.current = targetPath;
  }

  console.log("🔗 Deep Link Received & Navigating:", rawUrl, "=> Target Path:", targetPath);

  const needsAuth = isAuthRequired(targetPath);

  if (needsAuth && !user && !loading) {
    try {
      sessionStorage.setItem("pending_deep_link", targetPath);
      localStorage.setItem("pending_deep_link", targetPath);
    } catch {}

    router.navigate({
      to: "/auth",
      search: { redirect: targetPath },
      replace: true,
    });
    return;
  }

  try {
    sessionStorage.removeItem("pending_deep_link");
    localStorage.removeItem("pending_deep_link");
  } catch {}

  router.navigate({ to: targetPath });
}

export function useDeepLinks() {
  const router = useRouter();
  const { user, loading } = useSession();
  const lastNavigatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Case 1: App completely closed (Cold launch)
    App.getLaunchUrl()
      .then(async (launchUrl) => {
        if (launchUrl?.url) {
          const oauthDone = await processOAuthCallback(launchUrl.url);
          if (oauthDone) {
            router.navigate({ to: "/my-passes", replace: true });
            return;
          }
          navigateToDeepLink(launchUrl.url, router, user, loading, lastNavigatedRef);
        }
      })
      .catch((err) => console.warn("Failed to get launch URL:", err));

    // Case 2 & Case 3: App running or in background (Warm/Hot launch)
    const listener = App.addListener("appUrlOpen", async (data) => {
      if (data?.url) {
        const oauthDone = await processOAuthCallback(data.url);
        if (oauthDone) {
          router.navigate({ to: "/my-passes", replace: true });
          return;
        }
        navigateToDeepLink(data.url, router, user, loading, lastNavigatedRef);
      }
    });

    return () => {
      listener.then((l) => l.remove()).catch(() => {});
    };
  }, [router, user, loading]);
}
