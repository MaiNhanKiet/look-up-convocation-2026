import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { DatabaseMissing } from "@/components/admin/database-missing";
import {
  Badge,
  Card,
  EmptyState,
  formatNumber,
  formatRelative,
  inputClass,
  PageHeader,
  primaryButton,
  secondaryButton,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import {
  FIELD_LABELS,
  FILTER_FIELDS,
  listFilterOptions,
  listStudents,
  NONE_VALUE,
  OPTIONAL_FIELDS,
  type FilterField,
  type OptionalField,
} from "@/lib/admin/students";
import { hasDatabaseUrl } from "@/lib/config";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || undefined;
}

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  const params = await searchParams;
  const q = one(params.q);
  const filter = Object.fromEntries(
    FILTER_FIELDS.map((field) => [field, one(params[field])]),
  ) as Partial<Record<FilterField, string>>;
  const missingRaw = one(params.missing);
  const missing = OPTIONAL_FIELDS.includes(missingRaw as OptionalField)
    ? (missingRaw as OptionalField)
    : undefined;
  const sortRaw = one(params.sort);
  const sort = sortRaw === "name" || sortRaw === "updated" ? sortRaw : "code";
  const page = Number(one(params.page)) || 1;

  const [result, options] = await Promise.all([
    listStudents({ q, filter, missing, sort, page }),
    listFilterOptions(),
  ]);

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  for (const field of FILTER_FIELDS) if (filter[field]) query.set(field, filter[field]!);
  if (missing) query.set("missing", missing);
  if (sort !== "code") query.set("sort", sort);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/admin/students?${next}`;
  };
  const filtered = query.size > 0;
  const exportQuery = new URLSearchParams(query);
  exportQuery.delete("sort");

  return (
    <>
      <PageHeader
        title="Sinh viên"
        description={
          filtered
            ? `${formatNumber(result.total)} kết quả phù hợp bộ lọc`
            : `${formatNumber(result.total)} sinh viên trong danh sách`
        }
        actions={
          <>
            <a href={`/api/admin/export?${exportQuery}`} className={secondaryButton}>
              <Download className="size-4" aria-hidden="true" />
              Xuất {filtered ? "kết quả" : "tất cả"}
            </a>
            <Link href="/admin/students/new" className={primaryButton}>
              <Plus className="size-4" aria-hidden="true" />
              Thêm sinh viên
            </Link>
          </>
        }
      />

      {one(params.deleted) ? (
        <p role="status" className="mb-4 rounded-md border border-[#cfe0d3] bg-[#eef5ef] px-4 py-2.5 text-sm text-[#2f5138]">
          Đã xoá sinh viên.
        </p>
      ) : null}

      <Card className="mb-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
          <label className="relative md:col-span-2">
            <span className="sr-only">Tìm kiếm</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="MSSV, họ tên, email, số ghế…"
              className={`${inputClass} pl-9`}
            />
          </label>
          {FILTER_FIELDS.map((field) => (
            <label key={field}>
              <span className="sr-only">{FIELD_LABELS[field]}</span>
              <select name={field} defaultValue={filter[field] ?? ""} className={inputClass}>
                <option value="">{FIELD_LABELS[field]}: tất cả</option>
                <option value={NONE_VALUE}>{FIELD_LABELS[field]}: (chưa có)</option>
                {options[field].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            <span className="sr-only">Thiếu trường</span>
            <select name="missing" defaultValue={missing ?? ""} className={inputClass}>
              <option value="">Thiếu trường: không lọc</option>
              {OPTIONAL_FIELDS.map((field) => (
                <option key={field} value={field}>
                  Thiếu {FIELD_LABELS[field]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sắp xếp</span>
            <select name="sort" defaultValue={sort} className={inputClass}>
              <option value="code">Sắp xếp: MSSV</option>
              <option value="name">Sắp xếp: Họ tên</option>
              <option value="updated">Sắp xếp: Mới cập nhật</option>
            </select>
          </label>
          <div className="flex gap-2 xl:col-span-1">
            <button type="submit" className={`${primaryButton} flex-1`}>
              Lọc
            </button>
            {filtered ? (
              <Link href="/admin/students" className={secondaryButton}>
                Xoá lọc
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="!p-0">
        {result.students.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">MSSV</th>
                  <th className="px-4 py-3 font-medium">Họ và tên</th>
                  <th className="px-4 py-3 font-medium">Phiên</th>
                  <th className="px-4 py-3 font-medium">Ghế TCN / PH2</th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium">Tài nguyên</th>
                  <th className="px-4 py-3 text-right font-medium">Tra cứu</th>
                </tr>
              </thead>
              <tbody>
                {result.students.map((student) => {
                  const missingCount = OPTIONAL_FIELDS.filter(
                    (field) => field !== "driveLink" && !student[field],
                  ).length;
                  return (
                    <tr key={student.id} className="border-t border-line/70 hover:bg-[#faf6ef]">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/students/${student.studentCode}`} className="font-mono font-medium text-brand-ink hover:underline">
                          {student.studentCode}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-ink">{student.fullName}</p>
                        <p className="truncate text-xs text-muted">{student.email ?? "—"}</p>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{student.sessionLabel ?? "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {student.seatTcn ?? "—"} / {student.seatPh2 ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {[student.checkinTime, student.checkinRoom].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={student.ledImageKey ? "good" : "neutral"}>LED</Badge>
                          <Badge tone={student.invitationLink ? "good" : "neutral"}>Thư mời</Badge>
                          <Badge tone={student.driveLink ? "good" : "neutral"}>Drive</Badge>
                          {missingCount ? <Badge tone="warn">Thiếu {missingCount}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <p className="tabular-nums text-ink">{formatNumber(student.lookupCount)}</p>
                        <p className="text-xs text-muted">{student.lastLookupAt ? formatRelative(student.lastLookupAt) : "Chưa tra"}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Không có sinh viên phù hợp.</EmptyState>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
          <span>
            Trang {result.page}/{result.pageCount}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={pageHref(result.page - 1)} className={secondaryButton} aria-label="Trang trước">
                <ChevronLeft className="size-4" />
              </Link>
            ) : null}
            {result.page < result.pageCount ? (
              <Link href={pageHref(result.page + 1)} className={secondaryButton} aria-label="Trang sau">
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );
}
