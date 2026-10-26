import { existsSync } from "node:fs";
import { Readable } from "node:stream";

import { Client } from "minio";

import {
  hasMinioCredentials,
  readMinioBucket,
  resolveInternalEndpoint,
  type MinioEndpoint,
} from "@/lib/minio/endpoint";
import { resolveLedImageAccess } from "@/lib/minio/led-access";
import type { LedImageAccessResult } from "@/lib/types/student";

const REGION = "us-east-1";

const clients = new Map<string, Client>();

export function isDockerRuntime(): boolean {
  return existsSync("/.dockerenv");
}

function clientFor(endpoint: MinioEndpoint): Client | null {
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();
  if (!accessKey || !secretKey) return null;

  const id = `${endpoint.useSSL ? "https" : "http"}://${endpoint.endPoint}:${endpoint.port}`;
  const cached = clients.get(id);
  if (cached) return cached;

  const client = new Client({
    endPoint: endpoint.endPoint,
    port: endpoint.port,
    useSSL: endpoint.useSSL,
    accessKey,
    secretKey,
    region: REGION,
  });
  clients.set(id, client);
  return client;
}

function internalClient(): Client | null {
  if (!hasMinioCredentials(process.env)) return null;
  const endpoint = resolveInternalEndpoint(process.env, isDockerRuntime());
  if (!endpoint) return null;
  return clientFor(endpoint);
}

export async function issueLedImageAccess(
  objectKey: string,
): Promise<LedImageAccessResult> {
  const client = internalClient();
  if (!client) return { status: "unavailable" };

  const bucket = readMinioBucket(process.env);
  try {
    await client.statObject(bucket, objectKey);
  } catch (error) {
    return { status: isMissingObject(error) ? "missing" : "unavailable" };
  }

  try {
    const access = await resolveLedImageAccess(objectKey, {
      env: process.env,
      now: Date.now(),
      signPublicUrl: async (endpoint, key, expiresSeconds) => {
        const publicClient = clientFor(endpoint);
        if (!publicClient) throw new Error("minio_unconfigured");
        return publicClient.presignedGetObject(bucket, key, expiresSeconds);
      },
    });
    return access
      ? { status: "ready", ...access }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export type LedObjectResult =
  | { ok: true; body: ReadableStream; contentType: string; size: number }
  | { ok: false; reason: "missing" | "unreachable" | "unconfigured" };

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String(error.code);
  return code === "NoSuchKey" || code === "NotFound" || code === "NoSuchBucket";
}

function contentTypeFrom(stat: { metaData?: Record<string, string> }, objectKey: string): string {
  const metadata = stat.metaData ?? {};
  const stored = metadata["content-type"] || metadata["Content-Type"];
  if (stored && !stored.toLowerCase().includes("html")) return stored;

  const extension = objectKey.split(".").pop()?.toLowerCase();
  if (extension === "webp") return "image/webp";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function readLedObject(objectKey: string): Promise<LedObjectResult> {
  const client = internalClient();
  if (!client) return { ok: false, reason: "unconfigured" };
  const bucket = readMinioBucket(process.env);

  try {
    const stat = await client.statObject(bucket, objectKey);
    const stream = await client.getObject(bucket, objectKey);
    return {
      ok: true,
      body: Readable.toWeb(stream) as ReadableStream,
      contentType: contentTypeFrom(stat, objectKey),
      size: stat.size,
    };
  } catch (error) {
    if (isMissingObject(error)) return { ok: false, reason: "missing" };
    return { ok: false, reason: "unreachable" };
  }
}
