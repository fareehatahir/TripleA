import sanitizeHtml from "sanitize-html";

/** Rich-text from the admin editor. Allow-list only; links forced to safe protocols and rel. */
export function cleanHtml(dirty: string | null | undefined) {
  if (!dirty) return null;
  const out = sanitizeHtml(dirty, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "a", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }) },
  }).trim();
  return out === "" || out === "<p></p>" ? null : out;
}

export const stripHtml = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
