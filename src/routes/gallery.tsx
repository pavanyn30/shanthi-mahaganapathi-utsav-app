import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { galleryQuery, GalleryItem } from "@/lib/festival";
import {
  Play,
  Heart,
  Film,
  Image as ImageIcon,
  Download,
  Check,
  Loader2,
  Share2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { downloadVideoFile, downloadImageFile } from "@/lib/utils/video-downloader";
import { getGalleryThumbnail } from "@/lib/utils/video-thumbnail";
import { toast } from "sonner";
import heroGanapathi from "@/assets/ganapathi-hero.jpg";
import heroAarti from "@/assets/gallery-hero-aarti.jpg";
import heroDhol from "@/assets/gallery-hero-dhol.jpg";
import heroVisarjan from "@/assets/gallery-hero-visarjan.jpg";

const HERO_SLIDES = [
  {
    id: 1,
    title: "Ganapathi Festival 2026",
    subtitle: "Ganapathi moments, photo archives & video highlights",
    btnText: "Shorts & Reels",
    image: heroGanapathi,
  },
  {
    id: 2,
    title: "Maha Aarti & Darshan",
    subtitle: "Divine evening prayers & glowing lamp celebrations",
    btnText: "Watch Aarti 🪔",
    image: heroAarti,
  },
  {
    id: 3,
    title: "Dhol Tasha Pathak",
    subtitle: "High-energy traditional rhythm & street performances",
    btnText: "Watch Drums 🥁",
    image: heroDhol,
  },
  {
    id: 4,
    title: "Grand Visarjan Procession",
    subtitle: "Saffron color celebrations & sunset ocean procession",
    btnText: "Watch Procession 🌅",
    image: heroVisarjan,
  },
];

import officialLogo from "@/assets/official-ganapathi-logo.png";

export function getItemImageUrls(item: GalleryItem | null | undefined): string[] {
  if (!item || !item.media_url) return [];
  const raw = item.media_url.trim();
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Ignore json parse error
    }
  }
  if (raw.includes("|||")) {
    return raw.split("|||").map((s) => s.trim()).filter(Boolean);
  }
  return [raw];
}

export const Route = createFileRoute("/gallery")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      video: typeof search.video === "string" ? search.video : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Media Gallery — Photos & Videos — Ganapathi Festival 2026" },
      {
        name: "description",
        content:
          "Explore high-definition photos and video highlights from Ganapathi Festival celebrations.",
      },
      {
        property: "og:title",
        content: "Media Gallery — Photos & Videos — Ganapathi Festival 2026",
      },
      {
        property: "og:description",
        content: "Moments from Maha Aarti, Dhol Tasha, stage contests, and grand Visarjan.",
      },
    ],
  }),
  component: GalleryPage,
});

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  if (str.includes("/embed/")) {
    const match = str.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  const match = str.match(/(?:v=|\/shorts\/|\/live\/|\/embed\/|\/v\/|youtu\.be\/|\/e\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  const genericMatch = str.match(/([a-zA-Z0-9_-]{11})/);
  if ((str.includes("youtube.com") || str.includes("youtu.be")) && genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }
  return null;
}

function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeId(url);
  return id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&rel=0&modestbranding=1&showinfo=0&controls=1&playsinline=1`
    : null;
}

function getInstagramId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const match = str.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  return match && match[1] ? match[1] : null;
}

function getGoogleDriveId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  const match1 = str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (match1 && match1[1]) return match1[1];
  const match2 = str.match(/drive\.google\.com\/(?:open|uc)\?.*id=([a-zA-Z0-9_-]+)/i);
  if (match2 && match2[1]) return match2[1];
  return null;
}

function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();

  // 1. YouTube
  const yt = getYouTubeEmbedUrl(str);
  if (yt) return yt;

  // 2. Instagram Reels / Posts
  const igId = getInstagramId(str);
  if (igId) {
    return `https://www.instagram.com/p/${igId}/embed`;
  }

  // 3. Google Drive
  const driveId = getGoogleDriveId(str);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  // 4. Vimeo
  const vimeoMatch = str.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&loop=1&muted=1`;
  }

  return null;
}

function isVideoUrlFormat(url: string | null | undefined): boolean {
  if (!url) return false;
  const str = url.trim();
  return (
    str.startsWith("data:video/") ||
    str.startsWith("blob:") ||
    /\.(mp4|webm|mov|ogg|m3u8)(\?.*)?$/i.test(str) ||
    /youtube\.com|youtu\.be|vimeo\.com|instagram\.com|drive\.google\.com|facebook\.com|fb\.watch/i.test(str)
  );
}

function checkIsVideoItem(item: GalleryItem | null | undefined): boolean {
  if (!item) return false;
  const targetUrl = item.video_url || item.media_url;
  return item.media_type === "video" || isVideoUrlFormat(targetUrl);
}

function getItemYear(item: GalleryItem): number {
  if (!item) return 2026;
  const match = (item.title + " " + (item.category || "")).match(/\b(202[0-9])\b/);
  if (match && match[1]) {
    const yr = parseInt(match[1], 10);
    if (!isNaN(yr) && yr >= 2020 && yr <= 2030) return yr;
  }
  if (item.created_at) {
    const yr = new Date(item.created_at).getFullYear();
    if (!isNaN(yr) && yr >= 2020 && yr <= 2030) return yr;
  }
  return 2026;
}

export function cleanDisplayTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title.replace(/\s*\(\d{4}\)/g, "").replace(/\*\*/g, "").trim();
}

export function detectIsReelMedia(item: GalleryItem | null | undefined): boolean {
  if (!item) return false;
  const targetUrl = item.video_url || item.media_url || item.thumbnail_url || "";
  const titleCategory = (item.title + " " + (item.category || "")).toLowerCase();
  
  if (titleCategory.includes("reel") || titleCategory.includes("short") || titleCategory.includes("portrait") || titleCategory.includes("9:16") || titleCategory.includes("9-16")) {
    return true;
  }

  if (targetUrl.includes("shorts") || targetUrl.includes("/reel/") || targetUrl.includes("instagram.com/reel")) {
    return true;
  }

  return false;
}

function GalleryLightboxMediaView({
  media,
  onDownload,
}: {
  media: GalleryItem;
  onDownload?: (item: GalleryItem, e?: React.MouseEvent) => void;
}) {
  const targetUrl = (media.video_url && media.video_url.trim().length > 0)
    ? media.video_url.trim()
    : (media.media_url || "").trim();

  const embedUrl = getEmbedUrl(targetUrl);
  const isVideo = media.media_type === "video" || isVideoUrlFormat(targetUrl);
  const posterUrl = media.thumbnail_url || (media.media_type === "image" ? media.media_url : null) || heroGanapathi;
  const isReel = detectIsReelMedia(media);

  if (embedUrl) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl bg-black border border-amber-500/20 shadow-inner flex items-center justify-center ${isReel ? "aspect-[9/16] max-h-[70vh] sm:max-h-[75vh]" : "aspect-video max-h-[60vh]"}`}>
        <iframe
          src={embedUrl}
          title={cleanDisplayTitle(media.title)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0 object-contain"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={`relative w-full flex items-center justify-center bg-black rounded-2xl overflow-hidden ${isReel ? "max-h-[70vh] sm:max-h-[75vh] aspect-[9/16]" : "max-h-[60vh] sm:max-h-[65vh] aspect-auto"}`}>
        <video
          src={targetUrl}
          controls
          autoPlay
          playsInline
          poster={posterUrl}
          className="w-full h-full max-h-[70vh] sm:max-h-[75vh] rounded-2xl object-contain"
        />
        {/* Floating Top-Right Download Button for unsupported or black screen videos */}
        {onDownload && (
          <button
            onClick={(e) => onDownload(media, e)}
            className="absolute top-2 right-2 z-30 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/85 text-amber-400 backdrop-blur-md border border-amber-500/40 text-xs font-extrabold shadow-lg hover:bg-black hover:text-white transition-all active:scale-95"
            title="Download video file directly"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full flex items-center justify-center bg-black rounded-2xl overflow-hidden ${isReel ? "max-h-[70vh] sm:max-h-[75vh] aspect-[9/16]" : "max-h-[60vh] sm:max-h-[65vh] aspect-auto"}`}>
      <img
        src={media.media_url || heroGanapathi}
        alt={cleanDisplayTitle(media.title)}
        className="w-full h-full max-h-[70vh] sm:max-h-[75vh] rounded-2xl object-contain"
      />
    </div>
  );
}

function GalleryPage() {
  const queryClient = useQueryClient();
  const { data: dbItems = [] } = useQuery(galleryQuery);

  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "downloaded" | "error"
  >("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Auto-open video from search param ?video=ID
  useEffect(() => {
    if (typeof window === "undefined" || dbItems.length === 0) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get("video");
      if (videoId) {
        const found = dbItems.find((item) => item.id === videoId);
        if (found) {
          setSelectedMedia(found);
          const yr = getItemYear(found);
          if (yr) setSelectedYear(yr);
        }
      }
    } catch {
      // Ignore
    }
  }, [dbItems]);

  // Auto-scrolling Banner Carousel State
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [isHovered]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ganesh_gallery_liked_map");
      if (stored) {
        setLikedMap(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load liked state from storage", e);
    }
  }, []);

  // Deduplicate dbItems strictly by id or media_url
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return dbItems.filter((item) => {
      const key = item.id || item.media_url || item.video_url;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [dbItems]);

  // Extract all distinct years from unique items
  const memoryYears = useMemo(() => {
    const set = new Set<number>([2026, 2025, 2024]);
    uniqueItems.forEach((item) => {
      set.add(getItemYear(item));
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [uniqueItems]);

  // Group items strictly by year without duplicate reuse
  const itemsByYear = useMemo(() => {
    const map: Record<number, GalleryItem[]> = {};
    memoryYears.forEach((yr) => {
      map[yr] = [];
    });
    uniqueItems.forEach((item) => {
      const yr = getItemYear(item);
      if (!map[yr]) map[yr] = [];
      map[yr].push(item);
    });
    return map;
  }, [uniqueItems, memoryYears]);

  const currentYearItems = useMemo(() => {
    if (selectedYear === "all") return uniqueItems;
    return itemsByYear[selectedYear] || [];
  }, [itemsByYear, selectedYear, uniqueItems]);

  const handleShareMedia = async (item: GalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `https://shanthimahaganapathi-2026.web.app/video/${item.id}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out "${item.title}" on Ganapathi Festival 2026!`,
          url: shareUrl,
        });
        toast.success("🔗 Shared successfully!");
        return;
      } catch (_err) {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("🔗 Link copied to clipboard!");
    } catch {
      toast.success("🔗 Link copied to clipboard!");
    }
  };

  const toggleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyLiked = likedMap[id] || false;
    const nextLikedState = !currentlyLiked;
    const delta = nextLikedState ? 1 : -1;

    setLikedMap((prev) => {
      const updated = { ...prev, [id]: nextLikedState };
      try {
        localStorage.setItem("ganesh_gallery_liked_map", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to save liked state to storage", err);
      }
      return updated;
    });

    if (nextLikedState) {
      toast.success("❤️ Liked!");
    }

    try {
      await supabase.rpc("toggle_gallery_like", {
        p_item_id: id,
        p_increment: delta,
      });
    } catch (err) {
      console.warn("Error updating like count:", err);
    } finally {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    }
  };

  const handleDownloadMedia = (media: GalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isVideo =
      media.media_type === "video" || isVideoUrlFormat(media.video_url || media.media_url);
    const mediaUrl = media.video_url || media.media_url;

    if (isVideo) {
      downloadVideoFile(mediaUrl, {
        title: media.title,
        onProgress: setDownloadProgress,
        onStateChange: setDownloadState,
      });
    } else {
      downloadImageFile(mediaUrl, {
        title: media.title,
        onProgress: setDownloadProgress,
        onStateChange: setDownloadState,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 pb-28 select-none">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TOP OFFICIAL LOGO HEADER */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-4 mb-6">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-300 tracking-wide">
            Shree Shanthi Maha Ganapathi
          </h1>
          <p className="text-xs sm:text-sm text-amber-400/80 font-semibold mt-1">
            Festive Gallery &amp; Celebration Archives
          </p>
        </div>

        {/* 2. YEAR FILTER SEGMENTED PILLS BAR */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 overflow-x-auto py-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedYear("all")}
            className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center gap-1.5 ${
              selectedYear === "all"
                ? "bg-amber-500 text-slate-950 shadow-lg scale-105"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <span>All Years</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
              {uniqueItems.length}
            </span>
          </button>

          {memoryYears.map((yr) => {
            const count = (itemsByYear[yr] || []).length;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all duration-300 flex items-center gap-1.5 ${
                  selectedYear === yr
                    ? "bg-amber-500 text-slate-950 shadow-lg scale-105"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span>{yr}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-current">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. FEATURED HIGHLIGHT COLLAGE GRID */}
        {currentYearItems.length >= 3 && (
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Main Highlight Card */}
              {(() => {
                const mainItem = currentYearItems[0];
                const isMainVideo = checkIsVideoItem(mainItem);
                return (
                  <div
                    onClick={() => setSelectedMedia(mainItem)}
                    className="md:col-span-2 lg:col-span-2 group relative aspect-[16/9] md:aspect-[4/3] rounded-3xl overflow-hidden border border-amber-500/30 bg-slate-950 shadow-xl cursor-pointer hover:border-amber-400/60 transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={getGalleryThumbnail(mainItem)}
                      alt={mainItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Center Play Button for Videos */}
                    {isMainVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform shadow-lg">
                          <Play className="w-5 h-5 fill-white translate-x-0.5" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-10">
                      <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 truncate">
                        {isMainVideo ? (
                          <Play className="w-4 h-4 fill-white shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{cleanDisplayTitle(mainItem.title)}</span>
                      </span>
                      <button
                        onClick={(e) => handleDownloadMedia(mainItem, e)}
                        className="p-2 rounded-full bg-black/70 text-amber-400 hover:text-white backdrop-blur-sm border border-amber-500/30 transition-transform active:scale-90"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Additional Featured Cards */}
              <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 md:col-span-1 lg:col-span-2 gap-4">
                {[1, 2].map((idx) => {
                  const item = currentYearItems[idx];
                  if (!item) return null;
                  const thumbnail = getGalleryThumbnail(item);
                  const isVideo = checkIsVideoItem(item);

                  return (
                    <div
                      key={item.id + "-" + idx}
                      onClick={() => setSelectedMedia(item)}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-950 shadow-md cursor-pointer hover:border-amber-400/60 transition-all hover:scale-[1.02]"
                    >
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Center Play Button for Videos */}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                          </div>
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white z-10">
                        <span className="text-xs font-bold flex items-center gap-1 truncate">
                          {isVideo ? (
                            <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{cleanDisplayTitle(item.title)}</span>
                        </span>
                        <button
                          onClick={(e) => handleDownloadMedia(item, e)}
                          className="p-1.5 rounded-full bg-black/70 text-amber-400 hover:text-white backdrop-blur-sm border border-amber-500/30"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. YEAR-WISE GROUPED ALBUMS SECTION */}
        {memoryYears.map((yr) => {
          if (selectedYear !== yr) return null;

          const yearItems = itemsByYear[yr] || [];

          return (
            <div key={yr} className="mb-10">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  <span>Memory {yr}</span>
                  <span className="text-xs font-semibold text-amber-400/80 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {yearItems.length} items
                  </span>
                </h2>
              </div>

              {yearItems.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                  <Sparkles className="w-8 h-8 mx-auto text-amber-500/40 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No uploads listed under {yr} yet
                  </p>
                </div>
              ) : (
                /* Responsive Album Cards Grid (2 cols on mobile, 3 on tablet, 4 on desktop, 6 on xl) */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 items-start">
                  {yearItems.map((item) => {
                    const thumbnail = getGalleryThumbnail(item);
                    const title = item.title;
                    const isVideo = checkIsVideoItem(item);
                    const isReel = detectIsReelMedia(item);

                    return (
                      <div key={item.id} className="relative group cursor-pointer">
                        {/* Foreground Card */}
                        <div
                          onClick={() => setSelectedMedia(item)}
                          className={`relative rounded-2xl overflow-hidden border border-amber-500/30 bg-slate-950 shadow-xl hover:border-amber-400/70 transition-all group-hover:scale-[1.03] ${
                            isReel ? "aspect-[9/16]" : "aspect-square"
                          }`}
                        >
                          <img
                            src={thumbnail}
                            alt={cleanDisplayTitle(title)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

                          {/* Center Circular Play Button - ONLY FOR VIDEOS */}
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:scale-110 active:scale-90 transition-transform shadow-lg">
                                <Play className="w-4 h-4 fill-white translate-x-0.5" />
                              </div>
                            </div>
                          )}

                          {/* Top-Right Download Icon */}
                          <button
                            onClick={(e) => handleDownloadMedia(item, e)}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 text-amber-400 hover:text-white backdrop-blur-md border border-white/20 transition-all active:scale-90"
                            title="Download Media"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Bottom Overlay Title Label */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5">
                            <span className="text-xs font-extrabold text-white truncate flex items-center gap-1 drop-shadow-md">
                              {isVideo ? (
                                <Play className="w-3 h-3 fill-white shrink-0" />
                              ) : (
                                <ImageIcon className="w-3 h-3 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">{cleanDisplayTitle(title)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FULL-SCREEN LIGHTBOX MODAL FOR PHOTO / VIDEO */}
      {selectedMedia && (
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-lg w-[94vw] sm:w-full rounded-3xl bg-slate-950 p-4 text-slate-100 border border-amber-500/40 shadow-2xl overflow-y-auto max-h-[92vh]">
            <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 pb-2.5">
              <DialogTitle className="font-display text-sm sm:text-base font-bold text-amber-300 break-words pr-4 line-clamp-2">
                {cleanDisplayTitle(selectedMedia.title)}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2.5 relative rounded-2xl overflow-hidden bg-black/90 border border-slate-800 flex items-center justify-center min-h-[180px] max-h-[50vh] sm:max-h-[55vh]">
              <GalleryLightboxMediaView
                media={selectedMedia}
                onDownload={handleDownloadMedia}
              />
            </div>

            {/* Responsive Action Buttons Footer */}
            <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  onClick={(e) => toggleLike(selectedMedia.id, e)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    likedMap[selectedMedia.id]
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-slate-900 text-slate-300 border border-slate-800 hover:text-white"
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${likedMap[selectedMedia.id] ? "fill-rose-400 text-rose-400" : ""}`}
                  />
                  <span>{selectedMedia.likes || 0} Likes</span>
                </button>

                <Button
                  onClick={(e) => handleShareMedia(selectedMedia, e)}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs font-semibold border-slate-800 text-amber-400 hover:bg-slate-900 px-3 py-1.5 h-8"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Share
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {checkIsVideoItem(selectedMedia) && (selectedMedia.video_url || selectedMedia.media_url) && (
                  <a
                    href={selectedMedia.video_url || selectedMedia.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 hover:bg-slate-800 text-xs font-semibold h-9 transition-colors"
                    title="Play raw video stream directly if your device screen is black"
                  >
                    <Play className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
                    <span>Stream 🍿</span>
                  </a>
                )}

                <Button
                  onClick={() => handleDownloadMedia(selectedMedia)}
                  disabled={downloadState === "downloading"}
                  size="sm"
                  className="flex-1 sm:flex-initial rounded-full gradient-saffron text-slate-950 font-extrabold text-xs shadow-md px-4 py-1.5 h-9"
                >
                  {downloadState === "downloading" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950 mr-1" />
                      <span>{downloadProgress > 0 ? `${downloadProgress}%` : "Downloading…"}</span>
                    </>
                  ) : downloadState === "downloaded" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950 mr-1" />
                      <span>Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-slate-950 mr-1" />
                      <span>
                        Download{" "}
                        {selectedMedia.media_type === "video" ||
                        isVideoUrlFormat(selectedMedia.video_url || selectedMedia.media_url)
                          ? "Video 📥"
                          : "Photo 📥"}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
