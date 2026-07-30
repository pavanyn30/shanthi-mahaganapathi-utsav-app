import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Radio, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { settingsQuery, getEmbeddableYouTubeUrl } from "@/lib/festival";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Darshan — Ganapathi Festival 2026" },
      { name: "description", content: "Watch the live aarti and cultural programmes from the Ganapathi mandap." },
      { property: "og:title", content: "Live Darshan — Ganapathi Festival 2026" },
      { property: "og:description", content: "Live stream of aarti, visarjan and cultural events." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data: settings } = useQuery(settingsQuery);
  const rawUrl = settings?.live_stream_url ?? "";
  const embedUrl = getEmbeddableYouTubeUrl(rawUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-destructive">
            <Radio className="h-4 w-4 animate-pulse" /> Live darshan
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Aarti & cultural programmes</h1>
        </div>
      </div>

      <div className="mt-8">
        <LiveStreamPlayer rawUrl={rawUrl} defaultEmbedUrl={embedUrl} />
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

  if (!defaultEmbedUrl) {
    return (
      <div className="card-premium aspect-video grid place-items-center bg-secondary p-8 text-center text-sm text-muted-foreground">
        The live stream will appear here during aarti timings — 7:00 AM and 7:30 PM daily.
      </div>
    );
  }

  // Construct clean YouTube embed parameters hiding YouTube branding, recommendations, title
  const cleanUrl = new URL(defaultEmbedUrl);
  cleanUrl.searchParams.set("modestbranding", "1");
  cleanUrl.searchParams.set("rel", "0");
  cleanUrl.searchParams.set("iv_load_policy", "3");
  cleanUrl.searchParams.set("showinfo", "0");
  cleanUrl.searchParams.set("controls", "1");
  cleanUrl.searchParams.set("enablejsapi", "1");

  if (isMuted) {
    cleanUrl.searchParams.set("mute", "1");
  } else {
    cleanUrl.searchParams.set("mute", "0");
    cleanUrl.searchParams.set("autoplay", "1");
  }

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    // Send postMessage to YouTube iFrame API if available
    if (iframeRef.current?.contentWindow) {
      const command = newMutedState ? "mute" : "unMute";
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: command, args: [] }),
        "*"
      );
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-border/80 bg-black shadow-2xl"
    >
      {/* YouTube Clean Embed Iframe */}
      <iframe
        ref={iframeRef}
        src={cleanUrl.toString()}
        title="Live Darshan Stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />

      {/* Top Banner Shield - Blocks YouTube Title bar navigation clicks */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto flex items-center px-4">
        <span className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> LIVE DARSHAN PANDAL
        </span>
      </div>

      {/* Floating Bottom Control Bar with Speaker & Fullscreen */}
      <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Speaker Mute/Unmute Toggle */}
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full bg-black/75 hover:bg-black/95 text-white backdrop-blur-md border border-white/20 gap-2 text-xs font-semibold px-3.5 py-1.5"
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
          {/* Fullscreen Toggle */}
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-black/75 hover:bg-black/95 text-white backdrop-blur-md border border-white/20"
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
