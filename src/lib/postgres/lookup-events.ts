import { resolveDataSource } from "@/lib/config";
import { getPrisma } from "@/lib/db";
import type { LookupOutcome } from "@/lib/lookup/perform-lookup";
import { parseStudentCode } from "@/lib/validators/student";

async function readRequestedCode(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { studentCode?: unknown };
    const code = parseStudentCode(body?.studentCode);
    return code.ok ? code.code : null;
  } catch {
    return null;
  }
}

// Stores only the code and the outcome, never the client address.
export async function recordLookupEvent(
  request: Request,
  outcome: LookupOutcome,
): Promise<void> {
  if (resolveDataSource() !== "postgres") return;

  const studentCode = outcome.body.ok
    ? outcome.body.student.studentCode
    : await readRequestedCode(request);
  const result = outcome.body.ok ? "FOUND" : outcome.body.error.code;

  await getPrisma()
    .lookupEvent.create({ data: { studentCode, outcome: result } })
    .catch(() => undefined);
}
