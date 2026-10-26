"use server";

import { headers } from "next/headers";

import { createLookupDependencies } from "@/lib/lookup/dependencies";
import { presentStudent } from "@/lib/lookup/perform-lookup";
import type { LedImageStatus } from "@/lib/types/student";
import { parseStudentCode } from "@/lib/validators/student";

export type LedImageRefresh =
  | {
      ok: true;
      ledImageUrl: string;
      ledImageExpiresAt: number;
      ledImageStatus: "ready";
    }
  | { ok: false; ledImageStatus: Exclude<LedImageStatus, "ready"> };

export async function refreshLedImage(studentCode: string): Promise<LedImageRefresh> {
  const parsed = parseStudentCode(studentCode);
  if (!parsed.ok) return { ok: false, ledImageStatus: "unavailable" };

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
    return { ok: false, ledImageStatus: "unavailable" };
  }

  try {
    const quota = await deps.rateLimit(deps.clientKey);
    if (!quota.allowed) return { ok: false, ledImageStatus: "unavailable" };

    const row = await deps.findStudent(parsed.code);
    if (!row) return { ok: false, ledImageStatus: "missing" };

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
      return {
        ok: false,
        ledImageStatus: student.ledImageStatus === "missing" ? "missing" : "unavailable",
      };
    }

    return {
      ok: true,
      ledImageUrl: student.ledImageUrl,
      ledImageExpiresAt: student.ledImageExpiresAt,
      ledImageStatus: "ready",
    };
  } catch {
    return { ok: false, ledImageStatus: "unavailable" };
  }
}
