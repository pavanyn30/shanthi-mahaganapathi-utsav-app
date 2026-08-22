import { useState, useEffect } from "react";

export function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = 0;
    let ticking = false;
    let activityTimer: ReturnType<typeof setTimeout> | null = null;

    const getScrollTop = () => {
      if (typeof window === "undefined") return 0;
      return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
      );
    };

    lastScrollY = getScrollTop();

    const handleUserInteraction = () => {
      // Show header & navbar whenever user taps, touches, or interacts with the screen
      setIsVisible(true);
    };

    const updateScrollDirection = () => {
      const scrollY = getScrollTop();

      // Near top of page (within 20px), always keep header & navbar visible
      if (scrollY <= 20) {
        setIsVisible(true);
        lastScrollY = scrollY;
        ticking = false;
        return;
      }

      const diff = scrollY - lastScrollY;
      if (Math.abs(diff) >= 4) {
        if (diff > 0) {
          setIsVisible(false); // Scroll down -> hide header & navbar
        } else {
          setIsVisible(true); // Scroll up -> show header & navbar
        }
        lastScrollY = scrollY > 0 ? scrollY : 0;
      }

      // Auto-display header and navbar 1.2s after scrolling pauses
      if (activityTimer) clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    // Attach capturing scroll and touch/interaction listeners
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });
    window.addEventListener("pointerdown", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("pointerdown", handleUserInteraction);
      if (activityTimer) clearTimeout(activityTimer);
    };
  }, []);

  return isVisible;
}
