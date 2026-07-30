import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrPass } from "@/components/site/QrPass";
import { useSession } from "@/hooks/use-session";
import { myRegistrationsQuery } from "@/lib/festival";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/my-passes")({
  head: () => ({
    meta: [
      { title: "My QR Passes — Ganapathi Festival 2026" },
      { name: "description", content: "View and download your QR event passes for Ganapathi Festival 2026." },
      { property: "og:title", content: "My QR Passes — Ganapathi Festival 2026" },
      { property: "og:description", content: "Your festival registrations and downloadable QR passes." },
    ],
  }),
  component: MyPasses,
});

function MyPasses() {
  const { user } = useSession();
  const { data: regs = [], isLoading } = useQuery(myRegistrationsQuery(user?.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Your festival</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">My QR passes</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          className="shrink-0 rounded-full"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out");
            window.location.href = "/";
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" /> Sign out
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-10 h-64 animate-pulse rounded-3xl bg-muted" />
      ) : regs.length === 0 ? (
        <div className="card-premium mt-10 p-10 text-center">
          <p className="text-muted-foreground">You haven't registered for any events yet.</p>
          <Button asChild className="mt-5 rounded-full gradient-saffron text-primary-foreground">
            <Link to="/events">Browse events</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6">
          {regs.map((r) => (
            <QrPass key={r.id} registration={r} />
          ))}
        </div>
      )}
    </div>
  );
}
