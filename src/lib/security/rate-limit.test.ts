import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientAddress,
  consumeMemoryQuota,
  hashRateLimitKey,
  resetMemoryRateLimits,
} from "@/lib/security/rate-limit";

describe("memory rate limit", () => {
  it("blocks the request after the limit inside one window", () => {
    resetMemoryRateLimits();
    const start = 1_000_000;
    for (let count = 1; count <= 3; count += 1) {
      const decision = consumeMemoryQuota("ip", 3, 60_000, start);
      assert.equal(decision.allowed, true);
    }

    const blocked = consumeMemoryQuota("ip", 3, 60_000, start + 1_000);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 59);
  });

  it("opens a new window after the previous one expires", () => {
    resetMemoryRateLimits();
    consumeMemoryQuota("ip", 1, 60_000, 0);
    const next = consumeMemoryQuota("ip", 1, 60_000, 60_000);
    assert.equal(next.allowed, true);
    assert.equal(next.remaining, 0);
  });

  it("keeps lookup and LED refresh quotas in separate buckets", () => {
    const address = "203.0.113.10";
    assert.notEqual(
      hashRateLimitKey(address, "lookup"),
      hashRateLimitKey(address, "led-image-refresh"),
    );
    assert.equal(
      hashRateLimitKey(address),
      hashRateLimitKey(address, "lookup"),
    );
  });

  it("ignores a spoofed forwarding header unless the proxy is trusted", () => {
    const previous = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    const request = new Request("http://localhost/api/students/lookup", {
      headers: { "x-forwarded-for": "203.0.113.8, 198.51.100.4" },
    });
    assert.equal(clientAddress(request), "unknown");

    process.env.TRUST_PROXY = "true";
    assert.equal(clientAddress(request), "198.51.100.4");

    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  });
});
