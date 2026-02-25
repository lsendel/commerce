import { PBKDF2_ITERATIONS, PBKDF2_HASH, SALT_LENGTH } from "../../shared/constants";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    256
  );

  const saltBase64 = arrayBufferToBase64(salt.buffer);
  const hashBase64 = arrayBufferToBase64(hash);
  return `${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltBase64, storedHashBase64] = stored.split(":");
  if (!saltBase64 || !storedHashBase64) return false;

  const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    256
  );

  // Constant-time comparison
  const storedHash = new Uint8Array(base64ToArrayBuffer(storedHashBase64));
  const computedHash = new Uint8Array(hash);
  if (storedHash.length !== computedHash.length) return false;

  let diff = 0;
  for (let i = 0; i < storedHash.length; i++) {
    diff |= storedHash[i] ^ computedHash[i];
  }
  return diff === 0;
}
