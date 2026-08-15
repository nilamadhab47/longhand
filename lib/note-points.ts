import { sanitizeNoteHtml, stripHtml, toEditorHtml } from "@/lib/html";

export type NotePoint = {
  id: string;
  html: string;
};

type PointsDoc = {
  v: 1;
  points: NotePoint[];
};

export function newPointId() {
  return crypto.randomUUID();
}

export function emptyPoint(): NotePoint {
  return { id: newPointId(), html: "" };
}

function isPoint(value: unknown): value is NotePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "html" in value &&
    typeof (value as NotePoint).id === "string" &&
    typeof (value as NotePoint).html === "string"
  );
}

function isPointsDoc(value: unknown): value is PointsDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    "v" in value &&
    (value as PointsDoc).v === 1 &&
    "points" in value &&
    Array.isArray((value as PointsDoc).points) &&
    (value as PointsDoc).points.every(isPoint)
  );
}

export function readPointsDoc(content: string): NotePoint[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isPointsDoc(parsed)) return parsed.points;
  } catch {
    return null;
  }
  return null;
}

export function parseNotePoints(content: string): NotePoint[] {
  const doc = readPointsDoc(content);
  if (doc) {
    return doc.filter((point) => stripHtml(point.html).length > 0);
  }
  if (content.trim().length === 0) return [];
  return [{ id: newPointId(), html: toEditorHtml(content) }];
}

export function serializeNotePoints(points: NotePoint[]): string {
  const doc: PointsDoc = {
    v: 1,
    points: points.map((point) => ({
      id: point.id,
      html: sanitizeNoteHtml(point.html),
    })),
  };
  return JSON.stringify(doc);
}

export function notesPlainText(content: string): string {
  const doc = readPointsDoc(content);
  if (doc) {
    return doc
      .map((point) => stripHtml(point.html))
      .filter((text) => text.length > 0)
      .join("\n\n");
  }
  return stripHtml(content);
}

export function notesWordCount(content: string): number {
  const plain = notesPlainText(content);
  if (plain.length === 0) return 0;
  return plain.split(/\s+/).length;
}

export function pointsPlainText(points: NotePoint[]): string {
  return points
    .map((point) => stripHtml(point.html))
    .filter((text) => text.length > 0)
    .join("\n\n");
}
