import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { ColumnChart, MeterList, Ring } from "@/components/admin/charts";
import {
  AUDIT_LABELS,
  Badge,
  Card,
  EmptyState,
  formatDateTime,
  formatNumber,
  formatRelative,
  OUTCOME_LABELS,
  PageHeader,
  percent,
  secondaryButton,
  Stat,
} from "@/components/admin/ui";
import { DatabaseMissing } from "@/components/admin/database-missing";
import { loadDashboard, type CountItem, type DashboardData } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/admin/session";
import { NONE_VALUE, type FilterField } from "@/lib/admin/students";
import { hasDatabaseUrl } from "@/lib/config";

export const instant = false;

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function dayLabel(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

function weekday(day: string): string {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

function toMeterItems(field: FilterField, items: CountItem[]) {
  return items.map((item) => ({
    label: item.label ?? "(Chưa có)",
    count: item.count,
    muted: item.label == null,
    href: `/admin/students?${field}=${encodeURIComponent(item.label ?? NONE_VALUE)}`,
  }));
}

export default async function AdminDashboardPage() {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  const data = await loadDashboard();
  return <Dashboard data={data} />;
}

function Dashboard({ data }: { data: DashboardData }) {
  const { lookups, total } = data;
  const notFoundRate = lookups.total ? lookups.notFound / lookups.total : 0;
  const qualityIssues =
    data.duplicates.length +
    data.quality.invalidDrive +
    data.quality.invalidInvitation +
    data.quality.invalidEmail +
    data.quality.duplicateEmail;
  const busiestHour = data.hours.reduce((best, item) => (item.total > best.total ? item : best), data.hours[0]);
  const busiestDay = data.daily.reduce((best, item) => (item.total > best.total ? item : best), data.daily[0]);
  const weekTotal = data.daily.slice(-7).reduce((sum, item) => sum + item.total, 0);
  const prevWeekTotal = data.daily.slice(0, 7).reduce((sum, item) => sum + item.total, 0);
  const weekDelta = prevWeekTotal ? ((weekTotal - prevWeekTotal) / prevWeekTotal) * 100 : null;

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={
          <>
            Dữ liệu cập nhật lần cuối {formatRelative(data.lastUpdated)} · Tra cứu gần nhất{" "}
            {formatRelative(lookups.last)}
          </>
        }
        actions={
          <a href="/api/admin/export" className={secondaryButton}>
            <Download className="size-4" aria-hidden="true" />
            Xuất CSV
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Sinh viên" value={formatNumber(total)} hint={`${formatNumber(data.complete)} hồ sơ đủ thông tin`} />
        <Stat
          label="Đủ thông tin"
          value={percent(data.complete, total)}
          hint={`${formatNumber(total - data.complete)} hồ sơ còn thiếu`}
          tone={data.complete === total ? "good" : "warn"}
        />
        <Stat
          label="Lượt tra cứu"
          value={formatNumber(lookups.total)}
          hint={`Hôm nay ${formatNumber(lookups.today)} · 1 giờ qua ${formatNumber(lookups.last1h)}`}
        />
        <Stat
          label="SV đã tra cứu"
          value={formatNumber(lookups.uniqueFound)}
          hint={`${percent(lookups.uniqueFound, total)} danh sách`}
          tone="good"
        />
        <Stat
          label="Không tìm thấy"
          value={formatNumber(lookups.notFound)}
          hint={`${formatNumber(lookups.uniqueNotFound)} MSSV khác nhau · ${(notFoundRate * 100).toFixed(1)}%`}
          tone={notFoundRate > 0.2 ? "warn" : "default"}
        />
        <Stat
          label="Vấn đề dữ liệu"
          value={formatNumber(qualityIssues)}
          hint={qualityIssues ? "Xem mục chất lượng bên dưới" : "Không phát hiện vấn đề"}
          tone={qualityIssues ? "bad" : "good"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Lượt tra cứu 14 ngày"
          description={
            <>
              7 ngày gần nhất: {formatNumber(weekTotal)} lượt
              {weekDelta != null ? ` (${weekDelta >= 0 ? "+" : ""}${weekDelta.toFixed(0)}% so với tuần trước)` : ""}
              {busiestDay.total ? ` · Cao nhất ${dayLabel(busiestDay.day)}: ${formatNumber(busiestDay.total)}` : ""}
            </>
          }
        >
          <ColumnChart
            ariaLabel="Số lượt tra cứu theo ngày"
            data={data.daily.map((item) => ({
              key: item.day,
              label: dayLabel(item.day),
              value: item.total,
              tooltip: `${weekday(item.day)} ${dayLabel(item.day)}: ${formatNumber(item.total)} lượt · ${formatNumber(item.found)} tìm thấy · ${formatNumber(item.uniqueStudents)} SV`,
            }))}
            labelEvery={2}
          />
        </Card>
        <Card title="Độ phủ tra cứu" description="Tỉ lệ sinh viên trong danh sách đã tự tra cứu">
          <Ring value={lookups.uniqueFound} total={total} label={`${formatNumber(data.neverLookedUp)} SV chưa tra cứu`} />
          <ul className="mt-5 space-y-2 text-sm">
            {(
              [
                ["FOUND", lookups.found],
                ["NOT_FOUND", lookups.notFound],
                ["RATE_LIMITED", lookups.rateLimited],
                ["SERVER_ERROR", lookups.failed],
              ] as const
            ).map(([key, count]) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-muted">
                  {key === "SERVER_ERROR" ? "Lỗi khác" : OUTCOME_LABELS[key].label}
                </span>
                <span className="tabular-nums text-ink">
                  {formatNumber(count)} <span className="text-muted">· {percent(count, lookups.total)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Ghi nhận từ {formatDateTime(lookups.first)}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="24 giờ qua" description={`${formatNumber(lookups.last24h)} lượt tra cứu, theo từng giờ`}>
          <ColumnChart
            ariaLabel="Số lượt tra cứu theo giờ trong 24 giờ qua"
            data={data.recentHours.map((item) => {
              const hour = item.at.slice(11, 13);
              return {
                key: item.at,
                label: `${hour}h`,
                value: item.total,
                tooltip: `${hour}:00 ${dayLabel(item.at.slice(0, 10))}: ${formatNumber(item.total)} lượt`,
              };
            })}
            labelEvery={3}
            height={130}
          />
        </Card>
        <Card
          title="Khung giờ cao điểm"
          description={
            busiestHour.total
              ? `Tổng 7 ngày theo giờ trong ngày · Đông nhất ${busiestHour.hour}:00–${busiestHour.hour + 1}:00`
              : "Tổng 7 ngày theo giờ trong ngày"
          }
        >
          <ColumnChart
            ariaLabel="Số lượt tra cứu theo giờ trong ngày, 7 ngày qua"
            data={data.hours.map((item) => ({
              key: String(item.hour),
              label: `${item.hour}h`,
              value: item.total,
              tooltip: `${item.hour}:00–${item.hour + 1}:00: ${formatNumber(item.total)} lượt`,
            }))}
            labelEvery={3}
            height={130}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Mức độ đầy đủ theo trường"
          description="Bấm số thiếu để xem danh sách sinh viên cần bổ sung"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Trường</th>
                  <th className="w-1/2 pb-2 font-medium">Đã có</th>
                  <th className="pb-2 text-right font-medium">Thiếu</th>
                </tr>
              </thead>
              <tbody>
                {data.fields.map((item) => (
                  <tr key={item.field} className="border-t border-line/70">
                    <td className="py-2 pr-3 text-ink">{item.label}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efebe4]">
                          <div
                            className={`h-full rounded-full ${item.missing ? "bg-brand" : "bg-[#45664e]"}`}
                            style={{ width: total ? `${(item.filled / total) * 100}%` : 0 }}
                          />
                        </div>
                        <span className="w-14 text-right tabular-nums text-muted">{percent(item.filled, total)}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {item.missing ? (
                        <Link href={`/admin/students?missing=${item.field}`} className="text-brand-ink hover:underline">
                          {formatNumber(item.missing)}
                        </Link>
                      ) : (
                        <span className="text-[#45664e]">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Trạng thái hệ thống">
          <dl className="space-y-2.5 text-sm">
            <SystemRow label="Bảo trì" ok={!data.system.maintenance} value={data.system.maintenance ? `Đang bật${data.system.reopenAt ? ` · mở lại ${formatDateTime(new Date(data.system.reopenAt))}` : ""}` : "Tắt"} />
            <SystemRow label="Hiển thị email" ok value={data.system.emailMode === "full" ? "Đầy đủ (ẩn mặc định)" : "Che một phần"} />
            <SystemRow label="Turnstile" ok={data.system.turnstile} value={data.system.turnstile ? "Đang bật" : "Tắt"} />
            <SystemRow label="Giới hạn tra cứu" ok value={data.system.rateLimit} />
            <SystemRow label="MinIO (ảnh LED)" ok={data.system.minio} value={data.system.minio ? "Đã cấu hình" : "Chưa cấu hình"} />
            <SystemRow label="Form chỉnh sửa" ok={data.system.correctionForm} value={data.system.correctionForm ? "Có" : "Chưa đặt"} />
            <SystemRow label="Trust proxy" ok value={data.system.trustProxy ? "Bật" : "Tắt"} />
          </dl>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Phân bổ sinh viên</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(
          [
            ["sessionLabel", "Theo phiên"],
            ["checkinRoom", "Theo phòng check-in"],
            ["checkinTime", "Theo giờ check-in"],
            ["awardTime", "Theo giờ trao bằng"],
            ["contactGroup", "Theo nhóm liên lạc"],
          ] as const
        ).map(([field, title]) => (
          <Card
            key={field}
            title={title}
            description={`${formatNumber(data.distributions[field].filter((item) => item.label).length)} giá trị khác nhau`}
          >
            <MeterList items={toMeterItems(field, data.distributions[field])} total={total} />
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Chất lượng dữ liệu</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Kiểm tra tự động">
          <ul className="space-y-2.5 text-sm">
            <QualityRow label="Trùng số ghế (TCN/PH2)" count={data.duplicates.length} />
            <QualityRow label="Email sai định dạng" count={data.quality.invalidEmail} />
            <QualityRow label="Email dùng cho nhiều SV" count={data.quality.duplicateEmail} />
            <QualityRow label="Link thư mời không hợp lệ" count={data.quality.invalidInvitation} />
            <QualityRow label="Link Drive không hợp lệ" count={data.quality.invalidDrive} />
          </ul>
          <p className="mt-4 text-xs text-muted">
            {formatNumber(data.quality.ledExternal)} hình LED dùng link ngoài thay vì MinIO.
          </p>
          {data.duplicates.length ? (
            <div className="mt-4 max-h-56 overflow-y-auto rounded-md border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-paper text-left text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ghế</th>
                    <th className="px-3 py-2 font-medium">MSSV trùng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.duplicates.map((item) => (
                    <tr key={`${item.kind}-${item.seat}`} className="border-t border-line/70">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge tone="warn">{item.kind}</Badge> {item.seat}
                      </td>
                      <td className="px-3 py-2">
                        {item.codes.map((code, index) => (
                          <span key={code}>
                            {index ? ", " : ""}
                            <Link href={`/admin/students/${code}`} className="font-mono text-brand-ink hover:underline">
                              {code}
                            </Link>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
        <Card
          title="MSSV được tìm nhưng không có trong danh sách"
          description="Có thể là sinh viên bị thiếu trong dữ liệu"
        >
          {data.missed.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">MSSV</th>
                  <th className="pb-2 text-right font-medium">Số lần</th>
                  <th className="pb-2 text-right font-medium">Gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {data.missed.map((item) => (
                  <tr key={item.studentCode} className="border-t border-line/70">
                    <td className="py-2">
                      <span className="font-mono">{item.studentCode}</span>{" "}
                      {item.nowExists ? (
                        <Badge tone="good">Đã thêm</Badge>
                      ) : (
                        <Link
                          href={`/admin/students/new?code=${item.studentCode}`}
                          className="text-xs text-brand-ink hover:underline"
                        >
                          + Thêm
                        </Link>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(item.count)}</td>
                    <td className="py-2 text-right text-muted">{formatRelative(item.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState>Chưa có lượt tra cứu nào bị trượt.</EmptyState>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Sinh viên tra cứu nhiều nhất">
          {data.top.length ? (
            <ol className="space-y-2 text-sm">
              {data.top.map((item, index) => (
                <li key={item.studentCode} className="flex items-center gap-3">
                  <span className="w-5 text-right tabular-nums text-muted">{index + 1}</span>
                  <Link href={`/admin/students/${item.studentCode}`} className="min-w-0 flex-1 truncate hover:underline">
                    <span className="font-mono text-xs text-muted">{item.studentCode}</span>{" "}
                    {item.fullName ?? <em className="text-muted">(đã xoá)</em>}
                  </Link>
                  <span className="shrink-0 tabular-nums">{formatNumber(item.count)} lượt</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState>Chưa có lượt tra cứu.</EmptyState>
          )}
        </Card>
        <Card
          title="Hoạt động quản trị gần đây"
          action={
            <Link href="/admin/activity" className="text-xs text-brand-ink hover:underline">
              Xem tất cả
            </Link>
          }
        >
          {data.activity.length ? (
            <ul className="space-y-2.5 text-sm">
              {data.activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <Badge tone={item.action === "DELETE" ? "bad" : item.action === "IMPORT" ? "brand" : "neutral"}>
                    {AUDIT_LABELS[item.action] ?? item.action}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    {item.studentCode ? (
                      <Link href={`/admin/students/${item.studentCode}`} className="font-mono text-xs text-brand-ink hover:underline">
                        {item.studentCode}
                      </Link>
                    ) : null}
                    <p className="truncate text-muted">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{formatRelative(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Chưa có thay đổi nào.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}

function SystemRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${ok ? "text-ink" : "text-[#9a6a00]"}`}>{value}</dd>
    </div>
  );
}

function QualityRow({ label, count }: { label: string; count: number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-ink">
        {count ? (
          <AlertTriangle className="size-4 text-[#b42318]" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 text-[#45664e]" aria-hidden="true" />
        )}
        {label}
      </span>
      <span className={`tabular-nums ${count ? "font-medium text-[#b42318]" : "text-muted"}`}>
        {formatNumber(count)}
      </span>
    </li>
  );
}

