import { connection } from "next/server";

import { DatabaseMissing } from "@/components/admin/database-missing";
import { StudentForm } from "@/components/admin/student-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { hasDatabaseUrl } from "@/lib/config";
import { parseStudentCode } from "@/lib/validators/student";

export const instant = false;

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  const code = parseStudentCode((await searchParams).code);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Thêm sinh viên" description="Các trường có dấu * là bắt buộc." />
      <StudentForm initial={{ studentCode: code.ok ? code.code : "" }} />
    </div>
  );
}
