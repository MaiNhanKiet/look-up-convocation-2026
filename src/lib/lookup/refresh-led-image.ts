"use server";

import { headers } from "next/headers";

import { createLookupDependencies } from "@/lib/lookup/dependencies";
import { presentStudent } from "@/lib/lookup/perform-lookup";
import { sealJson, type SealedEnvelope } from "@/lib/security/sealed-payload";
import type { LedImageRefresh } from "@/lib/types/student";
import { parseStudentCode } from "@/lib/validators/student";

export async function refreshLedImage(input: {
  studentCode: string;
  clientPublicKey: string;
}): Promise<SealedEnvelope> {
  const parsed = parseStudentCode(input.studentCode);
  if (!parsed.ok) {
    return sealJson(
      { ok: false, ledImageStatus: "unavailable" } satisfies LedImageRefresh,
      input.clientPublicKey,
    );
  }

  const incoming = await headers();
  const requestHeaders = new Headers();
  const forwarded = incoming.get("x-forwarded-for");
  const realIp = incoming.get("x-real-ip");
  if (forwarded) requestHeaders.set("x-forwarded-for", forwarded);
  if (realIp) requestHeaders.set("x-real-ip", realIp);

  const request = new Request("http://lookup.internal/led-image", {
    method: "GET",
    headers: requestHeaders,
  });
  const deps = createLookupDependencies(request, "led-image-refresh");
  if (deps.source === "unconfigured") {
    return sealJson(
      { ok: false, ledImageStatus: "unavailable" } satisfies LedImageRefresh,
      input.clientPublicKey,
    );
  }

  try {
    const quota = await deps.rateLimit(deps.clientKey);
    if (!quota.allowed) {
      return sealJson(
        { ok: false, ledImageStatus: "unavailable" } satisfies LedImageRefresh,
        input.clientPublicKey,
      );
    }

    const row = await deps.findStudent(parsed.code);
    if (!row) {
      return sealJson(
        { ok: false, ledImageStatus: "missing" } satisfies LedImageRefresh,
        input.clientPublicKey,
      );
    }

    const student = await presentStudent(row, {
      emailMode: deps.emailMode,
      demo: deps.source === "demo",
      signLedImage: deps.signLedImage,
    });

    if (
      student.ledImageStatus !== "ready" ||
      !student.ledImageUrl ||
      student.ledImageExpiresAt == null
    ) {
      return sealJson(
        {
          ok: false,
          ledImageStatus:
            student.ledImageStatus === "missing" ? "missing" : "unavailable",
        } satisfies LedImageRefresh,
        input.clientPublicKey,
      );
    }

    return sealJson(
      {
        ok: true,
        ledImageUrl: student.ledImageUrl,
        ledImageExpiresAt: student.ledImageExpiresAt,
        ledImageStatus: "ready",
      } satisfies LedImageRefresh,
      input.clientPublicKey,
    );
  } catch {
    return sealJson(
      { ok: false, ledImageStatus: "unavailable" } satisfies LedImageRefresh,
      input.clientPublicKey,
    );
  }
}
