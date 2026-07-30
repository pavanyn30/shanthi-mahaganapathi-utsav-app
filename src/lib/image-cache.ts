/**
 * Aggressive image caching engine using Browser CacheStorage + In-memory Blob URLs.
 * Ensures instant load on repeat visits and smooth scrolling without re-fetching.
 */

const CACHE_NAME = 'app-image-cache-v1';
const memoryBlobCache = new Map<string, string>();
const memoryBlobObjects = new Map<string, Blob>();

export class ImageCacheManager {
  /**
   * Tries to get cached image from Memory Blob Map or CacheStorage.
   * Returns a usable Blob/Data URL or null if not cached.
   */
  static async getCachedImageUrl(url: string): Promise<string | null> {
    if (!url || typeof window === 'undefined') return null;

    // 1. Check in-memory blob cache (instant sub-ms)
    if (memoryBlobCache.has(url)) {
      return memoryBlobCache.get(url)!;
    }

    // Don't attempt cache storage for data URLs or blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    // 2. Check Browser CacheStorage
    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url);
        if (response) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          memoryBlobCache.set(url, blobUrl);
          memoryBlobObjects.set(url, blob);
          return blobUrl;
        }
      }
    } catch {
      // Ignore cache storage errors in restricted contexts
    }

    return null;
  }

  /**
   * Stores a fetched image blob in CacheStorage and in-memory map.
   */
  static async storeInCache(url: string, blob: Blob): Promise<string> {
    if (!url || typeof window === 'undefined') return url;

    const blobUrl = URL.createObjectURL(blob);
    memoryBlobCache.set(url, blobUrl);
    memoryBlobObjects.set(url, blob);

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return blobUrl;
    }

    try {
      if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const response = new Response(blob, {
          headers: {
            'Content-Type': blob.type || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
        await cache.put(url, response);
      }
    } catch {
      // Fallback silently if cache storage fails
    }

    return blobUrl;
  }

  /**
   * Clears memory cache references when needed.
   */
  static clearMemoryCache(): void {
    for (const blobUrl of memoryBlobCache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    memoryBlobCache.clear();
    memoryBlobObjects.clear();
  }
}
