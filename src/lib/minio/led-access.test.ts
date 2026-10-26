import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Client } from "minio";

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
  it("proxies through Next.js when no public domain is configured", async () => {
    const access = await resolveLedImageAccess("2026/SE161956.webp", {
      env,
      now: 1_000,
    });
    assert.equal(access?.url.startsWith("/api/led-image?token="), true);
    assert.equal(access?.url.includes("127.0.0.1"), false);
    assert.equal(access?.expiresAt, 1_000 + LED_URL_TTL_SECONDS * 1000);
    const token = new URL(access!.url, "http://lookup.local").searchParams.get("token");
    assert.equal(readLedViewToken(token ?? "", env, 1_000)?.objectKey, "2026/SE161956.webp");
  });

  it("keeps a presigned url signed for the public host", async () => {
    const signed =
      "https://images.example.com/led-images/2026/SE161956.webp?X-Amz-Expires=600";
    const access = await resolveLedImageAccess("2026/SE161956.webp", {
      env: { ...env, MINIO_PUBLIC_ENDPOINT: "https://images.example.com" },
      now: 5_000,
      signPublicUrl: async (endpoint, objectKey, expiresSeconds) => {
        assert.equal(endpoint.endPoint, "images.example.com");
        assert.equal(endpoint.useSSL, true);
        assert.equal(objectKey, "2026/SE161956.webp");
        assert.equal(expiresSeconds, 600);
        return signed;
      },
    });
    assert.equal(access?.url, signed);
  });

  it("does not rewrite a signature that was made for another host", async () => {
    const access = await resolveLedImageAccess("SE161956.png", {
      env: { ...env, MINIO_PUBLIC_ENDPOINT: "https://images.example.com" },
      now: 5_000,
      signPublicUrl: async () =>
        "http://127.0.0.1:9000/led-images/SE161956.png?X-Amz-Signature=abc",
    });
    assert.equal(access?.url.includes("127.0.0.1"), false);
    assert.equal(access?.url.startsWith("/api/led-image?token="), true);
  });

  it("rejects an expired or altered view token", () => {
    const issued = issueLedViewToken("2026/SE161956.webp", env, 10_000);
    assert.ok(issued);
    assert.equal(readLedViewToken(issued.token, env, issued.expiresAt), null);
    assert.equal(readLedViewToken(`${issued.token}x`, env, 10_000), null);
  });

  it("signs the MinIO url with the public endpoint host", async () => {
    const client = new Client({
      endPoint: "images.example.com",
      port: 443,
      useSSL: true,
      accessKey: "access",
      secretKey: "secret",
      region: "us-east-1",
    });
    const url = await client.presignedGetObject("led-images", "2026/SE161956.webp", 600);
    const parsed = new URL(url);
    assert.equal(parsed.protocol, "https:");
    assert.equal(parsed.hostname, "images.example.com");
    assert.equal(parsed.searchParams.get("X-Amz-Expires"), "600");
    assert.equal(parsed.pathname.endsWith("2026/SE161956.webp"), true);
  });
});
