import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null as User | null, loading };
}

const ADMIN_EMAILS = ["pavandimpu30@gmail.com"];

export function useIsStaff(userId?: string) {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setIsStaff(false);
      return;
    }

    // Check user email directly from auth session
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
        if (active) setIsStaff(true);
        return;
      }

      // Check database user_roles table
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .then(({ data: roleData }) => {
          if (!active) return;
          const roles = (roleData ?? []).map((r: { role: string }) => r.role);
          setIsStaff(roles.includes("admin") || roles.includes("organizer"));
        });
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return isStaff;
}