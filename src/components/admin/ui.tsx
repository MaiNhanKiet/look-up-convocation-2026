import type { ReactNode } from "react";

const TZ = "Asia/Ho_Chi_Minh";

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "Chưa có";
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return `${Math.floor(seconds / 86_400)} ngày trước`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  const value = (part / whole) * 100;
  return `${value >= 99.95 || value === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-paper p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const hintTone = {
    default: "text-muted",
    good: "text-[#45664e]",
    warn: "text-[#9a6a00]",
    bad: "text-[#b42318]",
  }[tone];
  return (
    <div className="min-w-0 rounded-lg border border-line bg-paper p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className={`mt-1 text-xs ${hintTone}`}>{hint}</p> : null}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-[#efebe4] text-ink",
  good: "bg-[#e5efe7] text-[#2f5138]",
  warn: "bg-[#fbf0d4] text-[#7a5300]",
  bad: "bg-[#fde8e6] text-[#9b1c13]",
  brand: "bg-[#f7e9dc] text-brand-ink",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export const OUTCOME_LABELS: Record<string, { label: string; tone: keyof typeof BADGE_TONES }> = {
  FOUND: { label: "Tìm thấy", tone: "good" },
  NOT_FOUND: { label: "Không tìm thấy", tone: "warn" },
  RATE_LIMITED: { label: "Bị giới hạn", tone: "bad" },
  INVALID_STUDENT_CODE: { label: "MSSV sai", tone: "neutral" },
  INVALID_PAYLOAD: { label: "Yêu cầu lỗi", tone: "neutral" },
  TURNSTILE_FAILED: { label: "Captcha lỗi", tone: "bad" },
  UNAVAILABLE: { label: "Không khả dụng", tone: "bad" },
  SERVER_ERROR: { label: "Lỗi máy chủ", tone: "bad" },
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const meta = OUTCOME_LABELS[outcome] ?? { label: outcome, tone: "neutral" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export const AUDIT_LABELS: Record<string, string> = {
  CREATE: "Thêm",
  UPDATE: "Sửa",
  DELETE: "Xoá",
  IMPORT: "Nhập CSV",
};

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton = `${buttonClass} bg-brand text-white hover:bg-brand-deep`;
export const secondaryButton = `${buttonClass} border border-line bg-paper text-ink hover:bg-[#f3eee6]`;
export const dangerButton = `${buttonClass} border border-[#f1c0bb] bg-paper text-[#b42318] hover:bg-[#fde8e6]`;
export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
