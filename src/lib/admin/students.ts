import { getPrisma } from "@/lib/db";
import type { Prisma, Student } from "@/generated/prisma/client";
import type { StudentRow } from "@/lib/types/student";
import { parseStudentCode } from "@/lib/validators/student";

export type AdminStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  email: string | null;
  seatTcn: string | null;
  seatPh2: string | null;
  checkinTime: string | null;
  checkinRoom: string | null;
  awardTime: string | null;
  contactGroup: string | null;
  invitationLink: string | null;
  driveLink: string | null;
  ledImageKey: string | null;
  sessionLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentInput = Omit<AdminStudent, "id" | "createdAt" | "updatedAt">;

export const OPTIONAL_FIELDS = [
  "email",
  "seatTcn",
  "seatPh2",
  "checkinTime",
  "checkinRoom",
  "awardTime",
  "contactGroup",
  "invitationLink",
  "driveLink",
  "ledImageKey",
  "sessionLabel",
] as const satisfies readonly (keyof StudentInput)[];

export type OptionalField = (typeof OPTIONAL_FIELDS)[number];

export const FIELD_LABELS: Record<keyof StudentInput, string> = {
  studentCode: "MSSV",
  fullName: "Họ và tên",
  email: "Email",
  seatTcn: "Ghế TCN",
  seatPh2: "Ghế PH2",
  checkinTime: "Giờ check-in",
  checkinRoom: "Phòng check-in",
  awardTime: "Giờ trao bằng",
  contactGroup: "Nhóm liên lạc",
  invitationLink: "Link thư mời",
  driveLink: "Link Drive",
  ledImageKey: "Hình LED",
  sessionLabel: "Phiên",
};

export const FILTER_FIELDS = [
  "sessionLabel",
  "checkinRoom",
  "checkinTime",
  "awardTime",
  "contactGroup",
] as const satisfies readonly OptionalField[];

export type FilterField = (typeof FILTER_FIELDS)[number];

const URL_FIELDS = new Set<OptionalField>(["invitationLink", "driveLink"]);

function toAdmin(row: Student): AdminStudent {
  return { ...row, id: row.id.toString() };
}

function blankToNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type StudentFormResult =
  | { ok: true; data: StudentInput }
  | { ok: false; errors: Partial<Record<keyof StudentInput, string>> };

export function parseStudentForm(form: FormData): StudentFormResult {
  const errors: Partial<Record<keyof StudentInput, string>> = {};
  const code = parseStudentCode(form.get("studentCode") ?? "");
  if (!code.ok) {
    errors.studentCode = code.reason === "empty" ? "Thiếu MSSV." : "MSSV không đúng định dạng.";
  }

  const fullName = blankToNull(form.get("fullName"));
  if (!fullName) errors.fullName = "Thiếu họ và tên.";

  const optional = Object.fromEntries(
    OPTIONAL_FIELDS.map((field) => [field, blankToNull(form.get(field))]),
  ) as Record<OptionalField, string | null>;

  if (optional.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(optional.email)) {
    errors.email = "Email không đúng định dạng.";
  }
  for (const field of URL_FIELDS) {
    const value = optional[field];
    if (value && !isHttpUrl(value)) errors[field] = "Link phải bắt đầu bằng http:// hoặc https://.";
  }

  if (!code.ok || !fullName || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { studentCode: code.code, fullName, ...optional },
  };
}

export function rowToInput(row: StudentRow): StudentInput {
  return {
    studentCode: row.student_code,
    fullName: row.full_name,
    email: row.email,
    seatTcn: row.seat_tcn,
    seatPh2: row.seat_ph2,
    checkinTime: row.checkin_time,
    checkinRoom: row.checkin_room,
    awardTime: row.award_time,
    contactGroup: row.contact_group,
    invitationLink: row.invitation_link,
    driveLink: row.drive_link,
    ledImageKey: row.led_image_key,
    sessionLabel: row.session_label,
  };
}

export type StudentListQuery = {
  q?: string;
  filter?: Partial<Record<FilterField, string>>;
  missing?: OptionalField;
  sort?: "code" | "name" | "updated";
  page?: number;
  pageSize?: number;
};

export const NONE_VALUE = "__none__";

function blankCondition(field: OptionalField): Prisma.StudentWhereInput {
  return { OR: [{ [field]: null }, { [field]: "" }] };
}

export function buildStudentWhere(query: StudentListQuery): Prisma.StudentWhereInput {
  const and: Prisma.StudentWhereInput[] = [];
  const q = query.q?.trim();
  if (q) {
    and.push({
      OR: [
        { studentCode: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { seatTcn: { contains: q, mode: "insensitive" } },
        { seatPh2: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  for (const field of FILTER_FIELDS) {
    const value = query.filter?.[field];
    if (!value) continue;
    and.push(value === NONE_VALUE ? blankCondition(field) : { [field]: value });
  }
  if (query.missing) and.push(blankCondition(query.missing));
  return and.length ? { AND: and } : {};
}

export async function listStudents(query: StudentListQuery) {
  const prisma = getPrisma();
  const pageSize = query.pageSize ?? 25;
  const where = buildStudentWhere(query);
  const orderBy: Prisma.StudentOrderByWithRelationInput =
    query.sort === "name"
      ? { fullName: "asc" }
      : query.sort === "updated"
        ? { updatedAt: "desc" }
        : { studentCode: "asc" };

  const total = await prisma.student.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  const rows = await prisma.student.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const lookups = rows.length
    ? await prisma.lookupEvent.groupBy({
        by: ["studentCode"],
        where: {
          outcome: "FOUND",
          studentCode: { in: rows.map((row) => row.studentCode) },
        },
        _count: { _all: true },
        _max: { createdAt: true },
      })
    : [];
  const lookupByCode = new Map(
    lookups.map((item) => [
      item.studentCode,
      { count: item._count._all, last: item._max.createdAt },
    ]),
  );

  return {
    total,
    page,
    pageCount,
    pageSize,
    students: rows.map((row) => ({
      ...toAdmin(row),
      lookupCount: lookupByCode.get(row.studentCode)?.count ?? 0,
      lastLookupAt: lookupByCode.get(row.studentCode)?.last ?? null,
    })),
  };
}

export async function listFilterOptions(): Promise<Record<FilterField, string[]>> {
  const prisma = getPrisma();
  const entries = await Promise.all(
    FILTER_FIELDS.map(async (field) => {
      const rows = await prisma.student.findMany({
        where: { NOT: blankCondition(field) },
        distinct: [field],
        select: { [field]: true },
        orderBy: { [field]: "asc" },
      });
      return [field, rows.map((row) => String((row as Record<string, unknown>)[field]))] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<FilterField, string[]>;
}

export async function getStudent(code: string): Promise<AdminStudent | null> {
  const row = await getPrisma().student.findUnique({ where: { studentCode: code } });
  return row ? toAdmin(row) : null;
}

export async function getStudentLookupHistory(code: string, take = 20) {
  const prisma = getPrisma();
  const [count, recent] = await Promise.all([
    prisma.lookupEvent.count({ where: { studentCode: code } }),
    prisma.lookupEvent.findMany({
      where: { studentCode: code },
      orderBy: { createdAt: "desc" },
      take,
      select: { outcome: true, createdAt: true },
    }),
  ]);
  return { count, recent };
}

export async function recordAudit(
  action: string,
  studentCode: string | null,
  detail?: string,
): Promise<void> {
  await getPrisma()
    .adminAuditLog.create({ data: { action, studentCode, detail } })
    .catch(() => undefined);
}

export function describeChanges(before: StudentInput, after: StudentInput): string {
  const changed = (Object.keys(FIELD_LABELS) as (keyof StudentInput)[])
    .filter((field) => (before[field] ?? null) !== (after[field] ?? null))
    .map((field) => FIELD_LABELS[field]);
  return changed.length ? `Đã sửa: ${changed.join(", ")}` : "Không có thay đổi";
}

export const CSV_COLUMNS: { header: string; field: keyof StudentInput }[] = [
  { header: "student_code", field: "studentCode" },
  { header: "full_name", field: "fullName" },
  { header: "email", field: "email" },
  { header: "seat_tcn", field: "seatTcn" },
  { header: "seat_ph2", field: "seatPh2" },
  { header: "checkin_time", field: "checkinTime" },
  { header: "checkin_room", field: "checkinRoom" },
  { header: "award_time", field: "awardTime" },
  { header: "contact_group", field: "contactGroup" },
  { header: "invitation_link", field: "invitationLink" },
  { header: "drive_link", field: "driveLink" },
  { header: "led_image_key", field: "ledImageKey" },
  { header: "session_label", field: "sessionLabel" },
];

function csvCell(value: string | null): string {
  const text = value ?? "";
  // Prefix formula-like cells so spreadsheets do not execute them.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function studentsToCsv(students: StudentInput[]): string {
  const lines = [CSV_COLUMNS.map((column) => column.header).join(",")];
  for (const student of students) {
    lines.push(CSV_COLUMNS.map((column) => csvCell(student[column.field])).join(","));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
