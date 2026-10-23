import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { localPath } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Serves files from UPLOAD_DIR (local-disk mode). Files are content-addressed, so cache them forever.
export async function GET(_req: Request, props: { params: Promise<{ path: string[] }> }) {
  const params = await props.params;
  try {
    const key = params.path.join("/");
    if (!/^[\w\-./]+\.webp$/.test(key)) return new NextResponse("Not found", { status: 404 });
    const file = await fs.readFile(localPath(key));
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
