import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { maskEmail } from "@/lib/email";
import { isSafeLedPath } from "@/lib/security/led-path";
import { parseStudentCode, STUDENT_CODE_PATTERN } from "@/lib/validators/student";

const validCodes = [
  "HE123456",
  "QE123456",
  "QA123456",
  "DS123456",
  "CS987654",
  "SS000001",
];

const invalidCodes = [
  "XE123456",
  "HH123456",
  "HE12345",
  "HE1234567",
  "HEABCDEF",
  "12345678",
];

describe("student code", () => {
  for (const code of validCodes) {
    it(`accepts ${code}`, () => {
      assert.equal(parseStudentCode(code).ok, true);
      assert.equal(STUDENT_CODE_PATTERN.test(code), true);
    });
  }

  for (const code of invalidCodes) {
    it(`rejects ${code}`, () => {
      const result = parseStudentCode(code);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "format");
    });
  }

  it("uppercases and trims before validation", () => {
    const result = parseStudentCode("  he123456  ");
    assert.deepEqual(result, { ok: true, code: "HE123456" });
  });

  it("reports an empty value separately from a bad format", () => {
    assert.deepEqual(parseStudentCode("   "), { ok: false, reason: "empty" });
    assert.deepEqual(parseStudentCode(12), { ok: false, reason: "type" });
  });
});

describe("email masking", () => {
  it("keeps one local character and the domain", () => {
    assert.equal(maskEmail("an.demo@example.edu"), "a******@example.edu");
  });

  it("does not return the original address", () => {
    const masked = maskEmail("student.name@fpt.edu.vn");
    assert.equal(masked.includes("student.name"), false);
    assert.match(masked, /@fpt\.edu\.vn$/);
  });
});

describe("led path", () => {
  it("allows a storage object path and rejects urls or traversal", () => {
    assert.equal(isSafeLedPath("2026/HE123456.jpg"), true);
    assert.equal(isSafeLedPath("../secret.jpg"), false);
    assert.equal(isSafeLedPath("/etc/passwd"), false);
    assert.equal(isSafeLedPath("https://example.com/a.jpg"), false);
    assert.equal(isSafeLedPath("demo:led"), false);
  });
});
