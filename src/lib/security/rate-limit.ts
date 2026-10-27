import { createHash } from "node:crypto";

import { readRateLimitConfig } from "@/lib/config";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitScope = "lookup" | "led-image-refresh";

type Bucket = { start: number; count: number };

const buckets = new Map<string, Bucket>();

export function resetMemoryRateLimits(): void {
  buckets.clear();
}

export function consumeMemoryQuota(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitDecision {
  const current = buckets.get(key);
  if (!current || now - current.start >= windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.start + windowMs - now) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfterSeconds: 0,
  };
}

export function hashRateLimitKey(
  address: string,
  scope: RateLimitScope = "lookup",
): string {
  const configured = process.env.RATE_LIMIT_SALT?.trim();
  const salt =
    configured && configured !== "development-salt"
      ? configured
      : process.env.NODE_ENV === "production"
        ? null
        : "development-salt";
  if (!salt) {
    throw new Error("RATE_LIMIT_SALT must be set to a unique value in production");
  }
  return createHash("sha256")
    .update(`${salt}:${scope}:${address}`)
    .digest("hex");
}

export function clientAddress(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY?.trim().toLowerCase();
  if (trustProxy !== "true" && trustProxy !== "1") return "unknown";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);
    if (last) return last;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export async function consumeRequestQuota(key: string): Promise<RateLimitDecision> {
  const { limit, windowSeconds } = readRateLimitConfig();
  return consumeMemoryQuota(key, limit, windowSeconds * 1000, Date.now());
}
