const CURVE = "P-256" as const;
const INFO = new TextEncoder().encode("convocation-lookup-v1");

export type SealedEnvelope = {
  v: 1;
  serverKey: string;
  iv: string;
  ct: string;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

async function importClientPublicKey(spkiBase64Url: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    asBufferSource(base64UrlToBytes(spkiBase64Url)),
    { name: "ECDH", namedCurve: CURVE },
    false,
    [],
  );
}

async function deriveAesKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey("raw", shared, "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: INFO },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createClientKeyPair(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
}> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: CURVE },
    true,
    ["deriveBits"],
  );
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return {
    publicKey: bytesToBase64Url(new Uint8Array(spki)),
    privateKey: pair.privateKey,
  };
}

export async function sealJson(
  value: unknown,
  clientPublicKey: string,
): Promise<SealedEnvelope> {
  const theirKey = await importClientPublicKey(clientPublicKey);
  const serverPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: CURVE },
    true,
    ["deriveBits"],
  );
  const aesKey = await deriveAesKey(serverPair.privateKey, theirKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    plaintext,
  );
  const serverSpki = await crypto.subtle.exportKey("spki", serverPair.publicKey);

  return {
    v: 1,
    serverKey: bytesToBase64Url(new Uint8Array(serverSpki)),
    iv: bytesToBase64Url(iv),
    ct: bytesToBase64Url(new Uint8Array(ciphertext)),
  };
}

export async function openSealedJson<T>(
  envelope: SealedEnvelope,
  clientPrivateKey: CryptoKey,
): Promise<T> {
  if (envelope.v !== 1) {
    throw new Error("unsupported_sealed_payload");
  }

  const serverKey = await crypto.subtle.importKey(
    "spki",
    asBufferSource(base64UrlToBytes(envelope.serverKey)),
    { name: "ECDH", namedCurve: CURVE },
    false,
    [],
  );
  const aesKey = await deriveAesKey(clientPrivateKey, serverKey);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(base64UrlToBytes(envelope.iv)) },
    aesKey,
    asBufferSource(base64UrlToBytes(envelope.ct)),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export function isSealedEnvelope(value: unknown): value is SealedEnvelope {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<SealedEnvelope>;
  return (
    envelope.v === 1 &&
    typeof envelope.serverKey === "string" &&
    typeof envelope.iv === "string" &&
    typeof envelope.ct === "string"
  );
}
