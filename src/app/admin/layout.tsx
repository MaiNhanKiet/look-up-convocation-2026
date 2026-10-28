import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản trị · Graduation Ceremony 2026",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-ivory text-ink">{children}</div>;
}
