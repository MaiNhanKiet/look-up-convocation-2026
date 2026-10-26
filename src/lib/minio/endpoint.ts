export type MinioEndpoint = {
  endPoint: string;
  port: number;
  useSSL: boolean;
};

export type MinioEnv = {
  MINIO_ENDPOINT?: string;
  MINIO_PORT?: string;
  MINIO_USE_SSL?: string;
  MINIO_DOCKER_ENDPOINT?: string;
  MINIO_PUBLIC_ENDPOINT?: string;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET?: string;
  RATE_LIMIT_SALT?: string;
  [key: string]: string | undefined;
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase().replace(/^\[|\]$/g, ""));
}

function finitePort(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
}

function parseAddress(
  raw: string,
  defaults: { port: number; useSSL: boolean },
): MinioEndpoint | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.includes("://")) {
    try {
      const url = new URL(value);
      if (!url.hostname) return null;
      const port = url.port
        ? finitePort(url.port, defaults.port)
        : url.protocol === "https:"
          ? 443
          : defaults.port;
      return {
        endPoint: url.hostname,
        port,
        useSSL: url.protocol === "https:",
      };
    } catch {
      return null;
    }
  }

  return {
    endPoint: value,
    port: defaults.port,
    useSSL: defaults.useSSL,
  };
}

export function resolveInternalEndpoint(
  env: MinioEnv,
  docker: boolean,
): MinioEndpoint | null {
  const parsed = parseAddress(env.MINIO_ENDPOINT ?? "", {
    port: finitePort(env.MINIO_PORT, 9000),
    useSSL: env.MINIO_USE_SSL === "true",
  });
  if (!parsed) return null;

  if (docker && isLoopbackHost(parsed.endPoint)) {
    const dockerHost = env.MINIO_DOCKER_ENDPOINT?.trim() || "minio";
    return { endPoint: dockerHost, port: parsed.port, useSSL: false };
  }

  return parsed;
}

export function resolvePublicEndpoint(env: MinioEnv): MinioEndpoint | null {
  const raw = env.MINIO_PUBLIC_ENDPOINT?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || !url.hostname || isLoopbackHost(url.hostname)) {
    return null;
  }

  return {
    endPoint: url.hostname,
    port: url.port ? finitePort(url.port, 443) : 443,
    useSSL: true,
  };
}

export function readMinioBucket(env: MinioEnv): string {
  return env.MINIO_BUCKET?.trim() || "led-images";
}

export function hasMinioCredentials(env: MinioEnv): boolean {
  return Boolean(env.MINIO_ACCESS_KEY?.trim() && env.MINIO_SECRET_KEY?.trim());
}
