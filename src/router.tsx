import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 5, // 5 seconds stale time for rapid updates
        gcTime: 1000 * 60 * 60 * 24, // Keep in memory for 24 hours
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: 12000, // 12 seconds background polling fallback for 100% realtime sync
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 1000 * 60 * 5,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
