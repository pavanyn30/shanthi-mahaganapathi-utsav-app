import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface DownloadMediaOptions {
  title?: string;
  mediaType?: "image" | "video" | "auto";
  onProgress?: (progress: number) => void;
  onStateChange?: (state: "idle" | "downloading" | "downloaded" | "error") => void;
}

export type DownloadVideoOptions = DownloadMediaOptions;

interface DetectedMediaInfo {
  mimeType: string;
  extension: string;
  category: "image" | "video" | "unknown";
}

const EXTENSION_MAP: Record<string, DetectedMediaInfo> = {
  // Images
  jpg: { mimeType: "image/jpeg", extension: "jpg", category: "image" },
  jpeg: { mimeType: "image/jpeg", extension: "jpeg", category: "image" },
  png: { mimeType: "image/png", extension: "png", category: "image" },
  webp: { mimeType: "image/webp", extension: "webp", category: "image" },
  gif: { mimeType: "image/gif", extension: "gif", category: "image" },
  svg: { mimeType: "image/svg+xml", extension: "svg", category: "image" },
  avif: { mimeType: "image/avif", extension: "avif", category: "image" },
  bmp: { mimeType: "image/bmp", extension: "bmp", category: "image" },
  ico: { mimeType: "image/x-icon", extension: "ico", category: "image" },

  // Videos
  mp4: { mimeType: "video/mp4", extension: "mp4", category: "video" },
  webm: { mimeType: "video/webm", extension: "webm", category: "video" },
  mov: { mimeType: "video/quicktime", extension: "mov", category: "video" },
  m4v: { mimeType: "video/x-m4v", extension: "m4v", category: "video" },
  avi: { mimeType: "video/x-msvideo", extension: "avi", category: "video" },
  mkv: { mimeType: "video/x-matroska", extension: "mkv", category: "video" },
  flv: { mimeType: "video/x-flv", extension: "flv", category: "video" },
  ts: { mimeType: "video/mp2t", extension: "ts", category: "video" },
  m3u8: { mimeType: "application/x-mpegURL", extension: "m3u8", category: "video" },
};

const MIME_MAP: Record<string, DetectedMediaInfo> = {
  "image/jpeg": { mimeType: "image/jpeg", extension: "jpg", category: "image" },
  "image/jpg": { mimeType: "image/jpeg", extension: "jpg", category: "image" },
  "image/png": { mimeType: "image/png", extension: "png", category: "image" },
  "image/webp": { mimeType: "image/webp", extension: "webp", category: "image" },
  "image/gif": { mimeType: "image/gif", extension: "gif", category: "image" },
  "image/svg+xml": { mimeType: "image/svg+xml", extension: "svg", category: "image" },
  "image/avif": { mimeType: "image/avif", extension: "avif", category: "image" },
  "image/bmp": { mimeType: "image/bmp", extension: "bmp", category: "image" },

  "video/mp4": { mimeType: "video/mp4", extension: "mp4", category: "video" },
  "video/webm": { mimeType: "video/webm", extension: "webm", category: "video" },
  "video/quicktime": { mimeType: "video/quicktime", extension: "mov", category: "video" },
  "video/x-m4v": { mimeType: "video/x-m4v", extension: "m4v", category: "video" },
  "video/x-msvideo": { mimeType: "video/x-msvideo", extension: "avi", category: "video" },
  "video/x-matroska": { mimeType: "video/x-matroska", extension: "mkv", category: "video" },
  "video/3gpp": { mimeType: "video/3gpp", extension: "3gp", category: "video" },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.substring(dataUrl.indexOf(",") + 1);
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Inspect raw binary bytes (magic numbers) to detect the exact file format & MIME type.
 */
function detectMagicBytes(bytes: Uint8Array): DetectedMediaInfo | null {
  if (!bytes || bytes.length < 4) return null;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { mimeType: "image/png", extension: "png", category: "image" };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg", category: "image" };
  }

  // GIF: GIF87a / GIF89a
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { mimeType: "image/gif", extension: "gif", category: "image" };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mimeType: "image/webp", extension: "webp", category: "image" };
  }

  // SVG: <?xml or <svg
  if (bytes.length >= 5) {
    const textSnippet = String.fromCharCode(...bytes.slice(0, 100)).toLowerCase();
    if (textSnippet.includes("<svg") || textSnippet.includes("<?xml")) {
      return { mimeType: "image/svg+xml", extension: "svg", category: "image" };
    }
  }

  // WebM / MKV: 1A 45 DF A3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mimeType: "video/webm", extension: "webm", category: "video" };
  }

  // MP4 / MOV / M4V / AVIF: offset 4 ftyp
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    if (bytes.length >= 12) {
      const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
      if (brand.includes("avif") || brand.includes("avis")) {
        return { mimeType: "image/avif", extension: "avif", category: "image" };
      }
      if (brand.includes("qt")) {
        return { mimeType: "video/quicktime", extension: "mov", category: "video" };
      }
    }
    return { mimeType: "video/mp4", extension: "mp4", category: "video" };
  }

  // MOV alternative: moov box at offset 4
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x6d &&
    bytes[5] === 0x6f &&
    bytes[6] === 0x6f &&
    bytes[7] === 0x76
  ) {
    return { mimeType: "video/quicktime", extension: "mov", category: "video" };
  }

  // AVI: RIFF (0-3) ... AVI (8-11)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length >= 12 &&
    bytes[8] === 0x41 &&
    bytes[9] === 0x56 &&
    bytes[10] === 0x49 &&
    bytes[11] === 0x20
  ) {
    return { mimeType: "video/x-msvideo", extension: "avi", category: "video" };
  }

  return null;
}

function getUrlExtension(url: string): string {
  try {
    const cleanUrl = url.split("?")[0].split("#")[0];
    const filename = cleanUrl.split("/").pop() || "";
    const parts = filename.split(".");
    if (parts.length > 1) {
      return parts.pop()!.toLowerCase();
    }
  } catch (e) {
    console.warn("Error parsing URL extension:", e);
  }
  return "";
}

function resolveMediaInfo(
  url: string,
  contentTypeHeader: string | null,
  firstChunk: Uint8Array | null,
  requestedCategory?: "image" | "video" | "auto",
): DetectedMediaInfo {
  // 1. Check Magic Bytes (Highest binary accuracy)
  if (firstChunk) {
    const magicMatch = detectMagicBytes(firstChunk);
    if (magicMatch) {
      return magicMatch;
    }
  }

  // 2. Check HTTP Content-Type Header
  if (contentTypeHeader) {
    const cleanContentType = contentTypeHeader.split(";")[0].trim().toLowerCase();
    if (MIME_MAP[cleanContentType]) {
      return MIME_MAP[cleanContentType];
    }
    if (cleanContentType.startsWith("image/")) {
      const ext = cleanContentType.replace("image/", "");
      return {
        mimeType: cleanContentType,
        extension: EXTENSION_MAP[ext]?.extension || (ext === "jpeg" ? "jpg" : ext),
        category: "image",
      };
    }
    if (cleanContentType.startsWith("video/")) {
      const ext = cleanContentType.replace("video/", "");
      return {
        mimeType: cleanContentType,
        extension: EXTENSION_MAP[ext]?.extension || ext,
        category: "video",
      };
    }
  }

  // 3. Check URL extension
  const urlExt = getUrlExtension(url);
  if (urlExt && EXTENSION_MAP[urlExt]) {
    return EXTENSION_MAP[urlExt];
  }

  // Fallback defaults if unspecified
  if (requestedCategory === "image") {
    return { mimeType: "image/jpeg", extension: "jpg", category: "image" };
  } else if (requestedCategory === "video") {
    return { mimeType: "video/mp4", extension: "mp4", category: "video" };
  }

  return { mimeType: "image/jpeg", extension: "jpg", category: "image" };
}

function formatSafeFilename(title: string, detectedInfo: DetectedMediaInfo): string {
  let baseTitle = title.trim();
  const knownExtensions = Object.keys(EXTENSION_MAP);

  // Strip any trailing known extension from user-provided title to avoid double extensions like "photo.png.jpg" or "photo.mp4.jpg"
  for (const ext of knownExtensions) {
    if (baseTitle.toLowerCase().endsWith("." + ext)) {
      baseTitle = baseTitle.slice(0, -(ext.length + 1));
      break;
    }
  }

  const safeTitle = baseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const fallbackPrefix = detectedInfo.category === "video" ? "festival-video" : "festival-photo";
  return `${safeTitle || fallbackPrefix}-${Date.now()}.${detectedInfo.extension}`;
}

async function fetchSupabaseStorageFile(url: string): Promise<Blob | null> {
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = match[1];
    const path = decodeURIComponent(match[2].split("?")[0]);

    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      console.warn("Supabase SDK download returned error:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Supabase SDK download exception:", err);
    return null;
  }
}

/**
 * Downloads a media file (Image or Video) in-app with automatic MIME detection,
 * progress tracking, and saves to device storage or triggers browser download.
 */
export async function downloadMediaFile(
  mediaUrl: string,
  options: DownloadMediaOptions = {},
): Promise<boolean> {
  const { title = "ganapathi-media", mediaType = "auto", onProgress, onStateChange } = options;

  if (!mediaUrl) {
    toast.error("Media URL is missing or invalid.");
    onStateChange?.("error");
    return false;
  }

  if (/youtube\.com|youtu\.be/i.test(mediaUrl)) {
    toast.info("YouTube live streams & embeds can only be watched live.");
    onStateChange?.("idle");
    return false;
  }

  try {
    onStateChange?.("downloading");
    onProgress?.(5);

    const chunks: Uint8Array[] = [];
    let contentTypeHeader: string | null = null;
    let totalBytes = 0;

    let response: Response | null = null;
    try {
      response = await fetch(mediaUrl, {
        method: "GET",
        headers: {
          Accept: "image/*,video/*,*/*",
        },
      });
    } catch (fetchErr) {
      console.warn("Direct fetch failed, checking for Supabase Storage fallback...", fetchErr);
    }

    if (response && response.ok) {
      contentTypeHeader = response.headers.get("Content-Type");
      const contentLength = response.headers.get("Content-Length");
      totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      let loadedBytes = 0;
      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            chunks.push(value);
            loadedBytes += value.byteLength;

            if (totalBytes > 0) {
              const percent = Math.min(90, Math.round((loadedBytes / totalBytes) * 90));
              onProgress?.(percent);
            } else {
              onProgress?.(Math.min(85, Math.round((loadedBytes / (1024 * 1024 * 5)) * 85)));
            }
          }
        }
      } else {
        const arrayBuffer = await response.arrayBuffer();
        chunks.push(new Uint8Array(arrayBuffer));
      }
    } else {
      const supabaseBlob = await fetchSupabaseStorageFile(mediaUrl);
      if (supabaseBlob) {
        const arrayBuffer = await supabaseBlob.arrayBuffer();
        chunks.push(new Uint8Array(arrayBuffer));
        contentTypeHeader = supabaseBlob.type || contentTypeHeader;
      } else {
        throw new Error(
          response ? `Server returned HTTP status ${response.status}` : "Network fetch failed",
        );
      }
    }

    onProgress?.(92);

    const firstChunk = chunks.length > 0 ? chunks[0] : null;
    const detectedInfo = resolveMediaInfo(mediaUrl, contentTypeHeader, firstChunk, mediaType);

    const mediaBlob = new Blob(chunks as unknown as BlobPart[], { type: detectedInfo.mimeType });
    const fileName = formatSafeFilename(title, detectedInfo);

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        await Filesystem.requestPermissions();
      } catch (e) {
        console.warn("Filesystem permissions warning:", e);
      }

      const base64Data = await blobToBase64(mediaBlob);

      let savedPath = "";
      try {
        const result = await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: base64Data,
          directory: Directory.ExternalStorage,
          recursive: true,
        });
        savedPath = result.uri;
      } catch (err1) {
        try {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          savedPath = result.uri;
        } catch (err2) {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true,
          });
          savedPath = result.uri;
        }
      }

      console.log(`${detectedInfo.category} natively saved at:`, savedPath);
    } else {
      const blobUrl = URL.createObjectURL(mediaBlob);
      const anchor = document.createElement("a");
      anchor.style.display = "none";
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    }

    onProgress?.(100);
    onStateChange?.("downloaded");

    const categoryLabel = detectedInfo.category === "video" ? "Video" : "Image";
    toast.success(`✅ ${categoryLabel} saved to your device Gallery & Files!`);

    setTimeout(() => {
      onStateChange?.("idle");
      onProgress?.(0);
    }, 4000);

    return true;
  } catch (err: any) {
    console.error("Media download failed:", err);
    onStateChange?.("error");
    toast.error("Download failed. Direct file link unavailable or blocked.");
    setTimeout(() => onStateChange?.("idle"), 3000);
    return false;
  }
}

/**
 * Convenience export for video downloading (backward compatible)
 */
export async function downloadVideoFile(
  videoUrl: string,
  options: DownloadMediaOptions = {},
): Promise<boolean> {
  return downloadMediaFile(videoUrl, { ...options, mediaType: "video" });
}

/**
 * Convenience export for image downloading
 */
export async function downloadImageFile(
  imageUrl: string,
  options: DownloadMediaOptions = {},
): Promise<boolean> {
  return downloadMediaFile(imageUrl, { ...options, mediaType: "image" });
}

