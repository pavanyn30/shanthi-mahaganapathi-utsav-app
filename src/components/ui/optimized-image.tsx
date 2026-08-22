import React, { useEffect, useRef, useState, useCallback } from "react";
import { ImageOff, RefreshCw, Film } from "lucide-react";
import { ImageCacheManager } from "@/lib/image-cache";
import { fetchDeduplicatedImage } from "@/lib/image-request-deduper";
import { buildResponsiveSrcSet, generateLQIP } from "@/lib/image-optimizer";

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  blurDataURL?: string;
  aspectRatio?: string | number;
  fallbackSrc?: string;
  maxRetries?: number;
  responsiveWidths?: number[];
  containerClassName?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

type LoadState = "idle" | "loading" | "loaded" | "error";

function getYouTubeThumbnail(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
    : null;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  blurDataURL: initialBlurDataURL,
  aspectRatio,
  fallbackSrc,
  maxRetries = 3,
  responsiveWidths = [360, 640, 960, 1280, 1920],
  containerClassName = "",
  objectFit = "cover",
  className = "",
  width,
  height,
  srcSet: customSrcSet,
  sizes: customSizes,
  style,
  ...props
}) => {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [displaySrc, setDisplaySrc] = useState<string>("");
  const [lqip, setLqip] = useState<string>(initialBlurDataURL || "");
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(priority);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Detect Video URLs (data:video, .mp4, .webm, YouTube, etc.)
  const isVideoSource =
    Boolean(src) &&
    (src.startsWith("data:video/") ||
      /\.(mp4|webm|mov|ogg|m3u8)(\?.*)?$/i.test(src) ||
      src.includes("youtube.com") ||
      src.includes("youtu.be"));

  const ytThumb = isVideoSource ? getYouTubeThumbnail(src) : null;

  // Generate responsive srcset for normal images
  const computedSrcSet =
    isVideoSource || customSrcSet
      ? customSrcSet || ""
      : buildResponsiveSrcSet(src, responsiveWidths);
  const computedSizes = customSizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  // Intersection Observer
  useEffect(() => {
    if (priority || typeof window === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: "250px 0px", threshold: 0.01 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Load Image Callback
  const loadImage = useCallback(
    async (attempt: number = 0) => {
      if (!src) return;

      // Fast path for video sources or YouTube thumbnails
      if (isVideoSource) {
        if (ytThumb) {
          setDisplaySrc(ytThumb);
        } else {
          setDisplaySrc(src);
        }
        setLoadState("loaded");
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoadState("loading");

      try {
        const cachedUrl = await ImageCacheManager.getCachedImageUrl(src);
        if (cachedUrl) {
          setDisplaySrc(cachedUrl);
          setLoadState("loaded");
          return;
        }

        if (src.startsWith("data:") || src.startsWith("blob:")) {
          setDisplaySrc(src);
          setLoadState("loaded");
          return;
        }

        const { objectUrl } = await fetchDeduplicatedImage(src, { signal });
        if (!signal.aborted) {
          setDisplaySrc(objectUrl);
          setLoadState("loaded");
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          setTimeout(() => {
            if (!signal?.aborted) {
              setRetryCount(attempt + 1);
              loadImage(attempt + 1);
            }
          }, delay);
        } else {
          setLoadState("error");
          if (fallbackSrc) {
            setDisplaySrc(fallbackSrc);
          }
        }
      }
    },
    [src, isVideoSource, ytThumb, maxRetries, fallbackSrc],
  );

  useEffect(() => {
    if (isVisible && loadState === "idle") {
      loadImage(0);
    }
  }, [isVisible, loadState, loadImage]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(0);
    setLoadState("idle");
    loadImage(0);
  };

  const parsedAspectRatio = aspectRatio || (width && height ? `${width}/${height}` : undefined);
  const isPositioned =
    containerClassName.includes("absolute") ||
    containerClassName.includes("fixed") ||
    containerClassName.includes("sticky");

  const containerStyle: React.CSSProperties = {
    ...(isPositioned ? {} : { position: "relative" }),
    overflow: "hidden",
    ...(parsedAspectRatio ? { aspectRatio: String(parsedAspectRatio) } : {}),
  };

  const [videoFailed, setVideoFailed] = useState<boolean>(false);

  // VIDEO SOURCE RENDERER (Never crashes with "Failed to load image")
  if (isVideoSource) {
    const posterFallback =
      fallbackSrc || "https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200";

    return (
      <div
        ref={containerRef}
        className={`optimized-image-wrapper relative select-none ${containerClassName}`}
        style={containerStyle}
      >
        {ytThumb || videoFailed ? (
          <img
            src={ytThumb || posterFallback}
            alt={alt}
            className={`h-full w-full object-${objectFit} ${className}`}
            style={style}
          />
        ) : (
          <video
            src={src}
            preload="metadata"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
            className={`h-full w-full object-${objectFit} ${className}`}
            style={style}
          />
        )}
      </div>
    );
  }

  // STANDARD IMAGE RENDERER
  return (
    <div
      ref={containerRef}
      className={`optimized-image-wrapper select-none ${containerClassName}`}
      style={containerStyle}
    >
      {loadState === "loading" && !displaySrc && (
        <div className="absolute inset-0 z-10 skeleton-shimmer" />
      )}

      {displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          srcSet={computedSrcSet || undefined}
          sizes={computedSizes || undefined}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoadState("loaded")}
          onError={() => {
            setLoadState("error");
            setDisplaySrc(
              fallbackSrc || "https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=800",
            );
          }}
          className={`h-full w-full object-${objectFit} transition-all duration-500 ease-out opacity-100 ${className}`}
          style={style}
          {...props}
        />
      )}
    </div>
  );
};
