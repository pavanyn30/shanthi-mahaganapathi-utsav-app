import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { processedOAuthKeys } from "@/hooks/use-deep-links";
import { OptimizedImage } from "@/components/ui/optimized-image";
import mark from "@/assets/ganapathi-mark.png";
import { Eye, EyeOff, KeyRound, Mail, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { notifyWelcomeAccountCreated } from "@/lib/services/onesignal-service";

async function processOAuthSessionFromUrl(): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const href = window.location.href;
  if (!href.includes("access_token=") && !href.includes("code=")) return null;

  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let code: string | null = null;

  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");

  if (hashIndex !== -1) {
    const hashStr = href.substring(hashIndex + 1);
    const params = new URLSearchParams(hashStr);
    accessToken = params.get("access_token");
    refreshToken = params.get("refresh_token");
  }

  if (!accessToken && queryIndex !== -1) {
    const queryStr = href.substring(queryIndex + 1);
    const params = new URLSearchParams(queryStr);
    accessToken = params.get("access_token");
    refreshToken = params.get("refresh_token");
    code = params.get("code");
  }

  const dedupeKey = code ? `code:${code}` : accessToken ? `token:${accessToken}` : null;
  if (dedupeKey) {
    if (processedOAuthKeys.has(dedupeKey)) {
      console.log("🔗 OAuth callback already processed for key:", dedupeKey);
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
    processedOAuthKeys.add(dedupeKey);
  }

  let newSession: Session | null = null;

  if (accessToken && refreshToken) {
    console.log("🔑 Setting Supabase session from OAuth access_token...");
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (!error && data?.session) {
      newSession = data.session;
    } else if (error) {
      console.error("❌ Supabase setSession error:", error);
    }
  } else if (code) {
    console.log("🔑 Exchanging PKCE code for Supabase session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      newSession = data.session;
    } else if (error) {
      console.error("❌ Supabase exchangeCodeForSession error:", error);
    }
  }

  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("code");
    cleanUrl.searchParams.delete("state");
    cleanUrl.hash = "";
    window.history.replaceState(null, "", cleanUrl.toString());
  } catch {}

  return newSession;
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SHANTHI MAHA GANAPATHI 2026" },
      {
        name: "description",
        content: "Sign in or create an account to register for events and get your QR pass.",
      },
      { property: "og:title", content: "Sign in — SHANTHI MAHA GANAPATHI 2026" },
      {
        property: "og:description",
        content: "Create your festival account to register for competitions.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  fullName: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Password Reset States
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);



  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      if (error) throw error;
      toast.success("🔐 Password reset email sent! Check your inbox.");
      setResetDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const checkRecovery = () => {
      if (typeof window !== "undefined") {
        const href = window.location.href;
        if (
          href.includes("type=recovery") ||
          href.includes("PASSWORD_RECOVERY")
        ) {
          setIsRecoveryMode(true);
        }
      }
    };
    checkRecovery();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Handle OAuth Return as Single Source of Truth
  useEffect(() => {
    let active = true;

    const handleOAuthReturn = async () => {
      if (typeof window === "undefined") return;
      const href = window.location.href;
      if (!href.includes("access_token=") && !href.includes("code=")) return;

      setLoading(true);
      try {
        const newSession = await processOAuthSessionFromUrl();
        if (!active) return;

        if (newSession?.user) {
          queryClient.clear();
          const u = newSession.user;
          const fullName =
            u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0];

          try {
            await supabase.from("profiles").upsert(
              {
                id: u.id,
                email: u.email ?? null,
                full_name: fullName ?? null,
                phone: u.phone ?? u.user_metadata?.phone ?? null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" },
            );
          } catch {}

          toast.success("Welcome! Ganapathi Bappa Morya!");

          let pendingLink: string | null = null;
          try {
            pendingLink =
              sessionStorage.getItem("pending_deep_link") ||
              localStorage.getItem("pending_deep_link");
            sessionStorage.removeItem("pending_deep_link");
            localStorage.removeItem("pending_deep_link");
          } catch {}

          if (pendingLink && pendingLink !== "/auth") {
            navigate({ to: pendingLink, replace: true });
          } else {
            navigate({ to: "/my-passes", replace: true });
          }
        }
      } catch (err) {
        console.error("Error processing OAuth return:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    handleOAuthReturn();

    return () => {
      active = false;
    };
  }, [navigate, queryClient]);

  useEffect(() => {
    const isRecovery =
      typeof window !== "undefined" &&
      (window.location.href.includes("type=recovery") ||
       window.location.href.includes("PASSWORD_RECOVERY"));

    const hasOAuthParams =
      typeof window !== "undefined" &&
      (window.location.href.includes("access_token=") ||
       window.location.href.includes("code="));

    if (!isRecovery && !isRecoveryMode && !hasOAuthParams && user) {
      let pendingLink: string | null = null;
      try {
        pendingLink =
          sessionStorage.getItem("pending_deep_link") ||
          localStorage.getItem("pending_deep_link");
        sessionStorage.removeItem("pending_deep_link");
        localStorage.removeItem("pending_deep_link");
      } catch {}

      if (pendingLink && pendingLink !== "/auth") {
        navigate({ to: pendingLink, replace: true });
      } else {
        navigate({ to: "/my-passes", replace: true });
      }
    }
  }, [user, isRecoveryMode, navigate]);

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setUpdateLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("🎉 Password updated successfully! Welcome back!");
      setIsRecoveryMode(false);
      navigate({ to: "/my-passes" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const googleClientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        "148252084027-5oacennrurg3sm36au42hv0iqpad7f3c.apps.googleusercontent.com";

      try {
        GoogleAuth.initialize({
          clientId: googleClientId,
          scopes: ["profile", "email"],
          grantOfflineAccess: false,
        });
      } catch (err) {
        console.warn("GoogleAuth initialize warning:", err);
      }

      const listener = Browser.addListener("browserFinished", async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          toast.success("Welcome! Ganapathi Bappa Morya!");
          navigate({ to: "/my-passes", replace: true });
        }
      });
      return () => {
        listener?.then?.((h) => h?.remove?.()).catch(() => {});
      };
    }
  }, [navigate]);

  const handle = async (mode: "signin" | "signup", form: HTMLFormElement) => {
    const fd = new FormData(form);
    const parsed = schema.safeParse({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      fullName: String(fd.get("fullName") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const { email, password, fullName } = parsed.data;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully! Welcome to Ganapathi Festival!");
        navigate({ to: "/my-passes" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/my-passes" });
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Authentication failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isCancellationError = (err: any) => {
    if (!err) return false;
    const msg = String(typeof err === "string" ? err : err?.message || err?.error || err?.code || "");
    return (
      msg.includes("closed") ||
      msg.includes("popup_closed_by_user") ||
      msg.includes("user_cancelled") ||
      msg.toLowerCase().includes("user canceled") ||
      msg.toLowerCase().includes("user cancelled")
    );
  };

  const signingInRef = useRef(false);

  const handleGoogleSignIn = async () => {
    if (loading || signingInRef.current) return;
    signingInRef.current = true;
    setLoading(true);

    try {
      // Detach local session & clear storage before opening Google Account Selector
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      const redirectUrl = Capacitor.isNativePlatform()
        ? "com.shanthimahaganapathi.app://auth"
        : typeof window !== "undefined"
          ? `${window.location.origin}/auth`
          : "https://shanthimahaganapathi-2026.web.app/auth";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url && Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url });
      }
    } catch (e: any) {
      console.error("Google Sign-In error:", e);
      if (!isCancellationError(e)) {
        toast.error(
          typeof e === "string"
            ? e
            : e?.message || "Google Sign-In failed. Please try again or sign in with email."
        );
      }
    } finally {
      signingInRef.current = false;
      setLoading(false);
    }
  };

    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <OptimizedImage
          src={mark}
          priority={true}
          alt="SHANTHI MAHA GANAPTHI emblem"
          width={72}
          height={72}
          aspectRatio="1/1"
          containerClassName="h-18 w-18 rounded-full overflow-hidden border-2 border-amber-500/50 shadow-lg"
          className="h-full w-full object-cover"
        />
        <h1 className="mt-5 font-display text-2xl font-extrabold">Festival account</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Register for competitions, collect QR passes and track your participation.
        </p>

        {/* Recovery / Set New Password Form */}
        {isRecoveryMode ? (
          <div className="card-premium mt-8 w-full p-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-amber-500/20 text-amber-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-white">Set New Password</h2>
            <p className="mt-1 text-xs text-stone-400">
              Enter your new password below to secure your festival account.
            </p>

            <form onSubmit={handleSetNewPassword} className="mt-5 grid gap-4 text-left">
              <div className="grid gap-2">
                <Label htmlFor="rec-pass">New Password</Label>
                <div className="relative">
                  <Input
                    id="rec-pass"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="rounded-2xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateLoading}
                className="rounded-full gradient-saffron text-primary-foreground font-bold py-3 mt-2"
              >
                {updateLoading ? "Updating password…" : "Save New Password"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="card-premium mt-8 w-full p-6">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="flex w-full rounded-full border-border/60 bg-background/80 hover:bg-accent hover:text-accent-foreground py-5 items-center justify-center gap-3 font-medium transition-all shadow-sm"
            >
              <GoogleIcon className="h-5 w-5" />
              <span>Continue with Google</span>
            </Button>

            <div className="flex relative my-6 items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Or with email
              </span>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 rounded-full">
                <TabsTrigger value="signin" className="rounded-full">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form
                  className="grid gap-4 pt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handle("signin", e.currentTarget);
                  }}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" name="email" type="email" required className="rounded-2xl" />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-pass">Password</Label>
                      <button
                        type="button"
                        onClick={() => setResetDialogOpen(true)}
                        className="text-xs font-semibold text-amber-500 hover:text-amber-400 hover:underline transition"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="si-pass"
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        required
                        className="rounded-2xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showSignInPassword ? "Hide password" : "Show password"}
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    disabled={loading}
                    className="rounded-full gradient-saffron text-primary-foreground"
                  >
                    {loading ? "Please wait…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form
                  className="grid gap-4 pt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handle("signup", e.currentTarget);
                  }}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input
                      id="su-name"
                      name="fullName"
                      required
                      maxLength={100}
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" name="email" type="email" required className="rounded-2xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="su-pass">Password</Label>
                    <div className="relative">
                      <Input
                        id="su-pass"
                        name="password"
                        type={showSignUpPassword ? "text" : "password"}
                        required
                        minLength={6}
                        className="rounded-2xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    disabled={loading}
                    className="rounded-full gradient-saffron text-primary-foreground"
                  >
                    {loading ? "Please wait…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Forgot Password Email Prompt Dialog Modal */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent className="max-w-sm rounded-3xl bg-stone-950 p-6 text-stone-100 border border-amber-500/40 shadow-2xl">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-amber-500/20 text-amber-400">
                <Mail className="h-6 w-6" />
              </div>
              <DialogTitle className="font-serif text-lg font-bold text-white">
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400 mt-1">
                Enter your registered email address and we'll send you a password reset link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotPassword} className="mt-4 grid gap-4">
              <div className="grid gap-2 text-left">
                <Label htmlFor="reset-email" className="text-xs text-stone-300">
                  Email Address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="rounded-2xl bg-stone-900 border-stone-800 text-white"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetDialogOpen(false)}
                  className="flex-1 rounded-full border-stone-800 text-stone-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 rounded-full gradient-saffron text-primary-foreground font-bold"
                >
                  {resetLoading ? "Sending…" : "Send Link"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Link to="/events" className="mt-6 text-sm text-muted-foreground hover:text-primary">
          Browse events without signing in →
        </Link>
      </div>
    );
  }
