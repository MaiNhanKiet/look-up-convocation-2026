import { Card } from "@/components/admin/ui";

export function DatabaseMissing() {
  return (
    <Card title="Chưa kết nối cơ sở dữ liệu">
      <p className="text-sm text-muted">
        Trang quản trị cần PostgreSQL. Đặt <code className="font-mono text-ink">DATABASE_URL</code> và chạy{" "}
        <code className="font-mono text-ink">npm run db:migrate</code>.
      </p>
    </Card>
  );
}
