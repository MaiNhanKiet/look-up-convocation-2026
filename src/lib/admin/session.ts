import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export function readAdminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value && value.length >= 8 ? value : null;
}

function sessionSecret(): string | null {
  const password = readAdminPassword();
  if (!password) return null;
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  // Rotating ADMIN_PASSWORD also invalidates sessions when no secret is set.
  return configured || `${password}:${process.env.RATE_LIMIT_SALT ?? ""}`;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminPassword(input: string): boolean {
  const password = readAdminPassword();
  if (!password) return false;
  // Compare digests so the length of the password is not leaked.
  const digest = (value: string) =>
    createHmac("sha256", "admin-password").update(value).digest("hex");
  return safeEqual(digest(input), digest(password));
}

export function createSessionToken(now = Date.now()): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const [version, expires, signature] = token.split(".");
  if (version !== "v1" || !expires || !signature) return false;
  if (!safeEqual(signature, sign(`${version}.${expires}`, secret))) return false;
  return Number(expires) * 1000 > now;
}

export async function setAdminSession(): Promise<boolean> {
  const token = createSessionToken();
  if (!token) return false;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return true;
}

export async function clearAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function hasAdminSession(): Promise<boolean> {
  return isValidSessionToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

// Call at the top of every admin page and Server Function.
export async function requireAdmin(): Promise<void> {
  if (!(await hasAdminSession())) redirect("/admin/login");
}
