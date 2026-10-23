import { promises as fs } from "fs";
import path from "path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Storage driver: S3-compatible bucket when S3_BUCKET is set, otherwise local disk.
 * Keys look like "2026/10/abc123.webp". Public URLs are "/uploads/<key>" (local) or S3_PUBLIC_URL/<key>.
 */
const bucket = process.env.S3_BUCKET;
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

let s3: S3Client | null = null;
function client() {
  s3 ??= new S3Client({
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  return s3;
}

export const storageMode = bucket ? ("s3" as const) : ("local" as const);

export function publicUrl(key: string) {
  if (bucket) return `${(process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
  return `/uploads/${key}`;
}

/** Reverse of publicUrl, used when deleting. */
export function keyFromUrl(url: string) {
  if (bucket) return url.replace((process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "") + "/", "");
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
