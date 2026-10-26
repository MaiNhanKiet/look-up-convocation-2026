import { createHmac, timingSafeEqual } from "node:crypto";

import {
  hasMinioCredentials,
  resolvePublicEndpoint,
  type MinioEndpoint,
  type MinioEnv,
} from "@/lib/minio/endpoint";
import { isSafeLedPath } from "@/lib/security/led-path";

export const LED_URL_TTL_SECONDS = 600;

const TOKEN_VERSION = "v1";

export type LedImageAccess = {
  url: string;
  expiresAt: number;
};

type LedTokenClaims = {
  objectKey: string;
  expiresAt: number;
};

function tokenSecret(env: MinioEnv): string | null {
  const secret = env.RATE_LIMIT_SALT?.trim();
  return secret || null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueLedViewToken(
  objectKey: string,
  env: MinioEnv,
  now: number,
): { token: string; expiresAt: number } | null {
  const secret = tokenSecret(env);
  if (!secret || !isSafeLedPath(objectKey)) return null;

  const expiresAt = now + LED_URL_TTL_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ v: TOKEN_VERSION, k: objectKey, e: expiresAt }),
    "utf8",
  ).toString("base64url");

  return { token: `${payload}.${signPayload(payload, secret)}`, expiresAt };
}

export function readLedViewToken(
  token: string,
  env: MinioEnv,
  now: number,
): LedTokenClaims | null {
  const secret = tokenSecret(env);
  const separator = token.lastIndexOf(".");
  if (!secret || separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = signPayload(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { v?: unknown; k?: unknown; e?: unknown };
    if (
      parsed.v !== TOKEN_VERSION ||
      typeof parsed.k !== "string" ||
      typeof parsed.e !== "number" ||
      !Number.isFinite(parsed.e) ||
      parsed.e <= now ||
      !isSafeLedPath(parsed.k)
    ) {
      return null;
    }
    return { objectKey: parsed.k, expiresAt: parsed.e };
  } catch {
    return null;
  }
}

function signedHostMatches(url: string, endpoint: MinioEndpoint): boolean {
  try {
    const parsed = new URL(url);
    const expectedPort = endpoint.port === 443 ? "" : String(endpoint.port);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === endpoint.endPoint &&
      parsed.port === expectedPort
    );
  } catch {
    return false;
  }
}

export async function resolveLedImageAccess(
  objectKey: string,
  options: {
    env: MinioEnv;
    now: number;
    signPublicUrl?: (
      endpoint: MinioEndpoint,
      objectKey: string,
      expiresSeconds: number,
    ) => Promise<string>;
  },
): Promise<LedImageAccess | null> {
  if (!hasMinioCredentials(options.env) || !isSafeLedPath(objectKey)) return null;

  const publicEndpoint = resolvePublicEndpoint(options.env);
  if (publicEndpoint && options.signPublicUrl) {
    const signed = await options.signPublicUrl(
      publicEndpoint,
      objectKey,
      LED_URL_TTL_SECONDS,
    );
    if (signedHostMatches(signed, publicEndpoint)) {
      return {
        url: signed,
        expiresAt: options.now + LED_URL_TTL_SECONDS * 1000,
      };
    }
  }

  const issued = issueLedViewToken(objectKey, options.env, options.now);
  if (!issued) return null;
  return {
    url: `/api/led-image?token=${encodeURIComponent(issued.token)}`,
    expiresAt: issued.expiresAt,
  };
}
