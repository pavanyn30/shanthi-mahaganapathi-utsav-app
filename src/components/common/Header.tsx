import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Moon,
  Sun,
  Bell,
  MapPin,
  ShieldCheck,
  Heart,
  Ticket,
  UserCheck,
  LogIn,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useSession, useIsStaff, stringToUuid } from "@/hooks/use-session";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { settingsQuery } from "@/lib/festival";
import { supabase } from "@/integrations/supabase/client";
import mark from "@/assets/ganapathi-mark.png";
import { DeveloperCreditModal } from "./DeveloperCreditModal";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/schedule", label: "Schedule" },
  { to: "/events", label: "Events" },
  { to: "/notifications", label: "Alerts" },
  { to: "/donate", label: "Donate" },
  { to: "/memories", label: "Memories" },
  { to: "/live", label: "Live" },
  { to: "/gallery", label: "Gallery" },
  { to: "/sponsors", label: "Sponsors" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const isNavVisible = useScrollDirection();
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { user } = useSession();
  const isStaff = useIsStaff(user?.id);
  const { data: settings } = useQuery(settingsQuery);
  const routerState = useRouterState();
  const isAuthPage = routerState.location.pathname === "/auth";
  const isDonateEnabled = settings?.manual_upi_enabled !== false;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", user?.id],
    queryFn: async () => {
      const { data: notifications } = await supabase.from("notifications").select("id");
      if (!notifications || notifications.length === 0) return 0;

      const readIds = new Set<string>();
      try {
        const saved = localStorage.getItem("onesignal_read_notifications");
        if (saved) JSON.parse(saved).forEach((id: string) => readIds.add(id));
      } catch {
        // Ignore JSON error
      }

      if (user) {
        const validUuid = stringToUuid(user.id) || user.id;
        const { data: dbReads } = await supabase
          .from("user_notification_reads")
          .select("notification_id")
          .eq("user_id", validUuid);
        if (dbReads) dbReads.forEach((r) => readIds.add(r.notification_id));
      }

      return notifications.filter((n) => !readIds.has(n.id)).length;
    },
    refetchInterval: 15000,
  });

  const { data: isVolunteer } = useQuery({
    queryKey: ["is-volunteer", user?.id, user?.email],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const validUuid = stringToUuid(user.id);
      let query = supabase.from("volunteers").select("id");
      if (validUuid && user.email) {
        query = query.or(`user_id.eq.${validUuid},email.ilike.${user.email}`);
      } else if (validUuid) {
        query = query.eq("user_id", validUuid);
      } else if (user.email) {
        query = query.eq("email", user.email);
      } else {
        return false;
      }

      const { data } = await query.limit(1);
      return Boolean(data && data.length > 0);
    },
  });

  const cityName = settings?.address
    ? settings.address.split(",").pop()?.trim() || "Karnataka 577501"
    : "Karnataka 577501";
  const yearText = settings?.start_date ? new Date(settings.start_date).getFullYear() : "2026";

  const visibleNav = NAV.filter((item) => item.to !== "/donate" || isDonateEnabled);

  return (
    <header
      className={`fixed top-2 left-0 right-0 w-full z-50 px-2 sm:px-4 pt-[env(safe-area-inset-top,0px)] transition-all duration-300 ease-in-out ${
        isNavVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-28 opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto"
      } ${isAuthPage ? "hidden md:block" : ""}`}
    >
      {/* Floating Capsule Header Container */}
      <div className="mx-auto max-w-7xl rounded-full bg-stone-950/90 dark:bg-stone-950/95 backdrop-blur-xl border border-amber-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-3 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition-all">
        {/* Left Side: Double Golden Ring Emblem & Title Block */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Glowing Emblem Circle */}
          <Link to="/" className="relative shrink-0">
            <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-full border-2 border-amber-400 p-0.5 shadow-[0_0_16px_rgba(245,158,11,0.5)] flex items-center justify-center bg-stone-950">
              <OptimizedImage
                src={mark}
                priority={true}
                alt="SHANTHI MAHAGANAPATHI emblem"
                width={48}
                height={48}
                aspectRatio="1/1"
                containerClassName="h-full w-full rounded-full overflow-hidden"
                className="h-full w-full object-cover"
              />
            </div>
          </Link>

          {/* Title & Subtitle Badge */}
          <div className="min-w-0 flex flex-col justify-center">
            {/* Title with Golden Highlight on MAHA and 2026 */}
            <Link to="/">
              <h1 className="truncate font-display text-sm sm:text-base md:text-lg font-extrabold text-slate-100 tracking-wide leading-tight hover:text-amber-200 transition-colors">
                SHANTHI <span className="text-amber-400 font-black">MAHA</span> GANAPATHI{" "}
                <span className="text-amber-400 font-black">{yearText}</span>
              </h1>
            </Link>

            {/* Location Pill Subtitle (Opens Google Maps) */}
            <a
              href="https://maps.app.goo.gl/PQDJDUN56WBSEjBR8?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-xs text-stone-300 font-medium max-w-fit hover:bg-white/15 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
            >
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                {yearText} • {cityName}
              </span>
            </a>
          </div>
        </div>

        {/* Desktop Links (Medium/Large Screens) */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-amber-500/20 text-amber-400 font-bold border-amber-500/30" }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors flex items-center gap-1 border border-transparent"
            >
              {item.label}
              {item.to === "/notifications" && unreadCount > 0 && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-stone-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isStaff && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-amber-500/30 bg-stone-900/80 text-amber-400 hover:bg-stone-800 shadow-md"
              aria-label="Admin panel"
            >
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          )}

          {/* Circular Notification Bell Button */}
          <Link
            to="/notifications"
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-amber-500/40 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-amber-400 shadow-md transition-transform active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-amber-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
            )}
          </Link>

          {/* Circular Theme Toggle Button */}
          <button
            onClick={toggle}
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-white/15 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-amber-400 shadow-md transition-transform active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-amber-400" />
            )}
          </button>

          {isDonateEnabled && (
            <Button
              asChild
              size="sm"
              className="hidden sm:inline-flex rounded-full gradient-saffron text-stone-950 font-bold text-xs px-4 shadow-md hover:scale-105 active:scale-95 transition-transform"
            >
              <Link to="/donate">
                <Heart className="mr-1.5 h-3.5 w-3.5 fill-stone-950" /> Donate
              </Link>
            </Button>
          )}

          {user ? (
            <div className="hidden items-center gap-1.5 md:inline-flex">
              {isVolunteer && (
                <Button asChild size="sm" variant="outline" className="rounded-full border-amber-500/30 text-amber-400 hover:bg-stone-800 text-xs">
                  <Link to="/volunteer-dashboard">
                    <UserCheck className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Seva
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="rounded-full border-amber-500/30 text-stone-200 hover:bg-stone-800 text-xs">
                <Link to="/my-passes">
                  <Ticket className="mr-1.5 h-3.5 w-3.5" /> Passes
                </Link>
              </Button>
            </div>
          ) : (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden rounded-full border-amber-500/30 text-stone-200 hover:bg-stone-800 text-xs md:inline-flex"
            >
              <Link to="/auth">
                <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>

      <DeveloperCreditModal open={developerModalOpen} onOpenChange={setDeveloperModalOpen} />
    </header>
  );
}
