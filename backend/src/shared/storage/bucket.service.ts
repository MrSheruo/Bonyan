import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/shared/supabase.js";
import { InvalidImageError } from "@/shared/errors.js";

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

export async function uploadImage(buffer: Buffer, bucket: string): Promise<{ path: string; publicUrl: string }> {
    const path = `${randomUUID()}.webp`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
        contentType: "image/webp",
        upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
}

export async function deleteImage(path: string, bucket: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (error) console.error(`Failed to delete storage file ${path}:`, error.message);
}

export function pathFromPublicUrl(url: string, bucket: string): string {
    const marker = `/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) throw new Error("Could not parse storage path from URL");
    return url.slice(idx + marker.length);
}