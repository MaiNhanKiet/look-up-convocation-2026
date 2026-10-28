import { readRateLimitConfig } from "@/lib/config";
import { getPrisma } from "@/lib/db";
import type { RateLimitDecision } from "@/lib/security/rate-limit";
import type { StudentRow } from "@/lib/types/student";

type QuotaRow = {
  window_started_at: Date;
  request_count: number;
};

export async function consumePostgresQuota(key: string): Promise<RateLimitDecision> {
  const { limit, windowSeconds } = readRateLimitConfig();
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw<QuotaRow[]>`
    INSERT INTO lookup_rate_limits (key_hash, window_started_at, request_count, updated_at)
    VALUES (${key}, NOW(), 1, NOW())
    ON CONFLICT (key_hash) DO UPDATE
    SET
      window_started_at = CASE
        WHEN lookup_rate_limits.window_started_at + make_interval(secs => ${windowSeconds}) <= NOW()
          THEN NOW()
        ELSE lookup_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN lookup_rate_limits.window_started_at + make_interval(secs => ${windowSeconds}) <= NOW()
          THEN 1
        ELSE lookup_rate_limits.request_count + 1
      END,
      updated_at = NOW()
    RETURNING window_started_at, request_count
  `;

  const row = rows[0];
  if (!row) throw new Error("lookup_quota_failed");

  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.lookupRateLimit.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    }).catch(() => undefined);
  }

  if (row.request_count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (row.window_started_at.getTime() + windowSeconds * 1000 - Date.now()) / 1000,
      ),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - row.request_count),
    retryAfterSeconds: 0,
  };
}

export async function studentHasLedKey(objectKey: string): Promise<boolean> {
  const row = await getPrisma().student.findFirst({
    where: { ledImageKey: objectKey },
    select: { id: true },
  });
  return row != null;
}

export async function findStudentByCode(code: string): Promise<StudentRow | null> {
  const row = await getPrisma().student.findUnique({
    where: { studentCode: code },
  });
  if (!row) return null;

  return {
    student_code: row.studentCode,
    full_name: row.fullName,
    email: row.email,
    seat_tcn: row.seatTcn,
    seat_ph2: row.seatPh2,
    checkin_time: row.checkinTime,
    checkin_room: row.checkinRoom,
    award_time: row.awardTime,
    contact_group: row.contactGroup,
    invitation_link: row.invitationLink,
    drive_link: row.driveLink,
    led_image_key: row.ledImageKey,
    session_label: row.sessionLabel,
  };
}
