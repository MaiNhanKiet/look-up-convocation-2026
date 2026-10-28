import Link from "next/link";

import { formatNumber, percent } from "@/components/admin/ui";

export type Column = { key: string; label: string; value: number; tooltip: string };

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value) ?? 10;
  return step * magnitude;
}

// Single-series column chart with a hover tooltip per column.
export function ColumnChart({
  data,
  labelEvery = 1,
  height = 160,
  ariaLabel,
}: {
  data: Column[];
  labelEvery?: number;
  height?: number;
  ariaLabel: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((item) => item.value)));
  const ticks = [max, max / 2, 0];

  return (
    <figure aria-label={ariaLabel} className="w-full">
      <div className="flex gap-2">
        <div
          className="flex flex-col justify-between text-right text-[10px] tabular-nums text-muted"
          style={{ height }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-my-1.5 leading-3">
              {formatNumber(Math.round(tick))}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} className="block border-t border-dashed border-line/80" />
            ))}
          </div>
          <ol className="relative flex items-end gap-[2px]" style={{ height }}>
            {data.map((item) => (
              <li key={item.key} className="group relative flex h-full flex-1 items-end justify-center">
                <span
                  className="block w-full max-w-7 rounded-t-[4px] bg-brand transition-colors group-hover:bg-brand-deep"
                  style={{
                    height: item.value ? `max(2px, ${(item.value / max) * 100}%)` : 0,
                  }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                  {item.tooltip}
                </span>
                <span className="sr-only">{item.tooltip}</span>
              </li>
            ))}
          </ol>
          <ol className="mt-1.5 flex gap-[2px] text-[10px] text-muted" aria-hidden="true">
            {data.map((item, index) => (
              <li key={item.key} className="flex-1 truncate text-center">
                {index % labelEvery === 0 ? item.label : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  );
}

export type MeterItem = { label: string; count: number; href?: string; muted?: boolean };

export function MeterList({
  items,
  total,
  limit = 8,
  emptyText = "Chưa có dữ liệu.",
}: {
  items: MeterItem[];
  total: number;
  limit?: number;
  emptyText?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted">{emptyText}</p>;
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  const restCount = rest.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-2.5">
      {shown.map((item) => {
        const label = (
          <span className={`truncate ${item.muted ? "italic text-muted" : "text-ink"}`}>{item.label}</span>
        );
        return (
          <li key={item.label} className="text-sm">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              {item.href ? (
                <Link href={item.href} className="min-w-0 truncate hover:underline">
                  {label}
                </Link>
              ) : (
                label
              )}
              <span className="shrink-0 tabular-nums text-muted">
                {formatNumber(item.count)} · {percent(item.count, total)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#efebe4]">
              <div
                className={`h-full rounded-full ${item.muted ? "bg-muted/50" : "bg-brand"}`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
      {rest.length ? (
        <li className="text-xs text-muted">
          +{rest.length} nhóm khác · {formatNumber(restCount)} sinh viên
        </li>
      ) : null}
    </ul>
  );
}

export function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const ratio = total ? value / total : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#efebe4" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${ratio * circumference} ${circumference}`}
        />
      </svg>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-ink">{percent(value, total)}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
