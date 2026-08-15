const ALLOWED = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "p",
  "br",
  "div",
  "ul",
  "ol",
  "li",
]);

export function looksLikeHtml(value: string) {
  return /<\/?(p|div|br|b|i|u|strong|em|ul|ol|li)\b/i.test(value);
}

export function escapeText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function toEditorHtml(value: string) {
  if (value.trim().length === 0) return "";
  if (looksLikeHtml(value)) return sanitizeNoteHtml(value);
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeText(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function sanitizeNoteHtml(html: string) {
  return html
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/<(\/?)([a-z0-9]+)([^>]*)>/gi, (_match, slash: string, tag: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED.has(name)) return "";
      if (name === "br") return "<br>";
      return slash ? `</${name}>` : `<${name}>`;
    });
}

export function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function notePlainText(html: string) {
  return stripHtml(html);
}

export function noteWordCount(html: string) {
  const plain = stripHtml(html);
  if (plain.length === 0) return 0;
  return plain.split(/\s+/).length;
}
