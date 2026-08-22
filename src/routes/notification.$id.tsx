import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/notification/$id")({
  component: NotificationDeepLinkRoute,
});

function NotificationDeepLinkRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate({
      to: "/notifications",
      search: id ? { id } : undefined,
      replace: true,
    });
  }, [id, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        <p className="mt-4 text-sm font-medium text-stone-300">Loading festival notification...</p>
      </div>
    </div>
  );
}
