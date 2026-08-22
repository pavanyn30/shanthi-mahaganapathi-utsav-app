/**
 * In-flight image request deduplicator.
 * Ensures that if multiple components request the same image URL concurrently,
 * only a single fetch request is dispatched over the network.
 */

import { ImageCacheManager } from "./image-cache";

const inFlightRequests = new Map<string, Promise<Blob>>();

export async function fetchDeduplicatedImage(
  url: string,
  options?: { signal?: AbortSignal },
): Promise<{ blob: Blob; objectUrl: string }> {
  if (!url) {
    throw new Error("Image URL is required");
  }

  // Check cache first
  const cachedUrl = await ImageCacheManager.getCachedImageUrl(url);
  if (cachedUrl) {
    // If cached, retrieve blob or convert cached objectUrl
    const res = await fetch(cachedUrl);
    const blob = await res.blob();
    return { blob, objectUrl: cachedUrl };
  }

  // If already fetching, hook onto existing request
  if (inFlightRequests.has(url)) {
    const blob = await inFlightRequests.get(url)!;
    const objectUrl = await ImageCacheManager.storeInCache(url, blob);
    return { blob, objectUrl };
  }

  // Create new fetch request
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        signal: options?.signal,
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return blob;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, fetchPromise);

  const blob = await fetchPromise;
  const objectUrl = await ImageCacheManager.storeInCache(url, blob);
  return { blob, objectUrl };
}
