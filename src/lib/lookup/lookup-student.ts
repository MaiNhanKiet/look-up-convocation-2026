"use server";

import { headers } from "next/headers";

import { createLookupDependencies } from "@/lib/lookup/dependencies";
import { performLookup } from "@/lib/lookup/perform-lookup";
import { sealJson, type SealedEnvelope } from "@/lib/security/sealed-payload";

export async function lookupStudent(input: {
  studentCode: string;
  turnstileToken?: string;
  clientPublicKey: string;
}): Promise<SealedEnvelope> {
  const incoming = await headers();
  const requestHeaders = new Headers({ "content-type": "application/json" });
  const forwarded = incoming.get("x-forwarded-for");
  const realIp = incoming.get("x-real-ip");
  if (forwarded) requestHeaders.set("x-forwarded-for", forwarded);
  if (realIp) requestHeaders.set("x-real-ip", realIp);

  const request = new Request("http://lookup.internal/students", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      studentCode: input.studentCode,
      turnstileToken: input.turnstileToken,
    }),
  });

  const outcome = await performLookup(
    request,
    createLookupDependencies(request),
  );
  return sealJson(outcome.body, input.clientPublicKey);
}
