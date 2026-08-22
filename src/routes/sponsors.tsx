import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { sponsorsQuery } from "@/lib/festival";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors — SHANTHI MAHA GANAPATHI 2026" },
      {
        name: "description",
        content: "Our generous sponsors and partners supporting SHANTHI MAHA GANAPATHI 2026.",
      },
      { property: "og:title", content: "Sponsors — SHANTHI MAHA GANAPATHI 2026" },
      {
        property: "og:description",
        content: "Thank you to the businesses making the festival possible.",
      },
    ],
  }),
  component: SponsorsPage,
});

function SponsorsPage() {
  const { data: sponsors = [] } = useQuery(sponsorsQuery);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Our sponsors</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Local businesses powering the celebration.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((s) => (
          <a
            key={s.id}
            href={s.website ?? "#"}
            target={s.website ? "_blank" : undefined}
            rel="noreferrer"
            className="card-premium p-6 transition-transform hover:-translate-y-1"
          >
            <Badge className="rounded-full capitalize">{s.tier}</Badge>
            <h2 className="mt-3 font-display text-lg font-bold">{s.name}</h2>
            {s.website && (
              <p className="mt-1.5 truncate text-sm text-muted-foreground">{s.website}</p>
            )}
          </a>
        ))}
        {sponsors.length === 0 && (
          <p className="text-sm text-muted-foreground">Sponsorships open soon.</p>
        )}
      </div>
    </div>
  );
}
