import Link from "next/link";
import { connection } from "next/server";

import { DatabaseMissing } from "@/components/admin/database-missing";
import {
  AUDIT_LABELS,
  Badge,
  Card,
  EmptyState,
  formatDateTime,
  formatNumber,
  inputClass,
  OUTCOME_LABELS,
  OutcomeBadge,
  PageHeader,
  primaryButton,
  secondaryButton,
} from "@/components/admin/ui";
import { loadActivity } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/admin/session";
import { hasDatabaseUrl } from "@/lib/config";

export const instant = false;

function one(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || undefined;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  const params = await searchParams;
  const outcomeRaw = one(params.outcome);
  const outcome = outcomeRaw && outcomeRaw in OUTCOME_LABELS ? outcomeRaw : undefined;
  const code = one(params.code)?.slice(0, 16);
  const page = Math.max(1, Number(one(params.page)) || 1);
  const data = await loadActivity({ page, outcome, code });

  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (outcome) next.set("outcome", outcome);
    if (code) next.set("code", code);
    next.set("page", String(target));
    return `/admin/activity?${next}`;
  };

  return (
    <>
      <PageHeader
        title="Nhật ký"
        description="Lượt tra cứu công khai (không lưu IP) và thay đổi của quản trị viên."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Lượt tra cứu" description={`${formatNumber(data.total)} sự kiện`}>
          <form method="get" className="mb-4 flex flex-wrap gap-2">
            <input
              name="code"
              defaultValue={code}
              placeholder="Lọc MSSV"
              className={`${inputClass} w-40 font-mono`}
            />
            <select name="outcome" defaultValue={outcome ?? ""} className={`${inputClass} w-48`}>
              <option value="">Mọi kết quả</option>
              {Object.entries(OUTCOME_LABELS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <button type="submit" className={primaryButton}>
              Lọc
            </button>
          </form>
          {data.events.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-medium">Thời gian</th>
                    <th className="pb-2 font-medium">MSSV</th>
                    <th className="pb-2 font-medium">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id} className="border-t border-line/70">
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="py-2 pr-3 font-mono">
                        {event.studentCode && event.outcome === "FOUND" ? (
                          <Link
                            href={`/admin/students/${event.studentCode}`}
                            className="text-brand-ink hover:underline"
                          >
                            {event.studentCode}
                          </Link>
                        ) : (
                          (event.studentCode ?? "—")
                        )}
                      </td>
                      <td className="py-2">
                        <OutcomeBadge outcome={event.outcome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>Chưa có sự kiện.</EmptyState>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>
              Trang {Math.min(page, data.pageCount)}/{data.pageCount}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className={secondaryButton}>
                  Trước
                </Link>
              ) : null}
              {page < data.pageCount ? (
                <Link href={pageHref(page + 1)} className={secondaryButton}>
                  Sau
                </Link>
              ) : null}
            </div>
          </div>
        </Card>
        <Card title="Thay đổi dữ liệu" description="100 thao tác gần nhất">
          {data.audit.length ? (
            <ul className="space-y-3 text-sm">
              {data.audit.map((item) => (
                <li key={item.id} className="border-t border-line/70 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={item.action === "DELETE" ? "bad" : item.action === "IMPORT" ? "brand" : "neutral"}
                      >
                        {AUDIT_LABELS[item.action] ?? item.action}
                      </Badge>
                      {item.studentCode ? (
                        <span className="font-mono text-xs">{item.studentCode}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
                  </div>
                  {item.detail ? <p className="mt-1 text-muted">{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Chưa có thay đổi.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
