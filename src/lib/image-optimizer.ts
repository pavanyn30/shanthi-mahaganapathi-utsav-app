/**
 * Image optimization library for client-side compression, WebP/AVIF format conversion,
 * low-quality image placeholder (LQIP) generation, and responsive URL construction.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'webp' | 'avif';
}

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  blurDataUrl: string;
  originalSize: number;
  compressedSize: number;
}

const formatSupportCache: Record<string, boolean> = {};

/**
 * Checks if the browser supports a given image format (e.g. webp or avif).
 */
export async function supportsFormat(format: 'webp' | 'avif'): Promise<boolean> {
  if (format in formatSupportCache) {
    return formatSupportCache[format];
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
      const isSupported = elem.toDataURL(`image/${format}`).indexOf(`data:image/${format}`) === 0;
      formatSupportCache[format] = isSupported;
      resolve(isSupported);
    } else {
      formatSupportCache[format] = false;
      resolve(false);
    }
  });
}

/**
 * Compresses an uploaded image file and converts it to WebP or AVIF format.
 */
export async function compressAndConvertToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82, format = 'webp' } = options;

  const targetFormat = (await supportsFormat(format)) ? format : 'webp';
  const mimeType = `image/${targetFormat}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Scale down proportionally if larger than maximum bounds
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Generate a tiny low-quality blurred preview (LQIP)
      const blurDataUrl = await generateLQIPFromCanvas(canvas);

      // Convert canvas to File/Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas blob creation failed'));
            return;
          }

          const newFileName = file.name.replace(/\.[^/.]+$/, '') + `.${targetFormat}`;
          const compressedFile = new File([blob], newFileName, { type: mimeType });

          resolve({
            file: compressedFile,
            dataUrl,
            width,
            height,
            blurDataUrl,
            originalSize: file.size,
            compressedSize: compressedFile.size,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a 16x16 tiny low-quality blurred image preview (LQIP) as a Data URL.
 */
export async function generateLQIPFromCanvas(sourceCanvas: HTMLCanvasElement): Promise<string> {
  const lqipCanvas = document.createElement('canvas');
  lqipCanvas.width = 16;
  lqipCanvas.height = 16;

  const ctx = lqipCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(sourceCanvas, 0, 0, 16, 16);

  return lqipCanvas.toDataURL('image/webp', 0.2);
}

/**
 * Generates an LQIP data URL directly from an image URL source.
 */
export async function generateLQIP(src: string): Promise<string> {
  if (typeof window === 'undefined') return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, 16, 16);
        resolve(canvas.toDataURL('image/webp', 0.2));
      } else {
        resolve('');
      }
    };

    img.onerror = () => resolve('');
    img.src = src;
  });
}

/**
 * Helper to produce responsive srcset strings for image URLs (supports CDN query params if applicable).
 */
export function buildResponsiveSrcSet(src: string, widths: number[] = [360, 640, 960, 1280, 1920]): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return '';

  // If the image is from Unsplash or a URL supporting width params
  if (src.includes('unsplash.com') || src.includes('supabase.co')) {
    return widths
      .map((w) => {
        const url = new URL(src, typeof window !== 'undefined' ? window.location.href : 'http://localhost');
        url.searchParams.set('w', w.toString());
        url.searchParams.set('auto', 'format');
        url.searchParams.set('q', '80');
        return `${url.toString()} ${w}w`;
      })
      .join(', ');
  }

  return '';
}
