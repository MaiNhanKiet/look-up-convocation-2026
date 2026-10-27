import { parse } from "csv-parse/sync";

import type { StudentRow } from "@/lib/types/student";
import { parseStudentCode } from "@/lib/validators/student";

export type ImportStudent = StudentRow;

export type ImportIssue = {
  line: number;
  studentCode: string;
  reason: string;
};

export type ParsedStudentCsv = {
  students: ImportStudent[];
  issues: ImportIssue[];
  duplicateCount: number;
};

const HEADER_MAP: Record<string, keyof StudentRow> = {
  student_code: "student_code",
  mssv: "student_code",
  full_name: "full_name",
  ho_ten: "full_name",
  hoten: "full_name",
  email: "email",
  seat_tcn: "seat_tcn",
  so_ghe_tcn: "seat_tcn",
  seat_ph2: "seat_ph2",
  so_ghe_ph2: "seat_ph2",
  checkin_time: "checkin_time",
  gio_checkin: "checkin_time",
  checkin_room: "checkin_room",
  phong_checkin: "checkin_room",
  award_time: "award_time",
  thoi_gian_trao_bang: "award_time",
  contact_group: "contact_group",
  nhom_lien_lac: "contact_group",
  invitation_link: "invitation_link",
  link_thu_moi: "invitation_link",
  led_image_key: "led_image_key",
  led_image_path: "led_image_key",
  hinh_led: "led_image_key",
  session_label: "session_label",
  session: "session_label",
};

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/^\uFEFF/, "");
}

export function parseStudentCsv(text: string): ParsedStudentCsv {
  const records = parse(text, {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    bom: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
  }) as Record<string, string>[];

  const issues: ImportIssue[] = [];
  const byCode = new Map<string, ImportStudent>();
  let duplicateCount = 0;

  records.forEach((record, index) => {
    const line = index + 2;
    const mapped: Partial<Record<keyof StudentRow, string>> = {};

    for (const [header, value] of Object.entries(record)) {
      const field = HEADER_MAP[header];
      if (field) mapped[field] = value;
    }

    const code = parseStudentCode(mapped.student_code ?? "");
    if (!code.ok) {
      issues.push({
        line,
        studentCode: (mapped.student_code ?? "").trim().toUpperCase(),
        reason: code.reason === "empty" ? "Thiếu MSSV." : "MSSV không đúng định dạng.",
      });
      return;
    }

    const fullName = mapped.full_name?.trim() ?? "";
    if (!fullName) {
      issues.push({
        line,
        studentCode: code.code,
        reason: "Thiếu họ và tên.",
      });
      return;
    }

    const email = blankToNull(mapped.email);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      issues.push({
        line,
        studentCode: code.code,
        reason: "Email không đúng định dạng.",
      });
      return;
    }

    if (byCode.has(code.code)) duplicateCount += 1;

    byCode.set(code.code, {
      student_code: code.code,
      full_name: fullName,
      email,
      seat_tcn: blankToNull(mapped.seat_tcn),
      seat_ph2: blankToNull(mapped.seat_ph2),
      checkin_time: blankToNull(mapped.checkin_time),
      checkin_room: blankToNull(mapped.checkin_room),
      award_time: blankToNull(mapped.award_time),
      contact_group: blankToNull(mapped.contact_group),
      invitation_link: blankToNull(mapped.invitation_link),
      led_image_key: blankToNull(mapped.led_image_key),
      session_label: blankToNull(mapped.session_label),
    });
  });

  return {
    students: [...byCode.values()],
    issues,
    duplicateCount,
  };
}
