import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Calendar, ChevronLeft, ChevronRight, X, Image as ImageIcon, Award, Heart } from "lucide-react";
import { memoriesQuery, type FestivalMemory } from "@/lib/festival";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/memories")({
  head: () => ({
    meta: [
      { title: "Festival Memories & Heritage Gallery — Ganapathi Festival 2026" },
      { name: "description", content: "Explore the year-wise journey, golden memories, photo archives and celebrations across the years." },
      { property: "og:title", content: "Festival Memories & Heritage Gallery — Ganapathi Festival 2026" },
    ],
  }),
  component: MemoriesPage,
});

function MemoriesPage() {
  const { data: memories = [] } = useQuery(memoriesQuery);
  const [selectedImage, setSelectedImage] = useState<{
    images: string[];
    currentIndex: number;
    title: string;
    year: number;
  } | null>(null);

  const openLightbox = (images: string[], index: number, title: string, year: number) => {
    setSelectedImage({ images, currentIndex: index, title, year });
  };

  const handlePrevImage = () => {
    if (!selectedImage) return;
    const newIdx = (selectedImage.currentIndex - 1 + selectedImage.images.length) % selectedImage.images.length;
    setSelectedImage({ ...selectedImage, currentIndex: newIdx });
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const newIdx = (selectedImage.currentIndex + 1) % selectedImage.images.length;
    setSelectedImage({ ...selectedImage, currentIndex: newIdx });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-black py-20 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-transparent pointer-events-none" />
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <Badge className="rounded-full gradient-saffron px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-primary-foreground shadow-warm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 inline animate-pulse" /> Timeless Traditions
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-6xl tracking-tight">
            Festival Memories & Heritage
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            Journey through our golden archives of devotion, cultural competitions, Maha Aarti, and community celebrations over the years.
          </p>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        {memories.length === 0 ? (
          <div className="card-premium p-12 text-center text-muted-foreground">
            <Calendar className="mx-auto h-10 w-10 text-primary opacity-60" />
            <p className="mt-3 text-base font-semibold">No festival memories posted yet.</p>
            <p className="mt-1 text-xs">Organizers can add yearly memory cards from the admin panel.</p>
          </div>
        ) : (
          <div className="relative space-y-16 before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary before:via-amber-500/50 before:to-transparent sm:before:left-1/2 sm:before:-ml-0.5">
            {memories.map((item, idx) => {
              const isEven = idx % 2 === 0;
              const allPhotos = [item.cover_image_url, ...(item.photos || [])].filter(Boolean);

              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col gap-6 sm:flex-row ${
                    isEven ? "sm:flex-row-reverse" : ""
                  }`}
                >
                  {/* Timeline Year Node Icon */}
                  <div className="absolute left-4 -ml-4 sm:left-1/2 sm:-ml-5 top-0 flex h-10 w-10 items-center justify-center rounded-full gradient-saffron text-primary-foreground shadow-warm ring-4 ring-background z-10 font-bold text-xs">
                    {item.year}
                  </div>

                  {/* Card Content Box */}
                  <div className="ml-10 sm:ml-0 sm:w-1/2 sm:px-6">
                    <div className="card-premium group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                      {/* Cover Banner Image */}
                      {item.cover_image_url && (
                        <div
                          className="relative aspect-video w-full overflow-hidden cursor-pointer"
                          onClick={() => openLightbox(allPhotos, 0, item.title, item.year)}
                        >
                          <OptimizedImage
                            src={item.cover_image_url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                            <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold border border-white/20">
                              {item.year} Memory
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/90">
                              <ImageIcon className="h-3.5 w-3.5" /> {allPhotos.length} Photos
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Details Content */}
                      <div className="p-6">
                        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                          {item.title}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                          {item.description}
                        </p>

                        {/* Gallery Thumbnails Grid */}
                        {item.photos && item.photos.length > 0 && (
                          <div className="mt-5 pt-4 border-t border-border/60">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                              Yearly Photo Gallery
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              {item.photos.slice(0, 4).map((photoUrl, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="group/thumb relative aspect-square overflow-hidden rounded-xl cursor-pointer border border-border"
                                  onClick={() => openLightbox(allPhotos, pIdx + 1, item.title, item.year)}
                                >
                                  <OptimizedImage
                                    src={photoUrl}
                                    alt={`${item.title} photo ${pIdx + 1}`}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover/thumb:opacity-100 flex items-center justify-center text-white">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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

      {/* Lightbox Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl border-none bg-black/95 text-white p-2 sm:p-4 backdrop-blur-xl">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-primary">{selectedImage.year}</span> · {selectedImage.title}
              </DialogTitle>
              <span className="text-xs text-white/70">
                Photo {selectedImage.currentIndex + 1} of {selectedImage.images.length}
              </span>
            </DialogHeader>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img
                src={selectedImage.images[selectedImage.currentIndex]}
                alt={selectedImage.title}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {/* Prev/Next Overlay Buttons */}
              {selectedImage.images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-transform active:scale-95"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-transform active:scale-95"
                    title="Next Photo"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
