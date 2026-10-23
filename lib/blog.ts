import { stripHtml } from "@/lib/sanitize";

export const readingMinutes = (html: string) => Math.max(1, Math.round(stripHtml(html).split(/\s+/).filter(Boolean).length / 200));
export const tagsOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : []);
/** Public posts: published and not scheduled for the future. */
export const livePost = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });
