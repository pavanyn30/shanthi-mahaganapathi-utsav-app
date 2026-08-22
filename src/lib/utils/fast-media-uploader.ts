import { supabase } from "@/integrations/supabase/client";

export interface FastUploadResult {
  url: string;
  success: boolean;
}

/**
 * Uploads a raw File or Blob directly to Supabase Storage CDN ('gallery' bucket)
 * Fast binary streaming - completes in 1-3 seconds without Base64 overhead!
 */
export async function uploadMediaToStorageCDN(
  file: File | Blob,
  fileNamePrefix: string = "media",
): Promise<FastUploadResult> {
  try {
    let ext = "webp";
    if (file instanceof File && file.name) {
      ext = file.name.split(".").pop() || "webp";
    } else if (file.type) {
      if (file.type.includes("webp")) ext = "webp";
      else if (file.type.includes("png")) ext = "png";
      else if (file.type.includes("jpeg") || file.type.includes("jpg")) ext = "jpg";
      else if (file.type.includes("mp4")) ext = "mp4";
    }

    const cleanPrefix = fileNamePrefix.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = `uploads/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${cleanPrefix}.${ext}`;

    const bucketsToTry = ["gallery", "avatars", "payment-proofs", "posters"];

    for (const bucketName of bucketsToTry) {
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type || undefined,
      });

      if (!uploadError) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        if (data?.publicUrl) {
          return { url: data.publicUrl, success: true };
        }
      }
    }

    return { url: "", success: false };
  } catch (err) {
    console.error("Storage upload exception:", err);
    return { url: "", success: false };
  }
}
