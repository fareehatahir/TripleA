import { cleanHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/** Renders admin-authored rich text. Sanitised again at render time as defence in depth. */
export function RichHtml({ html, className }: { html: string | null | undefined; className?: string }) {
  const clean = cleanHtml(html);
  if (!clean) return null;
  return <div className={cn("prose-rich", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
