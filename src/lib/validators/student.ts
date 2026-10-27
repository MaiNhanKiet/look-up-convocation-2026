import { z } from "zod";

// 6 digits as usual, or 5 digits when the first digit is 5–9 (e.g. SE63081).
export const STUDENT_CODE_PATTERN =
  /^[HQDSC][EAS]([0-9]{6}|[5-9][0-9]{4})$/;

export const studentCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(STUDENT_CODE_PATTERN);

export const lookupRequestSchema = z
  .object({
    studentCode: z.string(),
    turnstileToken: z.string().optional(),
  })
  .strict();

export type StudentCodeFailure = "empty" | "format" | "type";

export function parseStudentCode(
  input: unknown,
): { ok: true; code: string } | { ok: false; reason: StudentCodeFailure } {
  if (typeof input !== "string") {
    return { ok: false, reason: "type" };
  }

  const normalized = input.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, reason: "empty" };
  }

  const parsed = studentCodeSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, reason: "format" };
  }

  return { ok: true, code: parsed.data };
}
