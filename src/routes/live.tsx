import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Radio,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Check,
  Loader2,
  ChevronLeft,
  Clock,
  Sparkles,
  Play,
  Tv,
  Bell,
} from "lucide-react";
import { settingsQuery, getEmbeddableYouTubeUrl } from "@/lib/festival";
import { Button } from "@/components/ui/button";
import { downloadVideoFile } from "@/lib/utils/video-downloader";
import { supabase } from "@/integrations/supabase/client";
import heroGanapathi from "@/assets/ganapathi-hero.jpg";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Updates & Darshan — Ganapathi Festival 2026" },
      {
        name: "description",
        content: "Watch live darshan from mandap and catch up on latest festival updates.",
      },
      { property: "og:title", content: "Live Updates — Ganapathi Festival 2026" },
      {
        property: "og:description",
        content: "Live stream of aarti, visarjan and cultural events.",
      },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const navigate = useNavigate();
  const { data: settings } = useQuery(settingsQuery);
  const rawUrl = settings?.live_stream_url ?? "";
  const embedUrl = getEmbeddableYouTubeUrl(rawUrl);

  const [isPlayingStream, setIsPlayingStream] = useState(false);

  // Fetch recent notifications for "Latest Updates"
  const { data: dbNotifications = [] } = useQuery({
    queryKey: ["live-updates-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fallback curated updates matching festival schedule
  const defaultUpdates = [
    {
      id: "u-1",
      title: "Maha Aarti Completed",
      time: "Today, 07:00 PM",
      image: heroGanapathi,
    },
    {
      id: "u-2",
      title: "Cultural Program Started",
      time: "Today, 06:00 PM",
      image: heroGanapathi,
    },
    {
      id: "u-3",
      title: "Pooja & Archana Completed",
      time: "Today, 08:00 AM",
      image: heroGanapathi,
    },
  ];

  const displayUpdates =
    dbNotifications.length > 0
      ? dbNotifications.map((n, idx) => ({
          id: n.id,
          title: n.title,
          time: new Date(n.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          image: heroGanapathi,
        }))
      : defaultUpdates;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="mx-auto max-w-lg px-4 py-4 sm:py-6">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="font-display text-xl font-bold text-amber-300 tracking-wide text-center flex-1">
            Live Updates
          </h1>

          <div className="w-9" /> {/* Spacer for symmetry */}
        </div>

        {/* TOP HERO CARD — Live Darshan Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-amber-500/30 p-5 sm:p-6 shadow-2xl overflow-hidden mb-6">
          {/* Subtle Glow Aura behind idol */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />

          {/* LIVE Badge */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/90 text-white font-bold text-[10px] uppercase tracking-wider shadow-md animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>LIVE</span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-center gap-4 relative z-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-amber-300">
                Live Darshan
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-[180px]">
                Watch Ganapathi Live from Mandap
              </p>

              <button
                onClick={() => setIsPlayingStream((v) => !v)}
                className="mt-4 inline-flex items-center gap-2 rounded-full gradient-saffron text-slate-950 font-bold px-5 py-2.5 text-xs sm:text-sm shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{isPlayingStream ? "Close Stream" : "Watch Live"}</span>
              </button>
            </div>

            {/* Ganapathi Idol Artwork */}
            <div className="relative w-28 h-32 sm:w-32 sm:h-36 rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl shrink-0">
              <img
                src={heroGanapathi}
                alt="Lord Ganapathi Live Darshan"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* EXPANDED LIVE STREAM VIDEO PLAYER */}
        {isPlayingStream && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
            <LiveStreamPlayer rawUrl={rawUrl} defaultEmbedUrl={embedUrl} />
          </div>
        )}

        {/* BOTTOM CARD — Latest Updates */}
        <div className="rounded-3xl bg-amber-500/5 dark:bg-stone-900/90 border border-amber-500/20 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Latest Updates</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Realtime
            </span>
          </div>

          {/* List of Updates */}
          <div className="space-y-3 mb-5">
            {displayUpdates.map((update) => (
              <div
                key={update.id}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-amber-500/30 shadow-md">
                  <img
                    src={update.image}
                    alt={update.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                    {update.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{update.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* View All Updates Button */}
          <Link
            to="/notifications"
            className="block w-full py-3 rounded-full gradient-saffron text-slate-950 font-bold text-xs sm:text-sm shadow-md text-center hover:opacity-95 active:scale-[0.99] transition-all"
          >
            View All Updates
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LiveStreamPlayer({
  rawUrl,
  defaultEmbedUrl,
}: {
  rawUrl: string;
  defaultEmbedUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "downloaded" | "error"
  >("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);

  const isDirectVideo = /\.(mp4|webm|mov|m3u8)(\?.*)?$/i.test(rawUrl);

  const handleDownload = () => {
    downloadVideoFile(rawUrl, {
      title: "live-darshan-pandal",
      onProgress: setDownloadProgress,
      onStateChange: setDownloadState,
    });
  };

  if (!defaultEmbedUrl && !isDirectVideo) {
    return (
      <div className="aspect-video grid place-items-center rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-center text-xs text-slate-300">
        The live stream will appear here during aarti timings — 7:00 AM and 7:30 PM daily.
      </div>
    );
  }

  if (isDirectVideo) {
    return (
      <div
        ref={containerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-black shadow-2xl"
      >
        <video
          src={rawUrl}
          controls
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className="h-full w-full object-cover"
        />
        {/* Top Header Shield */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto flex items-center justify-between px-4 z-20">
          <span className="text-[11px] font-bold text-white tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> LIVE DARSHAN
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={downloadState === "downloading"}
              className="rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 gap-1.5 text-[11px] font-semibold px-3 py-1 shadow-lg"
              onClick={handleDownload}
            >
              {downloadState === "downloading" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                  <span>{downloadProgress > 0 ? `${downloadProgress}%` : "Downloading…"}</span>
                </>
              ) : downloadState === "downloaded" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Downloaded</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  <span>Download</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Construct clean YouTube embed parameters hiding YouTube branding, recommendations, title
  let finalEmbedSrc = defaultEmbedUrl;
  try {
    const cleanUrl = new URL(
      defaultEmbedUrl,
      typeof window !== "undefined" ? window.location.href : "https://localhost",
    );
    cleanUrl.searchParams.set("modestbranding", "1");
    cleanUrl.searchParams.set("rel", "0");
    cleanUrl.searchParams.set("iv_load_policy", "3");
    cleanUrl.searchParams.set("showinfo", "0");
    cleanUrl.searchParams.set("controls", "1");
    cleanUrl.searchParams.set("disablekb", "1");
    cleanUrl.searchParams.set("fs", "0");
    cleanUrl.searchParams.set("playsinline", "1");
    cleanUrl.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined") {
      cleanUrl.searchParams.set("origin", window.location.origin);
    }

    if (isMuted) {
      cleanUrl.searchParams.set("mute", "1");
    } else {
      cleanUrl.searchParams.set("mute", "0");
      cleanUrl.searchParams.set("autoplay", "1");
    }
    finalEmbedSrc = cleanUrl.toString();
  } catch (err) {
    console.warn("Live stream URL parse warning:", err);
  }

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    if (iframeRef.current?.contentWindow) {
      const command = newMutedState ? "mute" : "unMute";
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*",
      );
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-amber-500/40 bg-black shadow-2xl"
    >
      <div className="absolute inset-0 overflow-hidden bg-black">
        <iframe
          ref={iframeRef}
          src={finalEmbedSrc}
          title="Live Darshan Stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute -top-[14%] -bottom-[14%] -left-[7%] -right-[7%] h-[128%] w-[114%] max-w-none border-0 pointer-events-auto"
        />
      </div>

      {/* Top Banner Shield */}
      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-auto flex items-center justify-between px-4 z-20">
        <span className="text-[11px] font-bold text-white tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> LIVE DARSHAN PANDAL
        </span>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={downloadState === "downloading"}
            className="rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 gap-1.5 text-[11px] font-semibold px-3 py-1 shadow-lg"
            onClick={handleDownload}
          >
            {downloadState === "downloading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                <span>{downloadProgress > 0 ? `${downloadProgress}%` : "Downloading…"}</span>
              </>
            ) : downloadState === "downloaded" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Downloaded</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-amber-400" />
                <span>Download</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-20 flex items-center justify-between px-4 pb-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 gap-2 text-[11px] font-semibold px-3.5 py-1.5 shadow-lg"
            onClick={toggleMute}
          >
            {isMuted ? (
              <>
                <VolumeX className="h-4 w-4 text-red-400" />
                <span>Unmute Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span>Audio On</span>
              </>
            )}
          </Button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-lg"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
