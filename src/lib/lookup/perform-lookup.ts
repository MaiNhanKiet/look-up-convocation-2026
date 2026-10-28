import { copy, rateLimitMessage } from "@/lib/copy";
import { DEMO_LED_PATH } from "@/lib/demo/students";
import { maskEmail } from "@/lib/email";
import { isSafeLedPath } from "@/lib/security/led-path";
import type { RateLimitDecision } from "@/lib/security/rate-limit";
import type {
  LedImageAccessResult,
  LookupResponse,
  PublicStudent,
  StudentRow,
} from "@/lib/types/student";
import { lookupRequestSchema, parseStudentCode } from "@/lib/validators/student";

export type LookupSource = "postgres" | "demo" | "unconfigured";

export type LookupDependencies = {
  source: LookupSource;
  emailMode: "masked" | "full";
  clientKey: string;
  remoteIp: string;
  turnstileRequired: boolean;
  verifyTurnstile: (token: string | undefined, remoteIp: string) => Promise<boolean>;
  rateLimit: (key: string) => Promise<RateLimitDecision>;
  findStudent: (code: string) => Promise<StudentRow | null>;
  signLedImage: (path: string) => Promise<LedImageAccessResult>;
};

export type LookupOutcome = {
  status: number;
  body: LookupResponse;
};

function failure(
  status: number,
  code: Extract<LookupResponse, { ok: false }>["error"]["code"],
  message: string,
  retryAfterSeconds?: number,
): LookupOutcome {
  return {
    status,
    body: {
      ok: false,
      error: {
        code,
        message,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      },
    },
  };
}

function presentText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function presentHttpUrl(value: string | null): string | null {
  const text = presentText(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function presentStudent(
  row: StudentRow,
  options: {
    emailMode: "masked" | "full";
    demo: boolean;
    signLedImage: (path: string) => Promise<LedImageAccessResult>;
  },
): Promise<PublicStudent> {
  const email = presentText(row.email);
  const path = presentText(row.led_image_key);
  const ledExternalUrl = presentHttpUrl(path);
  let ledImageUrl: string | null = null;
  let ledImageExpiresAt: number | null = null;
  let ledImageStatus: PublicStudent["ledImageStatus"] = "missing";

  if (path && !ledExternalUrl) {
    const demoLed = options.demo && path === DEMO_LED_PATH;
    if (!demoLed && !isSafeLedPath(path)) {
      ledImageStatus = "unavailable";
    } else {
      try {
        const access = await options.signLedImage(path);
        if (access.status === "ready") {
          ledImageUrl = access.url;
          ledImageExpiresAt = access.expiresAt;
          ledImageStatus = "ready";
        } else {
          ledImageStatus = access.status;
        }
      } catch {
        ledImageStatus = "unavailable";
      }
    }
  }

  return {
    fullName: row.full_name.trim(),
    studentCode: row.student_code,
    email: email
      ? options.emailMode === "full"
        ? email
        : maskEmail(email)
      : null,
    emailRevealable: Boolean(email) && options.emailMode === "full",
    seatTcn: presentText(row.seat_tcn),
    seatPh2: presentText(row.seat_ph2),
    checkinTime: presentText(row.checkin_time),
    checkinRoom: presentText(row.checkin_room),
    awardTime: presentText(row.award_time),
    contactGroup: presentText(row.contact_group),
    invitationLink: presentHttpUrl(row.invitation_link),
    driveLink: presentHttpUrl(row.drive_link),
    ledExternalUrl,
    sessionLabel: presentText(row.session_label),
    ledImageUrl,
    ledImageExpiresAt,
    ledImageStatus,
    demo: options.demo,
  };
}

export async function performLookup(
  request: Request,
  deps: LookupDependencies,
): Promise<LookupOutcome> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return failure(400, "INVALID_PAYLOAD", copy.invalidPayload);
  }

  const parsedBody = lookupRequestSchema.safeParse(payload);
  if (!parsedBody.success) {
    return failure(400, "INVALID_PAYLOAD", copy.invalidPayload);
  }

  const studentCode = parseStudentCode(parsedBody.data.studentCode);
  if (!studentCode.ok) {
    return failure(
      400,
      "INVALID_STUDENT_CODE",
      studentCode.reason === "empty" ? copy.emptyCode : copy.invalidCode,
    );
  }

  if (deps.turnstileRequired) {
    const verified = await deps.verifyTurnstile(
      parsedBody.data.turnstileToken,
      deps.remoteIp,
    );
    if (!verified) {
      return failure(400, "TURNSTILE_FAILED", copy.turnstile);
    }
  }

  let quota: RateLimitDecision;
  try {
    quota = await deps.rateLimit(deps.clientKey);
  } catch {
    return failure(500, "SERVER_ERROR", copy.server);
  }

  if (!quota.allowed) {
    const retryAfterSeconds = Math.max(1, quota.retryAfterSeconds);
    return failure(
      429,
      "RATE_LIMITED",
      rateLimitMessage(retryAfterSeconds),
      retryAfterSeconds,
    );
  }

  if (deps.source === "unconfigured") {
    return failure(500, "UNAVAILABLE", copy.unavailable);
  }

  try {
    const row = await deps.findStudent(studentCode.code);
    if (!row) {
      return failure(404, "NOT_FOUND", copy.notFound);
    }

    const student = await presentStudent(row, {
      emailMode: deps.emailMode,
      demo: deps.source === "demo",
      signLedImage: deps.signLedImage,
    });

    return { status: 200, body: { ok: true, student } };
  } catch {
    return failure(500, "SERVER_ERROR", copy.server);
  }
}

export function lookupResponse(outcome: LookupOutcome): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
  });

  if (
    outcome.status === 429 &&
    outcome.body.ok === false &&
    outcome.body.error.retryAfterSeconds
  ) {
    headers.set("Retry-After", String(outcome.body.error.retryAfterSeconds));
  }

  return new Response(JSON.stringify(outcome.body), {
    status: outcome.status,
    headers,
  });
}
