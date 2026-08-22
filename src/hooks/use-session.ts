import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function stringToUuid(str?: string | null): string {
  if (!str) return "";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let h1 = 0x811c9dc5,
    h2 = 0x01000193,
    h3 = 0x38b04b5c,
    h4 = 0x65704a29;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 0x01000193);
    h3 = Math.imul(h3 ^ code, 0x27d4eb2d);
    h4 = Math.imul(h4 ^ code, 0x1000193);
  }

  const hex = [
    (h1 >>> 0).toString(16).padStart(8, "0"),
    (h2 >>> 0).toString(16).padStart(8, "0"),
    (h3 >>> 0).toString(16).padStart(8, "0"),
    (h4 >>> 0).toString(16).padStart(8, "0"),
  ].join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfile = async (s: Session | null) => {
      if (s?.user) {
        const u = s.user;
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

          // Auto-migrate any user_roles assigned by email or deterministic UUID to the user's actual auth.id
          if (u.email) {
            const validUuid = stringToUuid(u.id);
            const emailUuid = stringToUuid(u.email);
            const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const candidateIds = Array.from(new Set([emailUuid, validUuid].filter((id) => Boolean(id) && isUuid(id))));

            const { data: assignedRoles } = await supabase
              .from("user_roles")
              .select("role")
              .in("user_id", candidateIds);

            if (assignedRoles && assignedRoles.length > 0) {
              const rolesToSync = Array.from(new Set(assignedRoles.map((r: { role: string }) => r.role)));
              for (const r of rolesToSync) {
                await supabase
                  .from("user_roles")
                  .upsert({ user_id: u.id, role: r as any }, { onConflict: "user_id,role" });
              }
            }
          }
        } catch {
          // Ignore RLS errors if profile already managed by trigger
        }
      }
    };

    // Supabase auth state listener
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      setTimeout(() => syncProfile(next), 0);
      if (next && typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      setTimeout(() => syncProfile(data.session), 0);
      if (data.session && typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;

  return { session, user, loading };
}

const ADMIN_EMAILS = ["pavandimpu30@gmail.com", "shreyaspaineedi@gmail.com"];

export interface UserRolePermissions {
  role: "admin" | "organizer" | "mini_admin" | "volunteer" | "user";
  isStaff: boolean;
  isFullAdmin: boolean;
  isMiniAdmin: boolean;
  canManageContent: boolean;
  canManageUsersAndFinancials: boolean;
}

export function useIsStaff(userId?: string) {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setIsStaff(false);
      return;
    }

    const checkStaffStatus = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentAuthUser = authData?.user;

        // If target userId is the logged-in user and matches hardcoded admin email
        if (
          (!userId || currentAuthUser?.id === userId) &&
          currentAuthUser?.email &&
          ADMIN_EMAILS.includes(currentAuthUser.email.toLowerCase())
        ) {
          if (active) setIsStaff(true);
          return;
        }

        const validUuid = stringToUuid(userId);
        const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const searchIds = Array.from(new Set([userId, validUuid].filter((id) => Boolean(id) && isUuid(id))));

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .in("user_id", searchIds);

        if (!active) return;
        const roles = (roleData ?? []).map((r: { role: string }) => r.role);
        setIsStaff(
          roles.includes("admin") || roles.includes("organizer") || roles.includes("mini_admin"),
        );
      } catch {
        if (active) setIsStaff(false);
      }
    };

    checkStaffStatus();

    // Subscribe to real-time role changes for this user with unique channel ID
    const channelId = `user-roles-staff-${userId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          checkStaffStatus();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return isStaff;
}

export function useUserRolePermissions(userId?: string): UserRolePermissions {
  const [perms, setPerms] = useState<UserRolePermissions>({
    role: "user",
    isStaff: false,
    isFullAdmin: false,
    isMiniAdmin: false,
    canManageContent: false,
    canManageUsersAndFinancials: false,
  });

  useEffect(() => {
    let active = true;
    if (!userId) {
      setPerms({
        role: "user",
        isStaff: false,
        isFullAdmin: false,
        isMiniAdmin: false,
        canManageContent: false,
        canManageUsersAndFinancials: false,
      });
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentAuthUser = authData?.user;

        if (
          (!userId || currentAuthUser?.id === userId) &&
          currentAuthUser?.email &&
          ADMIN_EMAILS.includes(currentAuthUser.email.toLowerCase())
        ) {
          if (active) {
            setPerms({
              role: "admin",
              isStaff: true,
              isFullAdmin: true,
              isMiniAdmin: false,
              canManageContent: true,
              canManageUsersAndFinancials: true,
            });
          }
          return;
        }

        const validUuid = stringToUuid(userId);
        const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const searchIds = Array.from(new Set([userId, validUuid].filter((id) => Boolean(id) && isUuid(id))));

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .in("user_id", searchIds);

        if (!active) return;

        const roles = (roleData ?? []).map((r: { role: string }) => r.role);
        const isFullAdmin = roles.includes("admin") || roles.includes("organizer");
        const isMiniAdmin = !isFullAdmin && roles.includes("mini_admin");
        const isStaff = isFullAdmin || isMiniAdmin;
        const assignedRole = isFullAdmin
          ? "admin"
          : isMiniAdmin
            ? "mini_admin"
            : (roles[0] as any) || "user";

        setPerms({
          role: assignedRole,
          isStaff,
          isFullAdmin,
          isMiniAdmin,
          canManageContent: isStaff,
          canManageUsersAndFinancials: isFullAdmin,
        });
      } catch {
        if (active) {
          setPerms({
            role: "user",
            isStaff: false,
            isFullAdmin: false,
            isMiniAdmin: false,
            canManageContent: false,
            canManageUsersAndFinancials: false,
          });
        }
      }
    };

    fetchPermissions();

    // Subscribe to real-time user_roles changes with unique channel ID
    const permsChannelId = `user-roles-perms-${userId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(permsChannelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          fetchPermissions();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return perms;
}

