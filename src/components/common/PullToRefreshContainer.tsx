import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export type PullToRefreshContainerProps = {
  children: ReactNode;
};

const THRESHOLD = 75; // Distance in px to trigger refresh

export function PullToRefreshContainer({ children }: PullToRefreshContainerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const startYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 5 || isRefreshingRef.current) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current || window.scrollY > 5) return;
      const currentY = e.touches[0].clientY;
      const diffY = currentY - startYRef.current;
      pullDistanceRef.current = Math.max(0, diffY);
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      isPullingRef.current = false;

      if (pullDistanceRef.current >= THRESHOLD) {
        await executeRefresh();
      }
      pullDistanceRef.current = 0;
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener("touchstart", handleTouchStart, { passive: true });
      element.addEventListener("touchmove", handleTouchMove, { passive: true });
      element.addEventListener("touchend", handleTouchEnd, { passive: true });
      element.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    }

    return () => {
      if (element) {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchmove", handleTouchMove);
        element.removeEventListener("touchend", handleTouchEnd);
        element.removeEventListener("touchcancel", handleTouchEnd);
      }
    };
  }, []);

  const executeRefresh = async () => {
    isRefreshingRef.current = true;
    try {
      await Promise.all([queryClient.refetchQueries(), router.invalidate()]);
    } catch {
      // Silent refresh
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
        pullDistanceRef.current = 0;
      }, 300);
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen w-full max-w-full overflow-x-hidden">
      {children}
    </div>
  );
}
