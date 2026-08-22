import { supabase } from "@/integrations/supabase/client";
import heroGanapathi from "@/assets/ganapathi-hero.jpg";
import heroAarti from "@/assets/gallery-hero-aarti.jpg";
import heroDhol from "@/assets/gallery-hero-dhol.jpg";
import heroVisarjan from "@/assets/gallery-hero-visarjan.jpg";
import officialLogo from "@/assets/official-ganapathi-logo.png";
import shanthiLogo from "@/assets/shanthi-logo.png";
import ganapathiMark from "@/assets/ganapathi-mark.png";
import splashImg from "@/assets/pavonix-splash.png";

// Global cache set to prevent duplicate preloads
const preloadedUrls = new Set<string>();

/**
 * Preload an image smoothly without blocking the main UI thread.
 */
function preloadSingleImage(url: string): Promise<void> {
  if (!url || preloadedUrls.has(url)) return Promise.resolve();
  preloadedUrls.add(url);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resolve gracefully on error
    img.src = url;
  });
}

/**
 * Preload video metadata / initial bytes smoothly in background.
 */
function preloadSingleVideo(url: string): Promise<void> {
  if (!url || preloadedUrls.has(url)) return Promise.resolve();
  preloadedUrls.add(url);

  // Skip YouTube/Instagram embed URLs for raw video preloading
  if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("instagram.com")) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => resolve();
      video.onerror = () => resolve();
      video.src = url;
    } catch {
      resolve();
    }
  });
}

/**
 * Smooth, non-blocking background media preloader.
 * Executed during Splash Screen display so all images and videos across
 * the entire website are loaded into browser cache for instant display.
 */
export function preloadWebsiteMediaInBackground() {
  if (typeof window === "undefined") return;

  const runPreload = async () => {
    try {
      // 1. Static Local Hero Assets & Logos
      const staticImages = [
        heroGanapathi,
        heroAarti,
        heroDhol,
        heroVisarjan,
        officialLogo,
        shanthiLogo,
        ganapathiMark,
        splashImg,
      ];

      // Preload static images in small non-blocking batches
      for (const imgUrl of staticImages) {
        await preloadSingleImage(imgUrl);
      }

      // 2. Fetch Live Database Media from Supabase (Gallery Items & Festival Memories)
      const [galleryRes, memoriesRes] = await Promise.all([
        supabase
          .from("gallery_items")
          .select("media_url, video_url, thumbnail_url, media_type"),
        supabase
          .from("festival_memories")
          .select("cover_image_url, photos"),
      ]);

      const mediaToPreload: { type: "image" | "video"; url: string }[] = [];

      if (galleryRes.data) {
        galleryRes.data.forEach((item) => {
          if (item.thumbnail_url) mediaToPreload.push({ type: "image", url: item.thumbnail_url });
          if (item.media_url) {
            if (item.media_type === "video" || item.video_url) {
              mediaToPreload.push({ type: "video", url: item.video_url || item.media_url });
            } else {
              mediaToPreload.push({ type: "image", url: item.media_url });
            }
          }
        });
      }

      if (memoriesRes.data) {
        memoriesRes.data.forEach((m) => {
          if (m.cover_image_url) mediaToPreload.push({ type: "image", url: m.cover_image_url });
          if (Array.isArray(m.photos)) {
            m.photos.forEach((photoUrl: string) => {
              if (photoUrl) mediaToPreload.push({ type: "image", url: photoUrl });
            });
          }
        });
      }

      // 3. Preload items in smooth background chunks using requestIdleCallback / setTimeout
      for (let i = 0; i < mediaToPreload.length; i++) {
        const item = mediaToPreload[i];
        if (item.type === "image") {
          preloadSingleImage(item.url);
        } else {
          preloadSingleVideo(item.url);
        }

        // Stagger requests slightly to keep splash animation 60fps silky smooth
        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 40));
        }
      }
    } catch (err) {
      console.warn("Background media preloading warning:", err);
    }
  };

  // Schedule execution when browser is idle or immediately after splash mount
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(() => runPreload(), { timeout: 1000 });
  } else {
    setTimeout(runPreload, 100);
  }
}
