import { connection } from "next/server";

import { hasAdminSession } from "@/lib/admin/session";
import { hasDatabaseUrl } from "@/lib/config";
import { recordAudit, rowToInput } from "@/lib/admin/students";
import { getPrisma } from "@/lib/db";
import { parseStudentCsv } from "@/lib/import/parse-student-csv";

const MAX_BYTES = 10 * 1024 * 1024;
const CHUNK = 200;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  await connection();
  if (!(await hasAdminSession())) return json({ error: "Phiên đăng nhập đã hết hạn." }, 401);
  if (!hasDatabaseUrl()) return json({ error: "Chưa kết nối cơ sở dữ liệu." }, 503);
  if (!sameOrigin(request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Không đọc được tệp." }, 400);
  }

  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  const onlyNew = form.get("onlyNew") === "1";
  if (!(file instanceof File) || file.size === 0) return json({ error: "Chưa chọn tệp CSV." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Tệp vượt quá 10 MB." }, 400);

  let parsed: ReturnType<typeof parseStudentCsv>;
  try {
    parsed = parseStudentCsv(await file.text());
  } catch (error) {
    return json({ error: `CSV không hợp lệ: ${(error as Error).message}` }, 400);
  }

  const prisma = getPrisma();
  const codes = parsed.students.map((student) => student.student_code);
  const existing = new Set(
    (
      await prisma.student.findMany({
        where: { studentCode: { in: codes } },
        select: { studentCode: true },
      })
    ).map((row) => row.studentCode),
  );
  const created = parsed.students.filter((student) => !existing.has(student.student_code));
  const updated = parsed.students.filter((student) => existing.has(student.student_code));

  const summary = {
    total: parsed.students.length,
    created: created.length,
    updated: onlyNew ? 0 : updated.length,
    skipped: onlyNew ? updated.length : 0,
    duplicateCount: parsed.duplicateCount,
    issues: parsed.issues.slice(0, 200),
    issueCount: parsed.issues.length,
    sample: parsed.students.slice(0, 8).map(rowToInput),
  };

  if (mode === "preview") return json({ mode, ...summary });

  const rows = onlyNew ? created : parsed.students;
  try {
    for (let index = 0; index < rows.length; index += CHUNK) {
      await prisma.$transaction(
        rows.slice(index, index + CHUNK).map((row) => {
          const data = rowToInput(row);
          return prisma.student.upsert({
            where: { studentCode: data.studentCode },
            create: data,
            update: data,
          });
        }),
      );
    }
  } catch {
    return json({ error: "Nhập dữ liệu thất bại giữa chừng. Kiểm tra lại rồi thử lại." }, 500);
  }

  await recordAudit(
    "IMPORT",
    null,
    `${file.name}: ${summary.created} mới, ${summary.updated} cập nhật, ${summary.skipped} bỏ qua, ${summary.issueCount} lỗi`,
  );
  return json({ mode, ...summary });
}
