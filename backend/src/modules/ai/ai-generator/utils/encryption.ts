import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

/**
 * Helper to derive 32-byte AES key from env secret.
 *
 * If envKey is already 32 bytes when interpreted as raw bytes, it will be used (base64/hex or string).
 * For convenience we derive a 32-byte key from the provided string using scrypt if needed.
 */
export function deriveKey(envKey: string | undefined): Buffer {
  const secret = envKey ?? '';
  // If secret looks like base64 and decodes to 32 bytes, use it
  try {
    const buf = Buffer.from(secret, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    // ignore
  }
  // else scrypt derive
  return scryptSync(secret, 'ai-salt', 32) as Buffer;
}

/**
 * Encrypt a JSON-serializable object (raw). Returns object { iv, tag, ciphertext } (all base64).
 */
export function encryptJson(obj: any, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

/**
 * Decrypt structure produced by encryptJson.
 */
export function decryptJson(
  payload: { iv: string; tag: string; ciphertext: string },
  key: Buffer
) {
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}
