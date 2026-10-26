import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { POST } from "@/app/api/students/lookup/route";
import { copy } from "@/lib/copy";
import { resetMemoryRateLimits } from "@/lib/security/rate-limit";

function post(body: unknown): Request {
  return new Request("http://localhost/api/students/lookup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "198.51.100.20",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/students/lookup", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.PUBLIC_EMAIL_MODE;
    process.env.LOOKUP_RATE_LIMIT = "100";
    resetMemoryRateLimits();
  });

  it("returns labeled demo data with an email that the UI can reveal", async () => {
    const response = await POST(post({ studentCode: "he260001" }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.student.demo, true);
    assert.equal(body.student.fullName, "Nguyễn An Demo");
    assert.equal(body.student.seatTcn, "A-128");
    assert.equal(body.student.seatPh2, "B-014");
    assert.equal(body.student.checkinWaitingRoom, "Phòng 101");
    assert.equal(body.student.ledImageStatus, "ready");
    assert.equal(body.student.email, "an.demo@example.edu");
    assert.equal(body.student.emailRevealable, true);
  });

  it("returns not found for a valid code outside the demo set", async () => {
    const response = await POST(post({ studentCode: "HE123456" }));
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error.message, copy.notFound);
  });

  it("returns 400 for an invalid code without a demo record", async () => {
    const response = await POST(post({ studentCode: "XE123456" }));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "INVALID_STUDENT_CODE");
  });

  it("returns an empty profile without inventing missing fields", async () => {
    const response = await POST(post({ studentCode: "SS260007" }));
    const body = await response.json();
    assert.equal(body.student.seatTcn, null);
    assert.equal(body.student.checkinWaitingRoom, null);
    assert.equal(body.student.email, null);
    assert.equal(body.student.emailRevealable, false);
    assert.equal(body.student.ledImageStatus, "missing");
    assert.equal(body.student.sessionLabel, null);
  });
});
