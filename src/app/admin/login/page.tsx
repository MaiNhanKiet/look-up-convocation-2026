import { redirect } from "next/navigation";
import { connection } from "next/server";

import { LoginForm } from "@/app/admin/login/login-form";
import { hasAdminSession, readAdminPassword } from "@/lib/admin/session";

export const instant = false;

export default async function AdminLoginPage() {
  await connection();
  if (await hasAdminSession()) redirect("/admin");
  const configured = Boolean(readAdminPassword());

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-paper p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Convocation 2026</p>
        <h1 className="mb-6 mt-1 text-xl font-semibold text-ink">Đăng nhập quản trị</h1>
        {configured ? (
          <LoginForm />
        ) : (
          <p className="text-sm text-muted">
            Trang quản trị đang tắt. Đặt biến môi trường <code className="font-mono text-ink">ADMIN_PASSWORD</code>{" "}
            (tối thiểu 8 ký tự) rồi khởi động lại ứng dụng.
          </p>
        )}
      </div>
    </div>
  );
}
