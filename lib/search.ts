import { stripHtml } from "@/lib/html";
import { notesPlainText } from "@/lib/note-points";

export type SearchHit = {
  noteId: string;
  sectionId: string;
  title: string;
  folder: string;
  snippet: string;
  matched: "title" | "content" | "keyword" | "quotation" | "question";
};

export function buildSnippet(source: string, query: string, radius = 60) {
  const plain = source.includes("<") ? notesPlainText(source) || stripHtml(source) : source;
  const flat = plain.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "";
  const idx = flat.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return flat.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(flat.length, idx + query.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < flat.length ? "…" : "";
  return `${prefix}${flat.slice(start, end)}${suffix}`;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .split(/[^a-z0-9']+/i)
    .filter((token) => token.length >= 3);
}

export function collectPrefixMatches(
  source: string,
  prefix: string,
  bucket: Map<string, number>,
  weight = 1,
) {
  const lowerPrefix = prefix.toLowerCase();
  for (const token of tokenize(source)) {
    if (token.startsWith(lowerPrefix) && token !== lowerPrefix) {
      bucket.set(token, (bucket.get(token) ?? 0) + weight);
    }
  }
}
