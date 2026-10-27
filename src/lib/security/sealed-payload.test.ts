import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createClientKeyPair,
  isSealedEnvelope,
  openSealedJson,
  sealJson,
} from "@/lib/security/sealed-payload";

describe("sealed payload", () => {
  it("round-trips JSON through ECDH + AES-GCM", async () => {
    const channel = await createClientKeyPair();
    const payload = {
      ok: true as const,
      student: { fullName: "Hồ Chí Trung", studentCode: "SE161956" },
    };
    const sealed = await sealJson(payload, channel.publicKey);
    assert.equal(isSealedEnvelope(sealed), true);
    assert.equal(JSON.stringify(sealed).includes("Hồ Chí Trung"), false);
    assert.equal(JSON.stringify(sealed).includes("SE161956"), false);

    const opened = await openSealedJson<typeof payload>(
      sealed,
      channel.privateKey,
    );
    assert.deepEqual(opened, payload);
  });

  it("rejects envelopes sealed for another client key", async () => {
    const alice = await createClientKeyPair();
    const bob = await createClientKeyPair();
    const sealed = await sealJson({ secret: true }, alice.publicKey);
    await assert.rejects(() => openSealedJson(sealed, bob.privateKey));
  });
});
