/**
 * Cryptographic utilities for Teacher App authentication.
 * Uses the Web Crypto API (supported natively in modern browsers and Node.js).
 * Never stores, logs, or returns plain PINs or plain activation codes.
 */

/**
 * Normalizes an activation code by removing dashes, whitespace, and uppercasing.
 * e.g., "sch - 7890" -> "SCH7890"
 */
export function normalizeActivationCode(code: string): string {
  return code.replace(/[\s\-_]/g, '').toUpperCase().trim();
}

/**
 * Computes a SHA-256 hash of a string using Web Crypto.
 */
async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes an activation code using SHA-256.
 * The code is normalized first so whitespace/dashes do not cause false mismatches.
 */
export async function hashActivationCode(code: string): Promise<string> {
  const normalized = normalizeActivationCode(code);
  return sha256Hex(`act_code_v1:${normalized}`);
}

/**
 * Hashes a 4-digit PIN with a salt (e.g. teacherId) using SHA-256.
 * Salt prevents precomputed rainbow-table attacks against 4-digit numeric PINs.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const cleanPin = pin.trim();
  return sha256Hex(`pin_v1:${salt}:${cleanPin}`);
}

/**
 * Verifies a PIN against a stored hash.
 */
export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !pin) return false;
  const computed = await hashPin(pin, salt);
  return computed.toLowerCase() === storedHash.toLowerCase();
}
