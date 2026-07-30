import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { galleryQuery } from "@/lib/festival";
import { OptimizedImage } from "@/components/ui/optimized-image";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Ganapathi Festival 2026" },
      { name: "description", content: "Photos and videos from the Ganapathi Festival celebrations." },
      { property: "og:title", content: "Gallery — Ganapathi Festival 2026" },
      { property: "og:description", content: "Moments from aarti, competitions and visarjan." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { data: items = [], isLoading } = useQuery(galleryQuery);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Festival gallery</h1>
      <p className="mt-2 text-sm text-muted-foreground">Moments from the mandap, competitions and processions.</p>
      {isLoading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl skeleton-shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Photos will be uploaded during the festival.</p>
      ) : (
        <div className="mt-10 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((g, idx) => (
            <figure key={g.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border">
              <OptimizedImage
                src={g.media_url}
                alt={g.title ?? "Festival photo"}
                priority={idx < 3}
                aspectRatio="4/3"
                containerClassName="w-full"
                className="w-full transition-transform duration-500 hover:scale-105"
              />
              {g.title && <figcaption className="bg-card p-3 text-sm font-medium">{g.title}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

