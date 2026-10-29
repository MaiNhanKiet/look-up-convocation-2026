import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isMaintenanceMode,
  parseMaintenanceReopenAt,
  readCorrectionFormUrl,
  readEmailMode,
} from "@/lib/config";
import { remainingUntil } from "@/lib/maintenance-clock";

const originalMaintenance = process.env.MAINTENANCE_MODE;
const originalFormUrl = process.env.CORRECTION_FORM_URL;
const originalEmailMode = process.env.PUBLIC_EMAIL_MODE;

afterEach(() => {
  restore("MAINTENANCE_MODE", originalMaintenance);
  restore("CORRECTION_FORM_URL", originalFormUrl);
  restore("PUBLIC_EMAIL_MODE", originalEmailMode);
});

function restore(
  key: "MAINTENANCE_MODE" | "CORRECTION_FORM_URL" | "PUBLIC_EMAIL_MODE",
  value: string | undefined,
) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("site mode", () => {
  it("keeps the lookup page unless maintenance is explicitly on", () => {
    delete process.env.MAINTENANCE_MODE;
    assert.equal(isMaintenanceMode(), false);
    for (const value of ["true", "TRUE", "1", "yes"]) {
      process.env.MAINTENANCE_MODE = value;
      assert.equal(isMaintenanceMode(), true);
    }
    process.env.MAINTENANCE_MODE = "false";
    assert.equal(isMaintenanceMode(), false);
  });

  it("reads PUBLIC_EMAIL_MODE including hidden", () => {
    delete process.env.PUBLIC_EMAIL_MODE;
    assert.equal(readEmailMode(), "full");
    process.env.PUBLIC_EMAIL_MODE = "masked";
    assert.equal(readEmailMode(), "masked");
    process.env.PUBLIC_EMAIL_MODE = "HIDDEN";
    assert.equal(readEmailMode(), "hidden");
    process.env.PUBLIC_EMAIL_MODE = "full";
    assert.equal(readEmailMode(), "full");
  });

  it("accepts only http and https form links", () => {
    delete process.env.CORRECTION_FORM_URL;
    assert.equal(readCorrectionFormUrl(), null);
    process.env.CORRECTION_FORM_URL = "https://forms.example/sua";
    assert.equal(readCorrectionFormUrl(), "https://forms.example/sua");
    process.env.CORRECTION_FORM_URL = "javascript:alert(1)";
    assert.equal(readCorrectionFormUrl(), null);
    process.env.CORRECTION_FORM_URL = "not a url";
    assert.equal(readCorrectionFormUrl(), null);
  });

  it("reads a reopen moment as 13:00 in Ho Chi Minh City", () => {
    const reopenAt = parseMaintenanceReopenAt("13-25-10-2026");
    assert.equal(reopenAt, Date.UTC(2026, 9, 25, 6, 0, 0));
    assert.equal(parseMaintenanceReopenAt("00-01-01-2026"), Date.UTC(2025, 11, 31, 17, 0, 0));
    assert.equal(parseMaintenanceReopenAt("24-25-10-2026"), null);
    assert.equal(parseMaintenanceReopenAt("13-31-02-2026"), null);
    assert.equal(parseMaintenanceReopenAt("13-25-13-2026"), null);
    assert.equal(parseMaintenanceReopenAt("9-25-10-2026"), null);
    assert.equal(parseMaintenanceReopenAt(""), null);
  });

  it("counts down to the reopen moment and stays at zero afterwards", () => {
    const target = Date.UTC(2026, 9, 25, 6, 0, 0);
    assert.deepEqual(remainingUntil(target, target - 90_000), {
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: 30,
    });
    assert.deepEqual(remainingUntil(target, target), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    assert.deepEqual(remainingUntil(target, target + 5_000), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    assert.deepEqual(remainingUntil(null, target), {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    const twoDays = target - (2 * 86_400 + 3 * 3_600 + 4 * 60 + 5) * 1000;
    assert.deepEqual(remainingUntil(target, twoDays), {
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });
});
