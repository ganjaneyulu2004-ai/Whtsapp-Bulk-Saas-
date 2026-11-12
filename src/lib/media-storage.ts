import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const MAX_TEMPLATE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

export function resolvePublicBaseUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured.replace(/\/$/, "");
  }
  if (
    fallbackOrigin &&
    fallbackOrigin.startsWith("https://") &&
    !fallbackOrigin.includes("localhost") &&
    !fallbackOrigin.includes("127.0.0.1")
  ) {
    return fallbackOrigin.replace(/\/$/, "");
  }
  return "https://oneample.com";
}

/**
 * Saves an uploaded JPG/PNG template header image to `/public/uploads/templates`
 * and returns a publicly fetchable URL via `/api/templates/media/<filename>`.
 */
export async function saveTemplateImageBuffer(
  buffer: Buffer,
  mimeType: string,
  businessId: string,
  fallbackOrigin?: string
): Promise<{ filename: string; publicUrl: string; relativePath: string }> {
  const normalizedMime = String(mimeType || "").toLowerCase().trim();
  const ext = ALLOWED_IMAGE_MIME[normalizedMime];
  if (!ext) {
    throw new Error("Only JPG and PNG images are allowed for WhatsApp template headers.");
  }
  if (buffer.length === 0) {
    throw new Error("Uploaded image file is empty.");
  }
  if (buffer.length > MAX_TEMPLATE_IMAGE_BYTES) {
    throw new Error("Template header image must be 5 MB or smaller.");
  }

  const safeBizPrefix = businessId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "biz";
  const rand = crypto.randomBytes(6).toString("hex");
  const filename = `tpl_${safeBizPrefix}_${Date.now()}_${rand}.${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", "templates");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);

  const baseUrl = resolvePublicBaseUrl(fallbackOrigin);
  return {
    filename,
    relativePath: `/api/templates/media/${filename}`,
    publicUrl: `${baseUrl}/api/templates/media/${filename}`,
  };
}

/**
 * Decodes a data:image/(jpeg|png);base64,... URI and stores it on disk as a public URL.
 */
export async function saveBase64TemplateImage(
  dataUrl: string,
  businessId: string,
  fallbackOrigin?: string
): Promise<{ filename: string; publicUrl: string; relativePath: string }> {
  const match = String(dataUrl || "").match(/^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("Invalid image format. Only JPG and PNG images are supported.");
  }
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  return saveTemplateImageBuffer(buffer, mimeType, businessId, fallbackOrigin);
}

