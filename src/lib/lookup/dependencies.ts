import { readEmailMode, resolveDataSource } from "@/lib/config";
import { findDemoStudent, signDemoLed } from "@/lib/demo/students";
import type { LookupDependencies } from "@/lib/lookup/perform-lookup";
import {
  clientAddress,
  consumeRequestQuota,
  hashRateLimitKey,
  type RateLimitScope,
} from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { issueLedImageAccess } from "@/lib/minio/led";
import {
  consumePostgresQuota,
  findStudentByCode,
} from "@/lib/postgres/students";

export function createLookupDependencies(
  request: Request,
  rateLimitScope: RateLimitScope = "lookup",
): LookupDependencies {
  const source = resolveDataSource();
  const remoteIp = clientAddress(request);

  return {
    source,
    emailMode: readEmailMode(),
    clientKey: hashRateLimitKey(remoteIp, rateLimitScope),
    remoteIp,
    turnstileRequired: Boolean(process.env.TURNSTILE_SECRET_KEY),
    verifyTurnstile: verifyTurnstileToken,
    rateLimit: (key) =>
      source === "postgres" ? consumePostgresQuota(key) : consumeRequestQuota(key),
    findStudent: (code) =>
      source === "postgres"
        ? findStudentByCode(code)
        : Promise.resolve(findDemoStudent(code)),
    signLedImage: (path) =>
      source === "postgres"
        ? issueLedImageAccess(path)
        : Promise.resolve(signDemoLed(path)),
  };
}
