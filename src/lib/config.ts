export type DataSourceKind = "postgres" | "demo" | "unconfigured";

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function resolveDataSource(): DataSourceKind {
  if (hasDatabaseUrl()) return "postgres";
  if (process.env.NODE_ENV === "production") return "unconfigured";
  return "demo";
}

export function isDemoLookup(): boolean {
  return resolveDataSource() === "demo";
}

export type EmailMode = "full" | "masked" | "hidden";

export function readEmailMode(): EmailMode {
  const value = process.env.PUBLIC_EMAIL_MODE?.trim().toLowerCase();
  if (value === "masked" || value === "hidden") return value;
  return "full";
}

export function readRateLimitConfig(): { limit: number; windowSeconds: number } {
  const limit = Number(process.env.LOOKUP_RATE_LIMIT ?? 8);
  const windowSeconds = Number(process.env.LOOKUP_RATE_WINDOW_SECONDS ?? 60);
  return {
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8,
    windowSeconds:
      Number.isFinite(windowSeconds) && windowSeconds > 0
        ? Math.floor(windowSeconds)
        : 60,
  };
}

export function isMaintenanceMode(): boolean {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

const REOPEN_AT_PATTERN = /^(\d{2})-(\d{2})-(\d{2})-(\d{4})$/;
const HCMC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function parseMaintenanceReopenAt(raw: string | undefined): number | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = REOPEN_AT_PATTERN.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const day = Number(match[2]);
  const month = Number(match[3]);
  const year = Number(match[4]);
  if (hour > 23 || month < 1 || month > 12 || day < 1) return null;

  const utcMs = Date.UTC(year, month - 1, day, hour, 0, 0) - HCMC_OFFSET_MS;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(new Date(utcMs));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  if (
    pick("year") !== year ||
    pick("month") !== month ||
    pick("day") !== day ||
    pick("hour") !== hour
  ) {
    return null;
  }

  return utcMs;
}

export function readMaintenanceReopenAt(): number | null {
  return parseMaintenanceReopenAt(process.env.MAINTENANCE_REOPEN_AT);
}

export function readCorrectionFormUrl(): string | null {
  const raw = process.env.CORRECTION_FORM_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
