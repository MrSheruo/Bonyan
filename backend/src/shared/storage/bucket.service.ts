import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/shared/supabase.js";
import { ConflictError, InvalidImageError, NotFoundError } from "@/shared/errors.js";

const BUCKET = "product-images";
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export async function compressImage(buffer: Buffer): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
    } catch {
        throw new InvalidImageError("Uploaded file is not a valid image");
    }
}

export async function uploadImage(buffer: Buffer): Promise<{ path: string; publicUrl: string }> {
    const path = `${randomUUID()}.webp`;
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
        contentType: "image/webp",
        upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
}

export async function deleteImage(path: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) console.error(`Failed to delete storage file ${path}:`, error.message);
}

// Extract the storage path from a public URL — needed because productImages.url
// stores the full public URL, but deletion needs just the path.
export function pathFromPublicUrl(url: string): string {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) throw new Error("Could not parse storage path from URL");
    return url.slice(idx + marker.length);
}
