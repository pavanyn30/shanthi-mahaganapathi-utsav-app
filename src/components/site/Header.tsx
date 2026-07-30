import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, Moon, Sun, X, LogIn, Ticket, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSession, useIsStaff } from "@/hooks/use-session";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { settingsQuery } from "@/lib/festival";
import mark from "@/assets/ganapathi-mark.png";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/memories", label: "Memories" },
  { to: "/live", label: "Live" },
  { to: "/gallery", label: "Gallery" },
  { to: "/donate", label: "Donate" },
  { to: "/sponsors", label: "Sponsors" },
  { to: "/volunteer", label: "Volunteer" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user } = useSession();
  const isStaff = useIsStaff(user?.id);
  const { data: settings } = useQuery(settingsQuery);

  const cityName = settings?.address ? settings.address.split(",").pop()?.trim() || "Bengaluru" : "Bengaluru";
  const yearText = settings?.start_date ? new Date(settings.start_date).getFullYear() : "2026";

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/60">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <OptimizedImage
            src={mark}
            priority={true}
            alt="Ganapathi Festival emblem"
            width={40}
            height={40}
            aspectRatio="1/1"
            containerClassName="h-10 w-10 shrink-0 rounded-2xl gradient-saffron p-1"
            className="h-full w-full object-contain"
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-bold leading-tight sm:text-lg">
              {settings?.festival_name || "Ganapathi Festival"}
            </span>
            <span className="block text-xs font-medium text-muted-foreground">
              {yearText} · {cityName}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button variant="ghost" size="icon" className="rounded-full" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isStaff && (
            <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Admin panel">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          )}

          {user ? (
            <div className="hidden items-center gap-1.5 sm:inline-flex">
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/volunteer-dashboard">
                  <UserCheck className="mr-1.5 h-4 w-4 text-primary" /> Seva Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/my-passes">
                  <Ticket className="mr-1.5 h-4 w-4" /> My Passes
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/60 bg-card/95 px-4 pb-4 pt-2 lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-secondary px-3 py-2.5 text-sm font-medium text-secondary-foreground"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={user ? "/my-passes" : "/auth"}
              onClick={() => setOpen(false)}
              className="col-span-2 rounded-2xl gradient-saffron px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              {user ? "My Passes" : "Sign in"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
