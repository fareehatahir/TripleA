import { promises as fs } from "fs";
import path from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Storage driver: S3-compatible bucket when S3_BUCKET is set, otherwise local disk.
 * Keys look like "2026/10/abc123.webp". Public URLs are "/uploads/<key>" (local) or S3_PUBLIC_URL/<key>.
 */
const bucket = process.env.S3_BUCKET;
// Neon Object Storage injects the standard AWS_* variables; the S3_* ones (R2, S3, Vercel) win when both are set.
const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || undefined;
const publicBase = (process.env.S3_PUBLIC_URL || (endpoint && bucket ? `${endpoint.replace(/\/$/, "")}/${bucket}` : "")).replace(/\/$/, "");
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

let s3: S3Client | null = null;
function client() {
  s3 ??= new S3Client({
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? "auto",
    endpoint,
    forcePathStyle: !!endpoint, // Neon and R2 use path-style addressing
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
  return s3;
}

export const storageMode = bucket ? ("s3" as const) : ("local" as const);

export function publicUrl(key: string) {
  if (bucket) return `${publicBase}/${key}`;
  return `/uploads/${key}`;
}

/** Reverse of publicUrl, used when deleting. */
export function keyFromUrl(url: string) {
  if (bucket) return url.replace(publicBase + "/", "");
  return url.replace(/^\/uploads\//, "");
}

export function localPath(key: string) {
  const p = path.resolve(uploadDir, key);
  if (!p.startsWith(uploadDir + path.sep)) throw new Error("Invalid path"); // blocks ../ traversal
  return p;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (bucket) {
    await client().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
    return;
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

export async function deleteObject(key: string) {
  if (bucket) {
    await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  await fs.rm(localPath(key), { force: true });
}
