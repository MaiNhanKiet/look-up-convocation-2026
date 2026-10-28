import {
  isMaintenanceMode,
  readCorrectionFormUrl,
  readEmailMode,
  readMaintenanceReopenAt,
  readRateLimitConfig,
} from "@/lib/config";
import { getPrisma } from "@/lib/db";
import { hasMinioCredentials } from "@/lib/minio/endpoint";
import {
  FIELD_LABELS,
  FILTER_FIELDS,
  OPTIONAL_FIELDS,
  type FilterField,
  type OptionalField,
} from "@/lib/admin/students";

const TZ = "Asia/Ho_Chi_Minh";
const DAYS = 14;

export type CountItem = { label: string | null; count: number };

type CompletenessRow = Record<OptionalField | "total", number>;

async function completeness(): Promise<CompletenessRow> {
  const rows = await getPrisma().$queryRaw<CompletenessRow[]>`
    SELECT
      COUNT(*)::int AS "total",
      COUNT(NULLIF(TRIM(email), ''))::int AS "email",
      COUNT(NULLIF(TRIM(seat_tcn), ''))::int AS "seatTcn",
      COUNT(NULLIF(TRIM(seat_ph2), ''))::int AS "seatPh2",
      COUNT(NULLIF(TRIM(checkin_time), ''))::int AS "checkinTime",
      COUNT(NULLIF(TRIM(checkin_room), ''))::int AS "checkinRoom",
      COUNT(NULLIF(TRIM(award_time), ''))::int AS "awardTime",
      COUNT(NULLIF(TRIM(contact_group), ''))::int AS "contactGroup",
      COUNT(NULLIF(TRIM(invitation_link), ''))::int AS "invitationLink",
      COUNT(NULLIF(TRIM(drive_link), ''))::int AS "driveLink",
      COUNT(NULLIF(TRIM(led_image_key), ''))::int AS "ledImageKey",
      COUNT(NULLIF(TRIM(session_label), ''))::int AS "sessionLabel"
    FROM students
  `;
  return rows[0];
}

async function distribution(field: FilterField): Promise<CountItem[]> {
  const rows = await getPrisma().student.groupBy({
    by: [field],
    _count: { _all: true },
  });
  const merged = new Map<string | null, number>();
  for (const row of rows) {
    const raw = (row as Record<string, unknown>)[field];
    const label = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    merged.set(label, (merged.get(label) ?? 0) + row._count._all);
  }
  return [...merged.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), "vi"));
}

type LookupTotals = {
  total: number;
  found: number;
  notFound: number;
  rateLimited: number;
  failed: number;
  today: number;
  last24h: number;
  last1h: number;
  uniqueFound: number;
  uniqueNotFound: number;
  first: Date | null;
  last: Date | null;
};

async function lookupTotals(): Promise<LookupTotals> {
  const rows = await getPrisma().$queryRaw<LookupTotals[]>`
    SELECT
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE outcome = 'FOUND')::int AS "found",
      COUNT(*) FILTER (WHERE outcome = 'NOT_FOUND')::int AS "notFound",
      COUNT(*) FILTER (WHERE outcome = 'RATE_LIMITED')::int AS "rateLimited",
      COUNT(*) FILTER (WHERE outcome NOT IN ('FOUND', 'NOT_FOUND', 'RATE_LIMITED'))::int AS "failed",
      COUNT(*) FILTER (
        WHERE created_at >= (date_trunc('day', NOW() AT TIME ZONE ${TZ}) AT TIME ZONE ${TZ})
      )::int AS "today",
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS "last24h",
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour')::int AS "last1h",
      COUNT(DISTINCT student_code) FILTER (WHERE outcome = 'FOUND')::int AS "uniqueFound",
      COUNT(DISTINCT student_code) FILTER (WHERE outcome = 'NOT_FOUND')::int AS "uniqueNotFound",
      MIN(created_at) AS "first",
      MAX(created_at) AS "last"
    FROM lookup_events
  `;
  return rows[0];
}

export type DailyPoint = { day: string; total: number; found: number; uniqueStudents: number };

async function dailySeries(): Promise<DailyPoint[]> {
  const rows = await getPrisma().$queryRaw<DailyPoint[]>`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS "day",
      COUNT(*)::int AS "total",
      COUNT(*) FILTER (WHERE outcome = 'FOUND')::int AS "found",
      COUNT(DISTINCT student_code) FILTER (WHERE outcome = 'FOUND')::int AS "uniqueStudents"
    FROM lookup_events
    WHERE created_at >= NOW() - make_interval(days => ${DAYS})
    GROUP BY 1
  `;
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const points: DailyPoint[] = [];
  for (let offset = DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.UTC(y, m - 1, d - offset)).toISOString().slice(0, 10);
    points.push(byDay.get(day) ?? { day, total: 0, found: 0, uniqueStudents: 0 });
  }
  return points;
}

export type HourlyPoint = { hour: number; total: number };

async function hourOfDay(): Promise<HourlyPoint[]> {
  const rows = await getPrisma().$queryRaw<HourlyPoint[]>`
    SELECT
      EXTRACT(HOUR FROM created_at AT TIME ZONE ${TZ})::int AS "hour",
      COUNT(*)::int AS "total"
    FROM lookup_events
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY 1
  `;
  const byHour = new Map(rows.map((row) => [row.hour, row.total]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, total: byHour.get(hour) ?? 0 }));
}

export type RecentHourPoint = { at: string; total: number };

async function last24Hours(): Promise<RecentHourPoint[]> {
  const rows = await getPrisma().$queryRaw<RecentHourPoint[]>`
    SELECT
      to_char(date_trunc('hour', created_at AT TIME ZONE ${TZ}), 'YYYY-MM-DD"T"HH24') AS "at",
      COUNT(*)::int AS "total"
    FROM lookup_events
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY 1
  `;
  const byHour = new Map(rows.map((row) => [row.at, row.total]));
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const now = Date.now();
  return Array.from({ length: 24 }, (_, index) => {
    const parts = format.formatToParts(new Date(now - (23 - index) * 3_600_000));
    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const at = `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}`;
    return { at, total: byHour.get(at) ?? 0 };
  });
}

export type TopStudent = {
  studentCode: string;
  fullName: string | null;
  count: number;
  last: Date;
};

async function topStudents(): Promise<TopStudent[]> {
  return getPrisma().$queryRaw<TopStudent[]>`
    SELECT
      e.student_code AS "studentCode",
      s.full_name AS "fullName",
      COUNT(*)::int AS "count",
      MAX(e.created_at) AS "last"
    FROM lookup_events e
    LEFT JOIN students s ON s.student_code = e.student_code
    WHERE e.outcome = 'FOUND' AND e.student_code IS NOT NULL
    GROUP BY e.student_code, s.full_name
    ORDER BY "count" DESC, "last" DESC
    LIMIT 10
  `;
}

export type MissedCode = { studentCode: string; count: number; last: Date; nowExists: boolean };

// Valid codes that were searched but not in the database: likely missing records.
async function missedCodes(): Promise<MissedCode[]> {
  return getPrisma().$queryRaw<MissedCode[]>`
    SELECT
      e.student_code AS "studentCode",
      COUNT(*)::int AS "count",
      MAX(e.created_at) AS "last",
      BOOL_OR(s.id IS NOT NULL) AS "nowExists"
    FROM lookup_events e
    LEFT JOIN students s ON s.student_code = e.student_code
    WHERE e.outcome = 'NOT_FOUND' AND e.student_code IS NOT NULL
    GROUP BY e.student_code
    ORDER BY "nowExists" ASC, "count" DESC, "last" DESC
    LIMIT 15
  `;
}

export type DuplicateSeat = { kind: "TCN" | "PH2"; seat: string; codes: string[] };

async function duplicateSeats(): Promise<DuplicateSeat[]> {
  const rows = await getPrisma().$queryRaw<{ kind: "TCN" | "PH2"; seat: string; codes: string[] }[]>`
    SELECT 'TCN' AS "kind", TRIM(seat_tcn) AS "seat", ARRAY_AGG(student_code ORDER BY student_code) AS "codes"
    FROM students
    WHERE NULLIF(TRIM(seat_tcn), '') IS NOT NULL
    GROUP BY TRIM(seat_tcn)
    HAVING COUNT(*) > 1
    UNION ALL
    SELECT 'PH2', TRIM(seat_ph2), ARRAY_AGG(student_code ORDER BY student_code)
    FROM students
    WHERE NULLIF(TRIM(seat_ph2), '') IS NOT NULL
    GROUP BY TRIM(seat_ph2)
    HAVING COUNT(*) > 1
    ORDER BY 1, 2
    LIMIT 50
  `;
  return rows;
}

type QualityCounts = {
  invalidInvitation: number;
  invalidDrive: number;
  invalidEmail: number;
  duplicateEmail: number;
  ledExternal: number;
};

async function qualityCounts(): Promise<QualityCounts> {
  const rows = await getPrisma().$queryRaw<QualityCounts[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE NULLIF(TRIM(invitation_link), '') IS NOT NULL AND TRIM(invitation_link) !~* '^https?://'
      )::int AS "invalidInvitation",
      COUNT(*) FILTER (
        WHERE NULLIF(TRIM(drive_link), '') IS NOT NULL AND TRIM(drive_link) !~* '^https?://'
      )::int AS "invalidDrive",
      COUNT(*) FILTER (
        WHERE NULLIF(TRIM(email), '') IS NOT NULL AND TRIM(email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      )::int AS "invalidEmail",
      (
        SELECT COUNT(*)::int FROM (
          SELECT LOWER(TRIM(email)) FROM students
          WHERE NULLIF(TRIM(email), '') IS NOT NULL
          GROUP BY 1 HAVING COUNT(*) > 1
        ) d
      ) AS "duplicateEmail",
      COUNT(*) FILTER (WHERE TRIM(led_image_key) ~* '^https?://')::int AS "ledExternal"
    FROM students
  `;
  return rows[0];
}

function systemStatus() {
  const rate = readRateLimitConfig();
  return {
    maintenance: isMaintenanceMode(),
    reopenAt: readMaintenanceReopenAt(),
    emailMode: readEmailMode(),
    turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()),
    rateLimit: `${rate.limit} lượt / ${rate.windowSeconds} giây`,
    minio: hasMinioCredentials(process.env),
    correctionForm: Boolean(readCorrectionFormUrl()),
    trustProxy: ["true", "1"].includes(process.env.TRUST_PROXY?.trim().toLowerCase() ?? ""),
  };
}

export async function loadDashboard() {
  const prisma = getPrisma();
  const [
    fields,
    distributions,
    lookups,
    daily,
    hours,
    recentHours,
    top,
    missed,
    duplicates,
    quality,
    lastUpdated,
    activity,
  ] = await Promise.all([
    completeness(),
    Promise.all(FILTER_FIELDS.map(async (field) => [field, await distribution(field)] as const)),
    lookupTotals(),
    dailySeries(),
    hourOfDay(),
    last24Hours(),
    topStudents(),
    missedCodes(),
    duplicateSeats(),
    qualityCounts(),
    prisma.student.aggregate({ _max: { updatedAt: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const total = fields.total;
  const complete = await prisma.student.count({
    where: {
      AND: OPTIONAL_FIELDS.filter((field) => field !== "ledImageKey" && field !== "driveLink").map(
        (field) => ({ NOT: [{ [field]: null }, { [field]: "" }] }),
      ),
    },
  });

  return {
    total,
    complete,
    fields: OPTIONAL_FIELDS.map((field) => ({
      field,
      label: FIELD_LABELS[field],
      filled: fields[field],
      missing: total - fields[field],
    })),
    distributions: Object.fromEntries(distributions) as Record<FilterField, CountItem[]>,
    lookups,
    neverLookedUp: Math.max(0, total - lookups.uniqueFound),
    daily,
    hours,
    recentHours,
    top,
    missed,
    duplicates,
    quality,
    lastUpdated: lastUpdated._max.updatedAt,
    activity: activity.map((item) => ({ ...item, id: item.id.toString() })),
    system: systemStatus(),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

export async function loadActivity(options: { page: number; outcome?: string; code?: string }) {
  const prisma = getPrisma();
  const pageSize = 50;
  const where = {
    ...(options.outcome ? { outcome: options.outcome } : {}),
    ...(options.code ? { studentCode: { contains: options.code.toUpperCase() } } : {}),
  };
  const [total, events, audit] = await Promise.all([
    prisma.lookupEvent.count({ where }),
    prisma.lookupEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, options.page) - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return {
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    events: events.map((event) => ({ ...event, id: event.id.toString() })),
    audit: audit.map((item) => ({ ...item, id: item.id.toString() })),
  };
}
