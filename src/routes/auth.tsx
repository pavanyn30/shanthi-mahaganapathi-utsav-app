import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { OptimizedImage } from "@/components/ui/optimized-image";
import mark from "@/assets/ganapathi-mark.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Ganapathi Festival 2026" },
      { name: "description", content: "Sign in or create an account to register for events and get your QR pass." },
      { property: "og:title", content: "Sign in — Ganapathi Festival 2026" },
      { property: "og:description", content: "Create your festival account to register for competitions." },
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
  const { user } = useSession();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/my-passes", replace: true });
  }, [user, navigate]);

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
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Ganapathi Bappa Morya!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      navigate({ to: "/my-passes" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <OptimizedImage
        src={mark}
        priority={true}
        alt="Ganapathi Festival emblem"
        width={64}
        height={64}
        aspectRatio="1/1"
        containerClassName="h-16 w-16 rounded-3xl gradient-saffron p-2"
        className="h-full w-full object-contain"
      />
      <h1 className="mt-5 font-display text-2xl font-extrabold">Festival account</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Register for competitions, collect QR passes and track your participation.
      </p>

      <div className="card-premium mt-8 w-full p-6">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 rounded-full">
            <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
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
                <Label htmlFor="si-pass">Password</Label>
                <Input id="si-pass" name="password" type="password" required className="rounded-2xl" />
              </div>
              <Button disabled={loading} className="rounded-full gradient-saffron text-primary-foreground">
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
                <Input id="su-name" name="fullName" required maxLength={100} className="rounded-2xl" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" name="email" type="email" required className="rounded-2xl" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="su-pass">Password</Label>
                <Input id="su-pass" name="password" type="password" required minLength={6} className="rounded-2xl" />
              </div>
              <Button disabled={loading} className="rounded-full gradient-saffron text-primary-foreground">
                {loading ? "Please wait…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <Link to="/events" className="mt-6 text-sm text-muted-foreground hover:text-primary">
        Browse events without signing in →
      </Link>
    </div>
  );
}
