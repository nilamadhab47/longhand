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

const SAFE_DATA_IMAGE =
  /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/i;
const MAX_DATA_IMAGE_CHARS = 480_000;

export function looksLikeHtml(value: string) {
  return /<\/?(p|div|br|b|i|u|strong|em|ul|ol|li|img)\b/i.test(value);
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
    .replace(
      /<(\/?)([a-z0-9]+)([^>]*)>/gi,
      (_match, slash: string, tag: string, attrs: string) => {
        const name = tag.toLowerCase();
        if (name === "img") {
          if (slash) return "";
          return sanitizeImgTag(attrs);
        }
        if (!ALLOWED.has(name)) return "";
        if (name === "br") return "<br>";
        return slash ? `</${name}>` : `<${name}>`;
      },
    );
}

function sanitizeImgTag(attrs: string) {
  const src = quotedAttr(attrs, "src");
  if (!src) return "";
  const compact = src.replace(/\s+/g, "");
  const allowedData =
    compact.length <= MAX_DATA_IMAGE_CHARS && SAFE_DATA_IMAGE.test(compact);
  if (!allowedData && !isAllowedRemoteImage(compact)) return "";
  const alt = quotedAttr(attrs, "alt") ?? "";
  const safeSrc = escapeText(compact).replace(/"/g, "&quot;");
  const safeAlt = escapeText(alt).replace(/"/g, "&quot;");
  return `<img src="${safeSrc}" alt="${safeAlt}">`;
}

function isAllowedRemoteImage(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".r2.dev") || host === "imagedelivery.net") return true;
    const bases = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return bases.some((base) => {
      const allowed = new URL(base);
      return url.origin === allowed.origin;
    });
  } catch {
    return false;
  }
}

function quotedAttr(attrs: string, name: string) {
  const match = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
  );
  return match ? (match[2] ?? match[3] ?? null) : null;
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
