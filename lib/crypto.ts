"use client";

// Password-based encryption for the local file. AES-256-GCM with a key
// derived via PBKDF2. The password itself is never stored anywhere — only
// the derived CryptoKey is held in memory for the current session, and it
// disappears the moment the tab closes or the user locks the app.

const PBKDF2_ITERATIONS = 210_000;

export interface EncryptedEnvelope {
  v: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptWithKey(data: unknown, key: CryptoKey, saltB64: string): Promise<EncryptedEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { v: 1, salt: saltB64, iv: toBase64(iv.buffer), ciphertext: toBase64(ciphertext) };
}

export async function newEnvelopeAndKey(
  data: unknown,
  password: string
): Promise<{ envelope: EncryptedEnvelope; key: CryptoKey; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes.buffer);
  const key = await deriveKey(password, saltBytes);
  const envelope = await encryptWithKey(data, key, salt);
  return { envelope, key, salt };
}

export async function unlockEnvelope<T>(
  envelope: EncryptedEnvelope,
  password: string
): Promise<{ data: T; key: CryptoKey; salt: string } | null> {
  try {
    const saltBytes = fromBase64(envelope.salt);
    const key = await deriveKey(password, saltBytes);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ciphertext);
    const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const data = JSON.parse(new TextDecoder().decode(plaintextBuf)) as T;
    return { data, key, salt: envelope.salt };
  } catch {
    // Wrong password, or the file is corrupted — AES-GCM's authentication
    // tag makes these indistinguishable, which is the correct behaviour:
    // never reveal which one it was.
    return null;
  }
}

export function isEncryptedEnvelope(obj: any): obj is EncryptedEnvelope {
  return !!obj && obj.v === 1 && typeof obj.salt === "string" && typeof obj.iv === "string" && typeof obj.ciphertext === "string";
}
