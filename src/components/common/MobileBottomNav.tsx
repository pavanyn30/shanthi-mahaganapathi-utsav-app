import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Clock,
  CalendarDays,
  Bell,
  Ticket,
  LogIn,
  LayoutGrid,
  Sparkles,
  Radio,
  Heart,
  Images,
  ShieldAlert,
  PhoneCall,
  Building2,
  UserCheck,
  X,
  ChevronRight,
  User,
  LogOut,
  Code2,
} from "lucide-react";
import { useSession, stringToUuid } from "@/hooks/use-session";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { supabase } from "@/integrations/supabase/client";
import { DeveloperCreditModal } from "@/components/common/DeveloperCreditModal";

export function MobileBottomNav() {
  const isNavVisible = useScrollDirection();
  const { user } = useSession();
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;
  const currentHash = routerState.location.hash;

  const [isQuickHubOpen, setIsQuickHubOpen] = useState(false);
  const [isQuickHubClosing, setIsQuickHubClosing] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMoreMenuClosing, setIsMoreMenuClosing] = useState(false);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  const closeQuickHub = () => {
    if (isQuickHubClosing) return;
    setIsQuickHubClosing(true);
    setTimeout(() => {
      setIsQuickHubOpen(false);
      setIsQuickHubClosing(false);
    }, 190);
  };

  const closeMoreMenu = () => {
    if (isMoreMenuClosing) return;
    setIsMoreMenuClosing(true);
    setTimeout(() => {
      setIsMoreMenuOpen(false);
      setIsMoreMenuClosing(false);
    }, 190);
  };

  const toggleQuickHub = () => {
    if (isQuickHubOpen) {
      closeQuickHub();
    } else {
      setIsQuickHubClosing(false);
      setIsQuickHubOpen(true);
    }
  };

  const toggleMoreMenu = () => {
    if (isMoreMenuOpen) {
      closeMoreMenu();
    } else {
      setIsMoreMenuClosing(false);
      setIsMoreMenuOpen(true);
    }
  };

  // Hide bottom navbar on sign-in page on mobile
  if (currentPath === "/auth") {
    return null;
  }

  // Unread Notifications Count
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
        // Ignore JSON parse errors
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeMoreMenu();
    navigate({ to: "/" });
  };

  // Quick Hub Grid Items
  const quickActions = [
    {
      title: "Live Darshan",
      subtitle: "24/7 Live Stream",
      to: "/live",
      icon: Radio,
      badge: "LIVE",
      color: "bg-red-500/10 text-red-500 border-red-500/20",
    },
    {
      title: "My Passes",
      subtitle: "QR Entry Pass",
      to: user ? "/my-passes" : "/auth",
      icon: Ticket,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    {
      title: "Seva & Donate",
      subtitle: "Support Utsav",
      to: "/donate",
      icon: Heart,
      color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    {
      title: "Photo Gallery",
      subtitle: "Photo & Video Feed",
      to: "/gallery",
      icon: Images,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
      title: "Utsav Memories",
      subtitle: "Year-wise Journey",
      to: "/memories",
      icon: Sparkles,
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
    {
      title: "Sponsors",
      subtitle: "Our Supporters",
      to: "/sponsors",
      icon: Building2,
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    },
    {
      title: "Helpline",
      subtitle: "Organizers & Support",
      to: "/contact",
      icon: PhoneCall,
      color: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    },
  ];

  const isHomeActive = currentPath === "/" && !currentHash;
  const isEventsActive = currentPath.startsWith("/events");
  const isGalleryActive = currentPath.startsWith("/gallery");
  const isMoreActive =
    currentPath.startsWith("/my-passes") || currentPath.startsWith("/profile") || isMoreMenuOpen;

  return (
    <>
      {/* Bottom Full-Width Container */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden px-0 pb-0 pt-0 transition-all duration-300 ease-in-out ${
          isNavVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-28 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-full relative pointer-events-auto h-[64px] pb-[env(safe-area-inset-bottom,0px)]">
          {/* SVG Background Container with Curved Center Notch */}
          <svg
            viewBox="0 0 400 64"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full text-card pointer-events-none fill-current filter drop-shadow-[0_-4px_12px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_-8px_24px_rgba(0,0,0,0.6)] transition-colors duration-300"
          >
            {/* Smooth Center Scoop Cutout Path spanning full bottom width */}
            <path d="M 0 0 L 152 0 C 168 0 172 32 200 32 C 228 32 232 0 248 0 L 400 0 L 400 64 L 0 64 Z" />
            {/* Top Border Line for Sharp Definition */}
            <path
              d="M 0 0 L 152 0 C 168 0 172 32 200 32 C 228 32 232 0 248 0 L 400 0"
              fill="none"
              stroke="currentColor"
              className="text-border/40 dark:text-stone-700/50"
              strokeWidth="1.5"
            />
          </svg>

          {/* Elevated Center Floating Action Button (FAB) */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <button
              onClick={toggleQuickHub}
              aria-label="Toggle Quick Hub"
              className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-sky-900 via-blue-900 to-indigo-950 dark:from-amber-600 dark:via-orange-600 dark:to-amber-500 border-4 border-card text-white shadow-[0_8px_20px_rgba(30,58,138,0.45)] dark:shadow-[0_8px_20px_rgba(234,179,8,0.4)] flex items-center justify-center transition-all duration-300 transform-gpu active:scale-90 hover:scale-105 group ${
                isQuickHubOpen && !isQuickHubClosing ? "rotate-45 scale-105 ring-4 ring-amber-500/40" : ""
              }`}
            >
              {/* Radial Glow */}
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <LayoutGrid
                className={`w-6 h-6 text-white transition-transform duration-300 transform-gpu ${
                  isQuickHubOpen && !isQuickHubClosing ? "rotate-45" : "group-hover:rotate-45"
                }`}
              />
            </button>
          </div>

          {/* Nav Items 5-Column Grid */}
          <div className="grid grid-cols-5 items-end h-full px-1 relative z-10 pb-1.5 text-center">
            {/* 1. Home */}
            <Link
              to="/"
              className={`flex flex-col items-center justify-end h-full pb-1 relative transition-colors ${
                isHomeActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isHomeActive && (
                <span className="absolute top-0 h-1 w-6 rounded-b-full bg-primary animate-in fade-in zoom-in-75 duration-200" />
              )}
              <Home className={`h-5 w-5 transition-transform ${isHomeActive ? "scale-110 text-primary" : ""}`} />
              <span className="mt-1 text-[10px] font-medium leading-none">Home</span>
            </Link>

            {/* 2. Events */}
            <Link
              to="/events"
              className={`flex flex-col items-center justify-end h-full pb-1 relative transition-colors ${
                isEventsActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEventsActive && (
                <span className="absolute top-0 h-1 w-6 rounded-b-full bg-primary animate-in fade-in zoom-in-75 duration-200" />
              )}
              <CalendarDays className={`h-5 w-5 transition-transform ${isEventsActive ? "scale-110 text-primary" : ""}`} />
              <span className="mt-1 text-[10px] font-medium leading-none">Events</span>
            </Link>

            {/* 3. Center Label (Explore / Quick Hub) */}
            <button
              onClick={toggleQuickHub}
              className="flex flex-col items-center justify-end h-full pb-1 relative text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span
                className={`mt-1 text-[10px] font-semibold leading-none transition-colors ${
                  isQuickHubOpen && !isQuickHubClosing ? "text-primary font-bold" : "text-muted-foreground group-hover:text-primary"
                }`}
              >
                Explore
              </span>
            </button>

            {/* 4. Gallery */}
            <Link
              to="/gallery"
              className={`flex flex-col items-center justify-end h-full pb-1 relative transition-colors ${
                isGalleryActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isGalleryActive && (
                <span className="absolute top-0 h-1 w-6 rounded-b-full bg-primary animate-in fade-in zoom-in-75 duration-200" />
              )}
              <Images className={`h-5 w-5 transition-transform ${isGalleryActive ? "scale-110 text-primary" : ""}`} />
              <span className="mt-1 text-[10px] font-medium leading-none">Gallery</span>
            </Link>

            {/* 5. More Menu */}
            <button
              onClick={toggleMoreMenu}
              className={`flex flex-col items-center justify-end h-full pb-1 relative transition-colors ${
                isMoreActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isMoreActive && (
                <span className="absolute top-0 h-1 w-6 rounded-b-full bg-primary animate-in fade-in zoom-in-75 duration-200" />
              )}
              <Sparkles className={`h-5 w-5 transition-transform ${isMoreActive ? "scale-110 text-primary" : ""}`} />
              <span className="mt-1 text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK HUB BOTTOM SHEET MODAL */}
      {isQuickHubOpen && (
        <div
          className={`fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out ${
            isQuickHubClosing ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Backdrop Click */}
          <div className="flex-1" onClick={closeQuickHub} />

          {/* Sheet Body with GPU Spring Animation */}
          <div
            className={`bg-card border-t border-border rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto transform-gpu ${
              isQuickHubClosing ? "animate-sheet-down" : "animate-sheet-up"
            }`}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Festival Quick Hub</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">
                    2026
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">Instant access to features and darshan</p>
              </div>
              <button
                onClick={closeQuickHub}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {quickActions.map((item, idx) => {
                const Icon = item.icon;
                const staggerClass = `stagger-${(idx % 7) + 1}`;
                return (
                  <Link
                    key={item.title}
                    to={item.to}
                    onClick={closeQuickHub}
                    className={`framer-pop-item ${staggerClass} flex items-start gap-3 p-3 rounded-2xl border border-border/80 bg-muted/30 hover:bg-muted/60 hover:border-amber-500/40 hover:shadow-md transition-all duration-200 active:scale-[0.95]`}
                  >
                    <div className={`p-2.5 rounded-xl border ${item.color} shrink-0 transition-transform group-hover:scale-110`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-500 text-white animate-pulse">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">{item.subtitle}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Developer Credit Footer Bar */}
            <div className="pt-3 border-t border-border/60 text-center">
              <button
                onClick={() => {
                  closeQuickHub();
                  setIsDevModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Built by PYN TECHNOLOGIES</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MORE MENU BOTTOM SHEET */}
      {isMoreMenuOpen && (
        <div
          className={`fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out ${
            isMoreMenuClosing ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex-1" onClick={closeMoreMenu} />

          <div
            className={`bg-card border-t border-border rounded-t-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto transform-gpu ${
              isMoreMenuClosing ? "animate-sheet-down" : "animate-sheet-up"
            }`}
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Menu & Account</h3>
              <button
                onClick={closeMoreMenu}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile / Auth Status */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-saffron flex items-center justify-center text-white font-bold">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground truncate max-w-[180px]">
                      {user.email || "Registered User"}
                    </div>
                    <div className="text-[10px] text-amber-600 font-medium">Logged In</div>
                  </div>
                </div>
                <Link
                  to={`/profile/${user.id}`}
                  onClick={closeMoreMenu}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Profile <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={closeMoreMenu}
                className="p-3.5 rounded-2xl bg-primary text-primary-foreground mb-4 flex items-center justify-between font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {/* Links List */}
            <div className="space-y-1 text-sm">
              <Link
                to="/notifications"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bell className="w-4 h-4 text-purple-500" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>
                  <span>Alerts & Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>

              <Link
                to={user ? "/my-passes" : "/auth"}
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="w-4 h-4 text-amber-500" />
                  <span>My QR Passes</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/donate"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Donate & Seva</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/gallery"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Images className="w-4 h-4 text-blue-500" />
                  <span>Photo & Video Gallery</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/memories"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Utsav Memories</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/sponsors"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span>Sponsors & Patrons</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/contact"
                onClick={closeMoreMenu}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted font-medium text-foreground transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-4 h-4 text-teal-500" />
                  <span>Contact & Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Developer Credit Footer Bar */}
            <div className="mt-4 pt-3 border-t border-border/60 text-center">
              <button
                onClick={() => {
                  closeMoreMenu();
                  setIsDevModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors active:scale-95"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Built by PYN TECHNOLOGIES</span>
              </button>
            </div>

            {user && (
              <button
                onClick={handleSignOut}
                className="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/30 text-destructive text-sm font-bold hover:bg-destructive/10 transition-colors active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Developer Credit Modal */}
      <DeveloperCreditModal open={isDevModalOpen} onOpenChange={setIsDevModalOpen} />
    </>
  );
}
