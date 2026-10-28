import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/nav";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-6">
          <Link href="/admin" className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">Convocation 2026</p>
            <p className="text-base font-semibold text-ink">Bảng quản trị</p>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button type="submit" className="rounded-md p-2 text-muted hover:bg-[#f3eee6]" aria-label="Đăng xuất">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <div className="px-3 pb-3 lg:flex-1 lg:px-3">
          <AdminNav />
        </div>
        <div className="hidden space-y-1 border-t border-line p-3 lg:block">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted hover:bg-[#f3eee6] hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Trang tra cứu
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted hover:bg-[#f3eee6] hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
