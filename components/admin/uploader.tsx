"use client";
import { useCallback, useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedAsset = { id: string; url: string; thumbUrl: string | null; blur: string | null; filename: string; width: number | null; height: number | null; size: number };

const BATCH = 4;
const MAX = 10 * 1024 * 1024;

/** Drag-and-drop / click-to-pick multi-image uploader. Uploads in small batches so progress is visible. */
export function Dropzone({
  onUploaded,
  multiple = true,
  compact,
  label = "Drop photos here or click to browse",
}: {
  onUploaded: (assets: UploadedAsset[]) => void;
  multiple?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const upload = useCallback(
    async (list: FileList | File[]) => {
      const all = Array.from(list);
      const errs: string[] = [];
      const files = all.filter((f) => {
        if (!f.type.startsWith("image/") && !/\.(heic|heif|avif)$/i.test(f.name)) return errs.push(`${f.name}: not an image`), false;
        if (f.size > MAX) return errs.push(`${f.name}: larger than 10 MB`), false;
        return true;
      });
      setErrors(errs);
      if (!files.length) return;
      setProgress({ done: 0, total: files.length });
      const uploaded: UploadedAsset[] = [];
      for (let i = 0; i < files.length; i += BATCH) {
        const chunk = files.slice(i, i + BATCH);
        const fd = new FormData();
        chunk.forEach((f) => fd.append("files", f));
        try {
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
          const json = await res.json().catch(() => ({}));
          if (json.assets) uploaded.push(...json.assets);
          if (json.errors?.length) errs.push(...json.errors);
          if (json.error) errs.push(json.error);
          if (!res.ok && !json.error && !json.errors?.length) errs.push(`Upload failed (${res.status})`);
        } catch {
          errs.push("Network error while uploading");
        }
        setProgress({ done: Math.min(i + BATCH, files.length), total: files.length });
        setErrors([...errs]);
      }
      setProgress(null);
      if (uploaded.length) onUploaded(uploaded);
    },
    [onUploaded]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
        className={cn(
          "grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed text-center transition",
          compact ? "px-4 py-6" : "px-6 py-10",
          over ? "border-brand bg-brand/5" : "border-silver hover:border-graphite dark:border-white/20 dark:hover:border-white/50"
        )}
      >
        {progress ? (
          <div className="flex items-center gap-3 text-sm font-medium"><Loader2 className="h-5 w-5 animate-spin text-brand" /> Uploading {progress.done}/{progress.total}…</div>
        ) : (
          <div>
            <UploadCloud className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-2 text-sm font-semibold text-charcoal dark:text-white">{label}</p>
            <p className="mt-1 text-xs">JPG, PNG, WebP, HEIC · up to 10 MB each · converted to WebP automatically</p>
          </div>
        )}
        <input ref={input} type="file" accept="image/*,.heic,.heif,.avif" multiple={multiple} hidden onChange={(e) => e.target.files && (upload(e.target.files), (e.target.value = ""))} />
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-xl bg-brand/10 px-4 py-3 text-xs font-medium text-brand">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
