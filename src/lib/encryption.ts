import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const PREFIX = "enc:v1:";

/**
 * Derives a consistent 32-byte (256-bit) encryption key from the environment.
 * Prioritizes process.env.ENCRYPTION_KEY, with process.env.NEXTAUTH_SECRET as a fallback.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error(
      "ENCRYPTION_KEY (or NEXTAUTH_SECRET) is missing in environment variables. Cannot perform encryption/decryption."
    );
  }
  // Hash the secret with SHA-256 to guarantee an exact 32-byte key regardless of input format
  return crypto.createHash("sha256").update(secret.trim()).digest();
}

/**
 * Encrypts a plain-text token using AES-256-GCM.
 * Idempotent: If the token is already encrypted (starts with enc:v1:), returns it as-is.
 */
export function encryptToken(plainText: string | null | undefined): string | null {
  if (!plainText || plainText.trim() === "") {
    return null;
  }

  const trimmed = plainText.trim();
  if (trimmed.startsWith(PREFIX)) {
    return trimmed;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return `${PREFIX}${iv.toString("hex")}:${tag}:${encrypted}`;
  } catch (error: any) {
    console.error("Encryption error:", error.message || error);
    throw new Error("Failed to encrypt token.");
  }
}

/**
 * Decrypts a token encrypted with AES-256-GCM.
 * Backward-compatible: If the token is legacy plain text (does not start with enc:v1:),
 * returns it as-is so WhatsApp sending never breaks.
 */
export function decryptToken(encryptedText: string | null | undefined): string | null {
  if (!encryptedText || encryptedText.trim() === "") {
    return null;
  }

  const trimmed = encryptedText.trim();

  // Backward-compatibility: Plain-text legacy tokens pass straight through
  if (!trimmed.startsWith(PREFIX)) {
    return trimmed;
  }

  try {
    const key = getEncryptionKey();
    const payload = trimmed.slice(PREFIX.length);
    const parts = payload.split(":");

    if (parts.length !== 3) {
      console.warn("Invalid encrypted token format. Returning raw token.");
      return trimmed;
    }

    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error: any) {
    console.error("Decryption error:", error.message || error);
    return null;
  }
}

/**
 * Returns a masked version of a token for safe UI display (e.g. "EAA...last4").
 * The full token is NEVER returned to the browser.
 */
export function maskToken(rawOrEncryptedToken: string | null | undefined): string {
  if (!rawOrEncryptedToken || rawOrEncryptedToken.trim() === "") {
    return "";
  }

  const plain = decryptToken(rawOrEncryptedToken);
  if (!plain || plain.length < 8) {
    return "••••••••";
  }

  const last4 = plain.slice(-4);
  const prefix = plain.startsWith("EAA") ? "EAA" : "••••";
  return `${prefix}...${last4}`;
}
