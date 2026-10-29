import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { copy } from "@/lib/copy";
import type { LookupDependencies } from "@/lib/lookup/perform-lookup";
import { lookupResponse, performLookup } from "@/lib/lookup/perform-lookup";
import type { StudentRow } from "@/lib/types/student";

const student: StudentRow = {
  student_code: "HE123456",
  full_name: "Nguyễn An",
  email: "an.nguyen@fpt.edu.vn",
  seat_tcn: "A-12",
  seat_ph2: null,
  checkin_time: " 07:00 ",
  checkin_room: " P.101 ",
  award_time: " 08:30 ",
  contact_group: " https://example.com/nhom-lien-lac-01 ",
  invitation_link: " https://example.com/thu-moi/HE123456 ",
  drive_link: null,
  led_image_key: "HE123456.jpg",
  session_label: "Đợt 1",
};

function deps(overrides: Partial<LookupDependencies> = {}): LookupDependencies {
  return {
    source: "postgres",
    emailMode: "masked",
    clientKey: "hashed-ip",
    remoteIp: "203.0.113.10",
    turnstileRequired: false,
    verifyTurnstile: async () => true,
    rateLimit: async () => ({ allowed: true, remaining: 7, retryAfterSeconds: 0 }),
    findStudent: async () => student,
    signLedImage: async () => ({
      status: "ready",
      url: "https://images.example/signed?id=opaque",
      expiresAt: 1_700_000_000_000,
    }),
    ...overrides,
  };
}

function post(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/students/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

describe("performLookup", () => {
  it("returns a masked student and a signed led image", async () => {
    const outcome = await performLookup(post({ studentCode: " he123456 " }), deps());
    assert.equal(outcome.status, 200);
    assert.equal(outcome.body.ok, true);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.studentCode, "HE123456");
    assert.equal(outcome.body.student.email, "a******@fpt.edu.vn");
    assert.equal(outcome.body.student.emailRevealable, false);
    assert.equal(outcome.body.student.emailShown, true);
    assert.equal(outcome.body.student.seatTcn, "A-12");
    assert.equal(outcome.body.student.seatPh2, null);
    assert.equal(outcome.body.student.checkinTime, "07:00");
    assert.equal(outcome.body.student.checkinRoom, "P.101");
    assert.equal(outcome.body.student.awardTime, "08:30");
    assert.equal(
      outcome.body.student.contactGroup,
      "https://example.com/nhom-lien-lac-01",
    );
    assert.equal(
      outcome.body.student.invitationLink,
      "https://example.com/thu-moi/HE123456",
    );
    assert.equal(outcome.body.student.ledImageStatus, "ready");
    assert.equal(outcome.body.student.ledImageExpiresAt, 1_700_000_000_000);
    assert.equal(JSON.stringify(outcome.body).includes("HE123456.jpg"), false);
    assert.equal(outcome.body.student.demo, false);
    assert.equal(JSON.stringify(outcome.body).includes("an.nguyen@fpt.edu.vn"), false);
  });

  it("returns the full email only when configured", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({ emailMode: "full" }),
    );
    assert.equal(outcome.body.ok, true);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.email, "an.nguyen@fpt.edu.vn");
    assert.equal(outcome.body.student.emailRevealable, true);
    assert.equal(outcome.body.student.emailShown, true);
  });

  it("omits email entirely when mode is hidden", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({ emailMode: "hidden" }),
    );
    assert.equal(outcome.body.ok, true);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.email, null);
    assert.equal(outcome.body.student.emailRevealable, false);
    assert.equal(outcome.body.student.emailShown, false);
    assert.equal(JSON.stringify(outcome.body).includes("an.nguyen@fpt.edu.vn"), false);
    assert.equal(JSON.stringify(outcome.body).includes("fpt.edu.vn"), false);
  });

  it("returns 404 when the repository has no row", async () => {
    const outcome = await performLookup(
      post({ studentCode: "QE123456" }),
      deps({ findStudent: async () => null }),
    );
    assert.equal(outcome.status, 404);
    assert.equal(outcome.body.ok, false);
    if (outcome.body.ok) return;
    assert.equal(outcome.body.error.message, copy.notFound);
  });

  it("rejects a bad code before calling the database", async () => {
    let called = false;
    const outcome = await performLookup(
      post({ studentCode: "XE123456" }),
      deps({
        findStudent: async () => {
          called = true;
          return null;
        },
      }),
    );
    assert.equal(outcome.status, 400);
    assert.equal(called, false);
  });

  it("rejects an empty code and malformed json", async () => {
    const empty = await performLookup(post({ studentCode: "  " }), deps());
    assert.equal(empty.status, 400);
    const broken = await performLookup(post("{", true), deps());
    assert.equal(broken.status, 400);
    const extra = await performLookup(
      post({ studentCode: "HE123456", extra: true }),
      deps(),
    );
    assert.equal(extra.status, 400);
  });

  it("returns 429 when the quota is exhausted", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        rateLimit: async () => ({ allowed: false, remaining: 0, retryAfterSeconds: 42 }),
      }),
    );
    assert.equal(outcome.status, 429);
    const response = lookupResponse(outcome);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("retry-after"), "42");
  });

  it("returns 500 when the database or quota store fails", async () => {
    const database = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        findStudent: async () => {
          throw new Error("relation students does not exist, email=hidden");
        },
      }),
    );
    assert.equal(database.status, 500);
    assert.equal(database.body.ok, false);
    if (!database.body.ok) {
      assert.equal(database.body.error.message, copy.server);
      assert.equal(JSON.stringify(database.body).includes("email"), false);
    }

    const quota = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        rateLimit: async () => {
          throw new Error("quota down");
        },
      }),
    );
    assert.equal(quota.status, 500);
  });

  it("does not serve demo rows when production is not configured", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE260001" }),
      deps({ source: "unconfigured", findStudent: async () => student }),
    );
    assert.equal(outcome.status, 500);
    assert.equal(outcome.body.ok, false);
    if (!outcome.body.ok) assert.equal(outcome.body.error.code, "UNAVAILABLE");
  });

  it("returns an openable link when the led value is an http address", async () => {
    let signed = false;
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        findStudent: async () => ({
          ...student,
          led_image_key: " https://cdn.example/a.jpg ",
        }),
        signLedImage: async () => {
          signed = true;
          return { status: "missing" };
        },
      }),
    );
    assert.equal(outcome.status, 200);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.ledExternalUrl, "https://cdn.example/a.jpg");
    assert.equal(outcome.body.student.ledImageUrl, null);
    assert.equal(outcome.body.student.ledImageStatus, "missing");
    assert.equal(signed, false);
  });

  it("marks an unsafe led path as unavailable and still returns the student", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        findStudent: async () => ({ ...student, led_image_key: "javascript:alert(1)" }),
      }),
    );
    assert.equal(outcome.status, 200);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.ledExternalUrl, null);
    assert.equal(outcome.body.student.ledImageStatus, "unavailable");
    assert.equal(outcome.body.student.ledImageUrl, null);
  });

  it("does not expose an unsafe invitation link", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({
        findStudent: async () => ({
          ...student,
          invitation_link: "javascript:alert(1)",
        }),
      }),
    );
    assert.equal(outcome.status, 200);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.invitationLink, null);
  });

  it("marks a database key missing from object storage as updating", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({ signLedImage: async () => ({ status: "missing" }) }),
    );
    assert.equal(outcome.status, 200);
    if (!outcome.body.ok) return;
    assert.equal(outcome.body.student.ledImageStatus, "missing");
    assert.equal(outcome.body.student.ledImageUrl, null);
    assert.equal(outcome.body.student.ledImageExpiresAt, null);
  });

  it("requires turnstile when the dependency says so", async () => {
    const outcome = await performLookup(
      post({ studentCode: "HE123456" }),
      deps({ turnstileRequired: true, verifyTurnstile: async () => false }),
    );
    assert.equal(outcome.status, 400);
    assert.equal(outcome.body.ok, false);
    if (!outcome.body.ok) assert.equal(outcome.body.error.code, "TURNSTILE_FAILED");
  });
});

describe("migration contract", () => {
  const sql = readFileSync(
    new URL("../../../prisma/migrations/20261025120000_init/migration.sql", import.meta.url),
    "utf8",
  );

  it("creates the lookup tables and checks the student code", () => {
    assert.match(sql, /CREATE TABLE "students"/);
    assert.match(sql, /CREATE TABLE "lookup_rate_limits"/);
    assert.match(sql, /"student_code" ~ '\^\[HQDSC\]\[EAS\]\[0-9\]\{6\}\$'/);
    assert.match(sql, /students_student_code_key/);
    assert.equal(/supabase/i.test(sql), false);
  });

  it("allows five-digit codes when the first digit is 5–9", () => {
    const shortCode = readFileSync(
      new URL(
        "../../../prisma/migrations/20261027110000_allow_short_student_code/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(
      shortCode,
      /"student_code" ~ '\^\[HQDSC\]\[EAS\]\(\[0-9\]\{6\}\|\[5-9\]\[0-9\]\{4\}\)\$'/,
    );
  });

  it("renames the led object column without storing signed urls", () => {
    const rename = readFileSync(
      new URL(
        "../../../prisma/migrations/20261025140000_rename_led_image_key/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(rename, /RENAME COLUMN "led_image_path" TO "led_image_key"/);
    assert.equal(/presign|http/i.test(rename), false);
  });

  it("replaces obsolete check-in columns without losing room data", () => {
    const ceremonyDetails = readFileSync(
      new URL(
        "../../../prisma/migrations/20261026110000_update_ceremony_details/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(
      ceremonyDetails,
      /RENAME COLUMN "checkin_waiting_room" TO "checkin_room"/,
    );
    assert.match(ceremonyDetails, /DROP COLUMN "checkin_zone"/);
    assert.match(ceremonyDetails, /ADD COLUMN "checkin_time" TEXT/);
    assert.match(ceremonyDetails, /ADD COLUMN "contact_group" TEXT/);
  });

  it("adds the diploma presentation time", () => {
    const awardTime = readFileSync(
      new URL(
        "../../../prisma/migrations/20261026123000_add_award_time/migration.sql",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(awardTime, /ADD COLUMN "award_time" TEXT/);
  });
});
