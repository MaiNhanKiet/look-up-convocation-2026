const LED_OBJECT_PATH = /^[A-Za-z0-9][A-Za-z0-9/_\-. ]*$/;

export function isSafeLedPath(path: string): boolean {
  if (path.length === 0 || path.length > 300) return false;
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    return false;
  }
  return LED_OBJECT_PATH.test(path);
}
