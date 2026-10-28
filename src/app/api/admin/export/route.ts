import { connection } from "next/server";

import { hasAdminSession } from "@/lib/admin/session";
import { hasDatabaseUrl } from "@/lib/config";
import { getPrisma } from "@/lib/db";
import {
  buildStudentWhere,
  FILTER_FIELDS,
  OPTIONAL_FIELDS,
  studentsToCsv,
  type OptionalField,
} from "@/lib/admin/students";

export async function GET(request: Request): Promise<Response> {
  await connection();
  if (!(await hasAdminSession())) return new Response(null, { status: 401 });
  if (!hasDatabaseUrl()) return new Response(null, { status: 503 });

  const params = new URL(request.url).searchParams;
  const missing = params.get("missing");
  const where = buildStudentWhere({
    q: params.get("q") ?? undefined,
    filter: Object.fromEntries(
      FILTER_FIELDS.map((field) => [field, params.get(field) ?? undefined]),
    ),
    missing: OPTIONAL_FIELDS.includes(missing as OptionalField)
      ? (missing as OptionalField)
      : undefined,
  });

  const students = await getPrisma().student.findMany({
    where,
    orderBy: { studentCode: "asc" },
  });
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(studentsToCsv(students), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
