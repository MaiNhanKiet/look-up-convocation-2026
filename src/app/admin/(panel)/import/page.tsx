import { connection } from "next/server";

import { DatabaseMissing } from "@/components/admin/database-missing";
import { ImportPanel } from "@/components/admin/import-panel";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/session";
import { CSV_COLUMNS, FIELD_LABELS } from "@/lib/admin/students";
import { hasDatabaseUrl } from "@/lib/config";

export const instant = false;

export default async function ImportPage() {
  await connection();
  await requireAdmin();
  if (!hasDatabaseUrl()) return <DatabaseMissing />;

  return (
    <>
      <PageHeader
        title="Nhập CSV"
        description="Kiểm tra trước, sau đó nhập. MSSV đã có sẽ được cập nhật theo tệp."
        actions={
          <a href="/api/admin/export" className="text-sm text-brand-ink hover:underline">
            Tải dữ liệu hiện tại làm mẫu
          </a>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ImportPanel />
        <Card title="Cột được hỗ trợ" description="Tên cột không phân biệt hoa thường">
          <ul className="space-y-1.5 text-sm">
            {CSV_COLUMNS.map((column) => (
              <li key={column.header} className="flex justify-between gap-3">
                <code className="font-mono text-xs text-ink">{column.header}</code>
                <span className="text-muted">{FIELD_LABELS[column.field]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Cũng nhận tên tiếng Việt: mssv, ho_ten, so_ghe_tcn, gio_checkin, link_drive, hinh_led…
          </p>
        </Card>
      </div>
    </>
  );
}
