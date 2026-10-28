import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseMissing } from "@/components/admin/database-missing";
import { DeleteStudentButton, StudentForm } from "@/components/admin/student-form";
import {
  Card,
  EmptyState,
  formatDateTime,
  formatNumber,
  formatRelative,
  OutcomeBadge,
  PageHeader,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { getStudent, getStudentLookupHistory, OPTIONAL_FIELDS } from "@/lib/admin/students";
import { hasDatabaseUrl } from "@/lib/config";
import { parseStudentCode } from "@/lib/validators/student";

export const instant = false;

export default async function EditStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  const code = parseStudentCode(decodeURIComponent((await params).code));
  if (!code.ok) notFound();
  const [student, history] = await Promise.all([
    getStudent(code.code),
    getStudentLookupHistory(code.code),
  ]);
  if (!student) notFound();
  const saved = Boolean((await searchParams).saved);
  const initial = Object.fromEntries(
    (["studentCode", "fullName", ...OPTIONAL_FIELDS] as const).map((field) => [field, student[field]]),
  );

  return (
    <>
      <Link href="/admin/students" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Danh sách sinh viên
      </Link>
      <PageHeader
        title={student.fullName}
        description={
          <>
            <span className="font-mono">{student.studentCode}</span> · Tạo {formatDateTime(student.createdAt)} · Cập
            nhật {formatRelative(student.updatedAt)}
          </>
        }
        actions={<DeleteStudentButton studentCode={student.studentCode} />}
      />
      {saved ? (
        <p role="status" className="mb-4 rounded-md border border-[#cfe0d3] bg-[#eef5ef] px-4 py-2.5 text-sm text-[#2f5138]">
          Đã lưu thay đổi.
        </p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <StudentForm
          key={student.updatedAt.toISOString()}
          originalCode={student.studentCode}
          initial={initial}
        />
        <div className="space-y-4">
          <Card title="Tra cứu" description={`${formatNumber(history.count)} lượt tra cứu MSSV này`}>
            {history.recent.length ? (
              <ul className="space-y-2 text-sm">
                {history.recent.map((event, index) => (
                  <li key={index} className="flex items-center justify-between gap-3">
                    <OutcomeBadge outcome={event.outcome} />
                    <span className="text-xs text-muted">{formatDateTime(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>Sinh viên chưa tra cứu.</EmptyState>
            )}
          </Card>
          <Card title="Liên kết nhanh">
            <ul className="space-y-2 text-sm">
              {[
                ["Thư mời", student.invitationLink],
                ["Google Drive", student.driveLink],
                ["Nhóm liên lạc", student.contactGroup?.startsWith("http") ? student.contactGroup : null],
              ].map(([label, href]) => (
                <li key={label}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-ink hover:underline">
                      {label}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-muted">{label}: chưa có</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
