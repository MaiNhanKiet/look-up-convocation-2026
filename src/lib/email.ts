export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return "Đã ẩn";
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, 1);
  const stars = "*".repeat(Math.max(3, Math.min(6, local.length - 1)));
  return `${visible}${stars}@${domain}`;
}
