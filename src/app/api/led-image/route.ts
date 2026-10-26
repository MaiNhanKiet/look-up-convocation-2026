import { connection } from "next/server";

import { readLedViewToken } from "@/lib/minio/led-access";
import { readLedObject } from "@/lib/minio/led";
import { studentHasLedKey } from "@/lib/postgres/students";

function privateResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, noarchive",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  await connection();

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const claims = readLedViewToken(token, process.env, Date.now());
  if (!claims) return privateResponse(403);

  try {
    const allowed = await studentHasLedKey(claims.objectKey);
    if (!allowed) return privateResponse(403);
  } catch {
    return privateResponse(502);
  }

  const object = await readLedObject(claims.objectKey);
  if (!object.ok) {
    return privateResponse(object.reason === "missing" ? 404 : 502);
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noarchive",
    },
  });
}
