import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveInternalEndpoint,
  resolvePublicEndpoint,
} from "@/lib/minio/endpoint";
import {
  LED_URL_TTL_SECONDS,
  issueLedViewToken,
  readLedViewToken,
  resolveLedImageAccess,
} from "@/lib/minio/led-access";

const env = {
  MINIO_ACCESS_KEY: "access",
  MINIO_SECRET_KEY: "secret",
  MINIO_BUCKET: "led-images",
  RATE_LIMIT_SALT: "test-salt",
};

describe("minio endpoints", () => {
  it("uses loopback on the host and the compose service name in Docker", () => {
    const host = resolveInternalEndpoint(
      { MINIO_ENDPOINT: "127.0.0.1", MINIO_PORT: "9000", MINIO_USE_SSL: "false" },
      false,
    );
    assert.deepEqual(host, { endPoint: "127.0.0.1", port: 9000, useSSL: false });

    const docker = resolveInternalEndpoint(
      { MINIO_ENDPOINT: "127.0.0.1", MINIO_PORT: "9000" },
      true,
    );
    assert.equal(docker?.endPoint, "minio");
    assert.equal(docker?.useSSL, false);
  });

  it("accepts only a public https host", () => {
    assert.equal(resolvePublicEndpoint({}), null);
    assert.equal(resolvePublicEndpoint({ MINIO_PUBLIC_ENDPOINT: "http://images.example.com" }), null);
    assert.equal(resolvePublicEndpoint({ MINIO_PUBLIC_ENDPOINT: "https://127.0.0.1" }), null);
    assert.deepEqual(resolvePublicEndpoint({ MINIO_PUBLIC_ENDPOINT: "https://images.example.com" }), {
      endPoint: "images.example.com",
      port: 443,
      useSSL: true,
    });
  });
});

describe("led image access", () => {
  it("proxies through Next.js instead of exposing MinIO signatures", async () => {
    const access = await resolveLedImageAccess("2026/SE161956.webp", {
      env,
      now: 1_000,
    });
    assert.equal(access?.url.startsWith("/api/led-image?token="), true);
    assert.equal(access?.url.includes("X-Amz-"), false);
    assert.equal(access?.url.includes("127.0.0.1"), false);
    assert.equal(access?.expiresAt, 1_000 + LED_URL_TTL_SECONDS * 1000);
    const token = new URL(access!.url, "http://lookup.local").searchParams.get("token");
    assert.equal(readLedViewToken(token ?? "", env, 1_000)?.objectKey, "2026/SE161956.webp");
  });

  it("still proxies when a public MinIO host is configured", async () => {
    const access = await resolveLedImageAccess("SE161956.png", {
      env: { ...env, MINIO_PUBLIC_ENDPOINT: "https://images.example.com" },
      now: 5_000,
    });
    assert.equal(access?.url.startsWith("/api/led-image?token="), true);
    assert.equal(access?.url.includes("images.example.com"), false);
    assert.equal(access?.url.includes("X-Amz-"), false);
  });

  it("rejects an expired or altered view token", () => {
    const issued = issueLedViewToken("2026/SE161956.webp", env, 10_000);
    assert.ok(issued);
    assert.equal(readLedViewToken(issued.token, env, issued.expiresAt), null);
    assert.equal(readLedViewToken(`${issued.token}x`, env, 10_000), null);
  });

  it("does not sign a view token with the shared development salt", () => {
    assert.equal(
      issueLedViewToken("2026/SE161956.webp", { ...env, RATE_LIMIT_SALT: "development-salt" }, 10_000),
      null,
    );
  });
});
