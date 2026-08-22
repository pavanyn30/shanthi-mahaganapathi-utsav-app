import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/event/$id")({
  component: EventDeepLinkRoute,
});

function EventDeepLinkRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate({
        to: "/events/$slug",
        params: { slug: id },
        replace: true,
      });
    } else {
      navigate({ to: "/events", replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        <p className="mt-4 text-sm font-medium text-stone-300">Loading festival event details...</p>
      </div>
    </div>
  );
}
