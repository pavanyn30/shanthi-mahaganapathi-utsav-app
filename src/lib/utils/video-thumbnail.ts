/**
 * Helper to extract YouTube ID from any YouTube watch/shorts/embed/live URL.
 */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const str = url.trim();
  if (str.includes("/embed/")) {
    const match = str.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return match[1];
  }
  const match = str.match(/(?:v=|\/shorts\/|\/live\/|\/embed\/|\/v\/|youtu\.be\/|\/e\/)([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  const genericMatch = str.match(/([a-zA-Z0-9_-]{11})/);
  if ((str.includes("youtube.com") || str.includes("youtu.be")) && genericMatch && genericMatch[1]) {
    return genericMatch[1];
  }
  return null;
}

/**
 * Helper to extract YouTube high-res thumbnail from any YouTube URL.
 */
export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export const DEFAULT_FESTIVAL_THUMBNAIL =
  "https://images.unsplash.com/photo-1631169920665-3b8b0e5a7ede?w=1200";

/**
 * Helper: Check if string is a Video URL format
 */
export function isVideoUrlFormat(url: string | null | undefined): boolean {
  if (!url) return false;
  const str = url.trim();
  return (
    str.startsWith("data:video/") ||
    str.startsWith("blob:") ||
    /\.(mp4|webm|mov|ogg|m3u8)(\?.*)?$/i.test(str) ||
    /youtube\.com|youtu\.be|vimeo\.com|instagram\.com|drive\.google\.com|facebook\.com|fb\.watch/i.test(str)
  );
}

/**
 * Smart Thumbnail Resolver: Gets custom thumbnail, auto-extracts YouTube thumbnail,
 * or returns default festival thumbnail when admin didn't provide one.
 */
export function getGalleryThumbnail(item: {
  thumbnail_url?: string | null;
  media_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
}): string {
  if (item.thumbnail_url && item.thumbnail_url.trim().length > 0) {
    return item.thumbnail_url.trim();
  }

  const targetUrl = item.video_url || item.media_url;
  const ytThumb = getYouTubeThumbnail(targetUrl);
  if (ytThumb) {
    return ytThumb;
  }

  if (item.media_url && !isVideoUrlFormat(item.media_url)) {
    return item.media_url.trim();
  }

  return DEFAULT_FESTIVAL_THUMBNAIL;
}

/**
 * Automatically resolves or generates a high-quality video thumbnail when admin does not provide one.
 */
export async function autoGenerateVideoThumbnail(
  videoUrl: string,
  userThumbnail?: string | null,
): Promise<string> {
  // If admin provided a custom thumbnail, use it
  if (userThumbnail && userThumbnail.trim().length > 0) {
    return userThumbnail.trim();
  }

  if (!videoUrl || !videoUrl.trim()) {
    return DEFAULT_FESTIVAL_THUMBNAIL;
  }

  const cleanUrl = videoUrl.trim();

  // 1. YouTube link -> Auto extract YouTube high-res thumbnail
  const ytThumb = getYouTubeThumbnail(cleanUrl);
  if (ytThumb) {
    return ytThumb;
  }

  // 2. Direct Video (MP4/WebM) -> Auto capture frame at 1st second using offscreen video canvas
  if (
    typeof window !== "undefined" &&
    (cleanUrl.startsWith("data:video/") || /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(cleanUrl))
  ) {
    try {
      const frameDataUrl = await new Promise<string>((resolve) => {
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.src = cleanUrl;
        video.muted = true;
        video.playsInline = true;

        const timeout = setTimeout(() => {
          resolve(DEFAULT_FESTIVAL_THUMBNAIL);
        }, 3500);

        video.onloadeddata = () => {
          video.currentTime = Math.min(1, (video.duration || 2) / 2);
        };

        video.onseeked = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext("2d");
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
              resolve(dataUrl);
              return;
            }
          } catch (e) {
            console.warn("Frame capture failed:", e);
          }
          resolve(DEFAULT_FESTIVAL_THUMBNAIL);
        };

        video.onerror = () => {
          clearTimeout(timeout);
          resolve(DEFAULT_FESTIVAL_THUMBNAIL);
        };
      });

      if (frameDataUrl && frameDataUrl !== DEFAULT_FESTIVAL_THUMBNAIL) {
        return frameDataUrl;
      }
    } catch (e) {
      console.warn("Auto thumbnail generation failed:", e);
    }
  }

  return DEFAULT_FESTIVAL_THUMBNAIL;
}
