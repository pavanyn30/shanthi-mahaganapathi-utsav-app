import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  Film,
  Images,
  Volume2,
  VolumeX,
  Music,
  Disc,
  Download,
} from "lucide-react";
import { memoriesQuery } from "@/lib/festival";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadImageFile } from "@/lib/utils/video-downloader";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Festival Memories & Heritage Gallery — SHANTHI MAHA GANAPATHI 2026" },
      {
        name: "description",
        content:
          "Explore the year-wise journey, golden memories, photo archives and celebrations across the years.",
      },
      {
        property: "og:title",
        content: "Festival Memories & Heritage Gallery — SHANTHI MAHA GANAPATHI 2026",
      },
    ],
  }),
  component: MemoriesPage,
});

// Ganapathi Devotional Audio Songs Selection
const GANAPATHI_SONGS = [
  {
    id: "ekadantaya-1",
    title: "Ekadantaya Vakratundaya Gauri Tanaya Dhimahi",
    url: "/audio/ekadantaya-vakratundaya.mp3",
  },
  {
    id: "aarti-2",
    title: "Sukhakarta Dukhaharta (Ganapathi Aarti)",
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "mantra-3",
    title: "Sacred Temple Flute & Chanting",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a816db.mp3",
  },
];

function MemoriesPage() {
  const { data: rawMemories = [] } = useQuery(memoriesQuery);
  const memories = useMemo(() => {
    return [...rawMemories].sort(
      (a, b) => a.year - b.year || (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [rawMemories]);

  // Build a complete flattened list of ALL photos across ALL festival memories
  const allReelPhotos = useMemo(() => {
    const list: {
      id: string;
      memoryId: string;
      year: number;
      title: string;
      description: string;
      imageUrl: string;
      photoNum: number;
      totalPhotos: number;
    }[] = [];

    memories.forEach((item) => {
      const urls: string[] = [];
      if (item.cover_image_url) urls.push(item.cover_image_url);
      if (Array.isArray(item.photos)) {
        item.photos.forEach((url) => {
          if (url && !urls.includes(url)) {
            urls.push(url);
          }
        });
      }

      if (urls.length === 0) return;

      urls.forEach((url, pIdx) => {
        list.push({
          id: `${item.id}-${pIdx}`,
          memoryId: item.id,
          year: item.year,
          title: item.title,
          description: item.description,
          imageUrl: url,
          photoNum: pIdx + 1,
          totalPhotos: urls.length,
        });
      });
    });

    return list;
  }, [memories]);

  // Cinematic Story Showcase States
  const [isCinemaOpen, setIsCinemaOpen] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "all">("all");
  const [progress, setProgress] = useState(0);

  // Audio Music States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeSlide = allReelPhotos[reelIndex];
  const activeSong = GANAPATHI_SONGS[selectedSongIndex];
  const uniqueYears = Array.from(new Set(memories.map((m) => m.year))).sort((a, b) => a - b);

  // Manage Audio Playback when Cinema Mode is Active
  useEffect(() => {
    if (!audioRef.current) return;

    if (isCinemaOpen && isPlaying && !isAudioMuted) {
      audioRef.current.play().then(() => {
        setAudioBlocked(false);
      }).catch(() => {
        setAudioBlocked(true);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isCinemaOpen, isPlaying, isAudioMuted, selectedSongIndex]);

  const toggleAudio = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAudioMuted) {
      setIsAudioMuted(false);
      setAudioBlocked(false);
      if (audioRef.current) {
        audioRef.current.play().catch(() => setAudioBlocked(true));
      }
    } else {
      setIsAudioMuted(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  // Auto-advance progress bar in Cinema Showcase Mode smoothly without jumping
  useEffect(() => {
    if (!isCinemaOpen || !isPlaying || allReelPhotos.length === 0) {
      setProgress(0);
      return;
    }

    setProgress(0);

    const duration = 5000; // 5 seconds per photo slide
    const intervalTime = 50; // update progress every 50ms
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;

      if (newProgress >= 100) {
        clearInterval(timer);
        setProgress(0);
        setReelIndex((prev) => (prev + 1) % allReelPhotos.length);
      } else {
        setProgress(newProgress);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isCinemaOpen, isPlaying, reelIndex, allReelPhotos.length]);

  const handleStartCinema = (index = 0) => {
    setReelIndex(index >= 0 && index < allReelPhotos.length ? index : 0);
    setProgress(0);
    setIsPlaying(true);
    setIsCinemaOpen(true);
    setIsAudioMuted(false);
  };

  const handleNextCinema = () => {
    if (allReelPhotos.length === 0) return;
    setReelIndex((prev) => (prev + 1) % allReelPhotos.length);
    setProgress(0);
  };

  const handlePrevCinema = () => {
    if (allReelPhotos.length === 0) return;
    setReelIndex((prev) => (prev - 1 + allReelPhotos.length) % allReelPhotos.length);
    setProgress(0);
  };

  const scrollToYear = (year: number | "all") => {
    setSelectedYearFilter(year);
    if (year !== "all") {
      const el = document.getElementById(`memory-year-${year}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const filteredMemories =
    selectedYearFilter === "all"
      ? memories
      : memories.filter((m) => m.year === selectedYearFilter);

  return (
    <div className="min-h-screen bg-background pb-20 select-none">
      {/* Background Devotional Audio Element */}
      <audio
        ref={audioRef}
        src={activeSong.url}
        loop
        preload="auto"
      />

      {/* Hero Banner Section with Cinematic Controls */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-950 via-black to-background py-16 sm:py-24 text-white">
        {/* Mobile Back Home Button */}
        <Link
          to="/"
          className="lg:hidden absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white border border-white/20 shadow-lg hover:bg-black active:scale-95 transition"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </Link>

        {/* Ambient Glowing Background Orbs */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-orange-600/15 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-extrabold sm:text-6xl tracking-tight text-gradient-saffron animate-in fade-in duration-700">
            Festival Memories & Heritage
          </h1>

          {/* Cinematic Showcase Action Bar */}
          {allReelPhotos.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => handleStartCinema(0)}
                className="group relative rounded-full gradient-saffron px-6 py-6 text-sm font-extrabold text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-amber-500/30 active:scale-95"
              >
                <Film className="mr-2 h-5 w-5 animate-bounce group-hover:animate-spin" />
                🎬 Watch Story Reel with Devotional Songs 🎵
                <Sparkles className="ml-2 h-4 w-4 opacity-80" />
              </Button>
            </div>
          )}

          {/* Year Filter Quick Jump Bar */}
          {uniqueYears.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => scrollToYear("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  selectedYearFilter === "all"
                    ? "bg-amber-500 text-stone-950 shadow-md scale-105"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                All Years ({memories.length})
              </button>
              {uniqueYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => scrollToYear(yr)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    selectedYearFilter === yr
                      ? "bg-amber-500 text-stone-950 shadow-md scale-105"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Timeline Section with Staggered Entrance Animations */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {memories.length === 0 ? (
          <div className="card-premium p-12 text-center text-muted-foreground">
            <Calendar className="mx-auto h-10 w-10 text-primary opacity-60" />
            <p className="mt-3 text-base font-semibold">No festival memories posted yet.</p>
            <p className="mt-1 text-xs">
              Organizers can add yearly memory cards from the admin panel.
            </p>
          </div>
        ) : (
          <div className="relative space-y-16 before:absolute before:inset-0 before:left-4 before:h-full before:w-1 before:bg-gradient-to-b before:from-amber-500 before:via-orange-500/60 before:to-transparent sm:before:left-1/2 sm:before:-ml-0.5">
            {filteredMemories.map((item, idx) => {
              const startIdx = allReelPhotos.findIndex((p) => p.memoryId === item.id);
              const isEven = idx % 2 === 0;

              const photosCount = [
                item.cover_image_url,
                ...(Array.isArray(item.photos) ? item.photos : []),
              ].filter(Boolean).length;

              return (
                <div
                  key={item.id}
                  id={`memory-year-${item.year}`}
                  className={`relative flex flex-col gap-6 sm:flex-row transition-all duration-700 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards ${
                    isEven ? "sm:flex-row-reverse" : ""
                  }`}
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  {/* Timeline Year Node Icon */}
                  <div className="absolute left-4 -ml-4 sm:left-1/2 sm:-ml-5 top-0 flex h-10 w-10 items-center justify-center rounded-full gradient-saffron text-primary-foreground shadow-xl ring-4 ring-amber-500/30 z-10 font-black text-xs animate-pulse">
                    {item.year}
                  </div>

                  {/* Card Content Box */}
                  <div className="ml-10 sm:ml-0 sm:w-1/2 sm:px-6">
                    <div
                      onClick={() => handleStartCinema(startIdx >= 0 ? startIdx : 0)}
                      className="card-premium group relative overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:border-amber-500/40"
                    >
                      {/* Cover Banner Image */}
                      {item.cover_image_url && (
                        <div className="relative w-full overflow-hidden bg-black/40 flex items-center justify-center min-h-[180px] sm:min-h-[200px] max-h-[480px] sm:max-h-[280px]">
                          <OptimizedImage
                            src={item.cover_image_url}
                            alt={item.title}
                            objectFit="contain"
                            className="w-full h-auto max-h-[480px] sm:max-h-[280px] object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <div className="absolute top-3 left-3 text-white z-10 flex items-center gap-2">
                            <span className="rounded-full bg-black/70 backdrop-blur-md px-3 py-1.5 text-xs font-bold border border-white/20 shadow-md">
                              {item.year} Memory
                            </span>
                            {photosCount > 1 && (
                              <span className="rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-xs font-bold border border-white/20 shadow-md flex items-center gap-1">
                                <Images className="h-3 w-3 text-amber-400" /> {photosCount}
                              </span>
                            )}
                          </div>

                          {/* Top Right Download Icon Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImageFile(item.cover_image_url, {
                                title: `${item.title} (${item.year})`,
                              });
                            }}
                            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 hover:bg-amber-500 text-amber-400 hover:text-slate-950 backdrop-blur-md border border-white/20 shadow-lg transition-all active:scale-90"
                            title="Download Photo"
                            aria-label="Download Photo"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Hover Play Story Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="rounded-full gradient-saffron px-4 py-2 text-xs font-extrabold text-stone-950 shadow-2xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                              <Play className="h-4 w-4 fill-current" /> Watch Reel with Music 🎵
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Details Content */}
                      <div className="p-6">
                        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h2>
                        {item.description && (
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spacer for 2-column layout on desktop */}
                  <div className="hidden sm:block sm:w-1/2" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FULLSCREEN CINEMATIC SHOWCASE REEL MODAL WITH DEVOTIONAL MUSIC */}
      {isCinemaOpen && activeSlide && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white backdrop-blur-2xl animate-in fade-in duration-300 select-none">
          {/* Ambient Background Blur Image */}
          {activeSlide.imageUrl && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
              <img
                src={activeSlide.imageUrl}
                alt=""
                className="h-full w-full object-cover blur-3xl scale-125"
              />
            </div>
          )}

          {/* Top Header Controls & Progress Bars */}
          <div className="relative z-20 p-4 sm:p-6 bg-gradient-to-b from-black/90 to-transparent">
            {/* Story Progress Bars */}
            <div className="flex gap-1 mb-3 max-w-5xl mx-auto overflow-hidden">
              {allReelPhotos.map((m, idx) => {
                let barWidth = "0%";
                if (idx < reelIndex) barWidth = "100%";
                else if (idx === reelIndex) barWidth = `${progress}%`;

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setReelIndex(idx);
                      setProgress(0);
                    }}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20 cursor-pointer min-w-[4px]"
                  >
                    <div
                      className="h-full gradient-saffron transition-all duration-75"
                      style={{ width: barWidth }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div className="flex items-center gap-3">
                <Badge className="rounded-full gradient-saffron px-3 py-1 text-xs font-black text-stone-950">
                  {activeSlide.year} MEMORY
                </Badge>
                {activeSlide.totalPhotos > 1 && (
                  <span className="text-xs text-amber-400 font-bold">
                    Photo {activeSlide.photoNum} of {activeSlide.totalPhotos}
                  </span>
                )}
                <span className="text-xs text-white/70 font-semibold hidden sm:inline">
                  Slide {reelIndex + 1} of {allReelPhotos.length}
                </span>
              </div>

              {/* Music & Playback Controls Header Group */}
              <div className="flex items-center gap-2">
                {/* Download Active Slide Button */}
                {activeSlide.imageUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImageFile(activeSlide.imageUrl, {
                        title: `${activeSlide.title} - Photo ${activeSlide.photoNum}`,
                      });
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-white/20 px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95"
                    title="Download Photo"
                    aria-label="Download Photo"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}

                {/* Audio Music Toggle Button */}
                <button
                  onClick={toggleAudio}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition-all border ${
                    !isAudioMuted
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse"
                      : "bg-white/10 text-white/60 border-white/20"
                  }`}
                  title={isAudioMuted ? "Enable Music" : "Mute Music"}
                >
                  {!isAudioMuted ? (
                    <>
                      <Volume2 className="h-4 w-4 text-amber-400 animate-bounce" />
                      <span className="hidden sm:inline">Music ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 text-white/50" />
                      <span className="hidden sm:inline">Muted</span>
                    </>
                  )}
                </button>

                {/* Pause / Play Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95"
                  title={isPlaying ? "Pause Reel" : "Play Reel"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsCinemaOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95"
                  title="Close Cinema Mode"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Audio Autoplay Unmute Prompt Banner if Blocked by Browser */}
            {audioBlocked && (
              <div className="mt-3 flex items-center justify-center">
                <button
                  onClick={toggleAudio}
                  className="rounded-full bg-amber-500 text-stone-950 px-4 py-1.5 text-xs font-black shadow-lg animate-bounce flex items-center gap-2"
                >
                  <Volume2 className="h-4 w-4" /> 🔊 Tap to Unmute Ganapathi Devotional Music
                </button>
              </div>
            )}
          </div>

          {/* Main Cinematic Media View */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-8 overflow-hidden">
            {/* Left Tap Zone */}
            <div
              onClick={handlePrevCinema}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-start pl-4 group"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronLeft className="h-7 w-7" />
              </div>
            </div>

            {/* Right Tap Zone */}
            <div
              onClick={handleNextCinema}
              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer flex items-center justify-end pr-4 group"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-7 w-7" />
              </div>
            </div>

            {/* Featured Image Frame */}
            {activeSlide.imageUrl && (
              <div className="relative max-h-[70vh] max-w-4xl w-full flex items-center justify-center overflow-hidden rounded-3xl border border-white/15 shadow-2xl bg-black">
                <img
                  key={activeSlide.id}
                  src={activeSlide.imageUrl}
                  alt={activeSlide.title}
                  className="max-h-[70vh] w-auto max-w-full object-contain transition-transform duration-[5000ms] scale-105 ease-out animate-in zoom-in-95 duration-500"
                />
              </div>
            )}
          </div>

          {/* Bottom Caption & Song Selector Overlay */}
          <div className="relative z-20 p-6 bg-gradient-to-t from-black via-black/90 to-transparent text-center max-w-3xl mx-auto w-full">
            <h2 className="font-display text-2xl font-bold text-white tracking-tight sm:text-3xl animate-in slide-in-from-bottom-4 duration-500">
              {activeSlide.title}
            </h2>
            {activeSlide.description && (
              <p className="mt-2 text-xs sm:text-sm text-stone-300 leading-relaxed max-w-xl mx-auto line-clamp-3">
                {activeSlide.description}
              </p>
            )}




          </div>
        </div>
      )}
    </div>
  );
}
