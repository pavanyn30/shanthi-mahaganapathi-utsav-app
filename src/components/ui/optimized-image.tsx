import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';
import { ImageCacheManager } from '@/lib/image-cache';
import { fetchDeduplicatedImage } from '@/lib/image-request-deduper';
import { buildResponsiveSrcSet, generateLQIP } from '@/lib/image-optimizer';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Set to true for hero / above-the-fold images to preload and skip lazy loading */
  priority?: boolean;
  /** Low quality image placeholder (data URL or micro image) */
  blurDataURL?: string;
  /** Aspect ratio string or number e.g. "16/9", "4/3", "1/1" or 1.777 */
  aspectRatio?: string | number;
  /** Custom fallback image or component on error */
  fallbackSrc?: string;
  /** Maximum retry attempts for network failures */
  maxRetries?: number;
  /** Array of pixel widths for responsive srcset */
  responsiveWidths?: number[];
  /** Container wrapper class name */
  containerClassName?: string;
  /** Image object-fit mode */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  priority = false,
  blurDataURL: initialBlurDataURL,
  aspectRatio,
  fallbackSrc,
  maxRetries = 3,
  responsiveWidths = [360, 640, 960, 1280, 1920],
  containerClassName = '',
  objectFit = 'cover',
  className = '',
  width,
  height,
  srcSet: customSrcSet,
  sizes: customSizes,
  style,
  ...props
}) => {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [displaySrc, setDisplaySrc] = useState<string>('');
  const [lqip, setLqip] = useState<string>(initialBlurDataURL || '');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(priority);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate responsive srcset
  const computedSrcSet = customSrcSet || buildResponsiveSrcSet(src, responsiveWidths);
  const computedSizes = customSizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Intersection Observer for viewport visibility
  useEffect(() => {
    if (priority || typeof window === 'undefined') {
      setIsVisible(true);
      return;
    }

    // Adjust rootMargin based on network speed (larger margin on fast connections)
    let margin = '250px 0px';
    if ('connection' in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
        margin = '100px 0px';
      } else if (conn?.effectiveType === '4g') {
        margin = '400px 0px';
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            // Cancel request if image scrolls out of view before completing load
            if (loadState === 'loading' && abortControllerRef.current) {
              abortControllerRef.current.abort();
              abortControllerRef.current = null;
              setLoadState('idle');
            }
          }
        });
      },
      { rootMargin: margin, threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, loadState]);

  // Load low quality blurred placeholder if not provided
  useEffect(() => {
    if (!initialBlurDataURL && src && isVisible && !lqip && !src.startsWith('data:')) {
      let isMounted = true;
      generateLQIP(src).then((url) => {
        if (isMounted && url) setLqip(url);
      });
      return () => {
        isMounted = false;
      };
    }
  }, [src, isVisible, initialBlurDataURL, lqip]);

  // Main Image Fetcher with Retry & Deduplication
  const loadImage = useCallback(
    async (attempt: number = 0) => {
      if (!src) return;

      // Reset abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setLoadState('loading');

      try {
        // Fast path: check instant cache
        const cachedUrl = await ImageCacheManager.getCachedImageUrl(src);
        if (cachedUrl) {
          setDisplaySrc(cachedUrl);
          setLoadState('loaded');
          return;
        }

        // Handle inline data URLs or blob URLs
        if (src.startsWith('data:') || src.startsWith('blob:')) {
          setDisplaySrc(src);
          setLoadState('loaded');
          return;
        }

        // Deduplicated network fetch
        const { objectUrl } = await fetchDeduplicatedImage(src, { signal });
        if (!signal.aborted) {
          setDisplaySrc(objectUrl);
          setLoadState('loaded');
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Silent ignore for cancelled requests
          return;
        }

        // Exponential backoff retry logic
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          setTimeout(() => {
            if (!signal.aborted) {
              setRetryCount(attempt + 1);
              loadImage(attempt + 1);
            }
          }, delay);
        } else {
          setLoadState('error');
          if (fallbackSrc) {
            setDisplaySrc(fallbackSrc);
          }
        }
      }
    },
    [src, maxRetries, fallbackSrc]
  );

  // Trigger loading when visible
  useEffect(() => {
    if (isVisible && loadState === 'idle') {
      loadImage(0);
    }
  }, [isVisible, loadState, loadImage]);

  // Re-trigger load manually
  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryCount(0);
    setLoadState('idle');
    loadImage(0);
  };

  // Preload priority images into <head>
  useEffect(() => {
    if (priority && src && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      if (computedSrcSet) link.imageSrcset = computedSrcSet;
      if (computedSizes) link.imageSizes = computedSizes;
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [priority, src, computedSrcSet, computedSizes]);

  // Layout Shift Prevention: Calculate style aspect ratio
  const parsedAspectRatio =
    aspectRatio || (width && height ? `${width}/${height}` : undefined);

  const isPositioned =
    containerClassName.includes('absolute') ||
    containerClassName.includes('fixed') ||
    containerClassName.includes('sticky');

  const containerStyle: React.CSSProperties = {
    ...(isPositioned ? {} : { position: 'relative' }),
    overflow: 'hidden',
    ...(parsedAspectRatio ? { aspectRatio: String(parsedAspectRatio) } : {}),
  };

  return (
    <div
      ref={containerRef}
      className={`optimized-image-wrapper select-none ${containerClassName}`}
      style={containerStyle}
    >
      {/* 1. Modern Skeleton Shimmer Loader */}
      {loadState === 'loading' && !displaySrc && (
        <div className="absolute inset-0 z-10 skeleton-shimmer" />
      )}

      {/* 2. Low Quality Blurred Image Placeholder (LQIP) */}
      {lqip && loadState !== 'loaded' && (
        <img
          src={lqip}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full img-loading-preview opacity-90 object-${objectFit}`}
        />
      )}

      {/* 3. High Quality Loaded Image */}
      {displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          srcSet={computedSrcSet || undefined}
          sizes={computedSizes || undefined}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoadState('loaded')}
          onError={() => {
            if (loadState !== 'error') {
              setLoadState('error');
            }
          }}
          className={`h-full w-full object-${objectFit} transition-all duration-500 ease-out ${
            loadState === 'loaded' ? 'opacity-100 img-loaded-full' : 'opacity-0 img-loading-preview'
          } ${className}`}
          style={style}
          {...props}
        />
      )}

      {/* 4. Error Fallback UI with Retry Button */}
      {loadState === 'error' && !fallbackSrc && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-muted/80 p-3 text-center text-muted-foreground">
          <ImageOff className="h-6 w-6 text-destructive/70" />
          <span className="text-xs font-medium">Failed to load image</span>
          <button
            onClick={handleRetry}
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-accent"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
};
