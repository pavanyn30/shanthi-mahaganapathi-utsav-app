import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== "undefined") {
        const targetPath = window.location.pathname + window.location.search + window.location.hash;
        if (targetPath && targetPath !== "/auth" && targetPath !== "/") {
          try {
            const isExplicitSignOut =
              sessionStorage.getItem("pending_deep_link") === null &&
              localStorage.getItem("pending_deep_link") === null;
            if (!isExplicitSignOut) {
              sessionStorage.setItem("pending_deep_link", targetPath);
              localStorage.setItem("pending_deep_link", targetPath);
            }
          } catch {}
        }
      }
      navigate({ to: "/auth", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Outlet />;
}
