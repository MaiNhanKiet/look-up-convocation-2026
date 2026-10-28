"use client";

import { Activity, FileUp, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/students", label: "Sinh viên", icon: Users },
  { href: "/admin/import", label: "Nhập CSV", icon: FileUp },
  { href: "/admin/activity", label: "Nhật ký", icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Quản trị" className="flex gap-1 overflow-x-auto lg:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-[#f7e9dc] text-brand-ink" : "text-muted hover:bg-[#f3eee6] hover:text-ink"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
