import { ExamPaper, Prisma, SectionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SECTION_ORDER: SectionKind[] = [
  SectionKind.KEYWORDS,
  SectionKind.QUOTATIONS,
  SectionKind.NOTES,
  SectionKind.QUESTIONS,
];

const ALIASES: Record<string, string> = {
  fr: "Fundamental Rights",
  dpsp: "Directive Principles of State Policy",
  fd: "Fundamental Duties",
  cab: "Cabinet",
  je: "Judiciary",
  le: "Legislature",
  ex: "Executive",
  p1: "Paper 1",
  p2: "Paper 2",
  ir: "International Relations",
};

type Db = Prisma.TransactionClient | typeof prisma;

export type ParsedPath =
  | { ok: true; folders: string[]; topic: string | null }
  | { ok: false; error: string };

export type ScaffoldResult =
  | { ok: true; sectionId: string | null; created: boolean }
  | { ok: false; error: string };

export function parseTopicPath(raw: string): ParsedPath {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Type a path — for example polity/fr/article 19.",
    };
  }

  const foldersOnly = trimmed.endsWith("/");
  const parts = trimmed
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return {
      ok: false,
      error: "Type a path — for example polity/fr/article 19.",
    };
  }

  const resolved = parts.map(resolveSegment);

  if (foldersOnly) {
    if (resolved.length > 2) {
      return { ok: false, error: "At most two folder levels." };
    }
    return { ok: true, folders: resolved, topic: null };
  }

  if (resolved.length < 2) {
    return {
      ok: false,
      error: "A topic needs a folder. Try polity/fr/article 19.",
    };
  }

  const topic = resolved[resolved.length - 1] ?? "";
  const folders = resolved.slice(0, -1);
  if (folders.length > 2) {
    return {
      ok: false,
      error: "At most two folder levels before the topic.",
    };
  }
  return { ok: true, folders, topic };
}

export function resolveSegment(raw: string): string {
  const alias = ALIASES[raw.trim().toLowerCase()];
  return alias ?? titleCaseSegment(raw.trim());
}

export function titleCaseSegment(input: string): string {
  return input
    .split(/\s+/)
    .map((word) => {
      if (word.length > 1 && word === word.toUpperCase() && /[A-Z]/.test(word)) {
        return word;
      }
      const titled = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      return titled.replace(
        /(\d+)([a-z]+)$/i,
        (_match, digits: string, letters: string) =>
          `${digits}${letters.toUpperCase()}`,
      );
    })
    .join(" ");
}

export async function ensureSections(db: Db, noteId: string) {
  const existing = await db.noteSection.findMany({
    where: { noteId },
    select: { kind: true },
  });
  const have = new Set(existing.map((section) => section.kind));
  const missing = SECTION_ORDER.filter((kind) => !have.has(kind));
  if (missing.length === 0) return;

  await db.noteSection.createMany({
    data: missing.map((kind) => ({
      noteId,
      kind,
      position: SECTION_ORDER.indexOf(kind),
    })),
  });
}

export async function createTopicPath(
  userId: string,
  rawPath: string,
): Promise<ScaffoldResult> {
  const parsed = parseTopicPath(rawPath);
  if (!parsed.ok) return parsed;

  return prisma.$transaction(async (tx) => {
    let parentId: string | null = null;
    let parentPaper: ExamPaper | null = null;
    let created = false;

    for (const [index, name] of parsed.folders.entries()) {
      const folder = await getOrCreateFolder(
        tx,
        userId,
        name,
        parentId,
        index,
        parentPaper,
      );
      parentId = folder.id;
      parentPaper = folder.defaultPaper;
      created = created || folder.created;
    }

    if (!parsed.topic) {
      return { ok: true, sectionId: null, created };
    }
    if (!parentId) {
      return {
        ok: false,
        error: "A topic needs a folder. Try polity/fr/article 19.",
      };
    }

    const existingNote = await tx.note.findUnique({
      where: { folderId_title: { folderId: parentId, title: parsed.topic } },
    });

    if (existingNote) {
      if (existingNote.userId !== userId) {
        return { ok: false, error: "That topic does not belong to you." };
      }
      await ensureSections(tx, existingNote.id);
      const sectionId = await sectionIdByKind(tx, existingNote.id, SectionKind.NOTES);
      return { ok: true, sectionId, created: false };
    }

    const maxNote = await tx.note.aggregate({
      where: { folderId: parentId },
      _max: { position: true },
    });
    const note = await tx.note.create({
      data: {
        userId,
        folderId: parentId,
        title: parsed.topic,
        paper: parentPaper ?? ExamPaper.GS2,
        position: (maxNote._max.position ?? -1) + 1,
        sections: {
          create: SECTION_ORDER.map((kind, position) => ({ kind, position })),
        },
      },
    });
    const sectionId = await sectionIdByKind(tx, note.id, SectionKind.NOTES);
    return { ok: true, sectionId, created: true };
  });
}

export async function createTopicInFolder(
  userId: string,
  folderId: string,
  rawTitle: string,
): Promise<ScaffoldResult> {
  const title = titleCaseSegment(rawTitle.trim());
  if (title.length === 0) {
    return { ok: false, error: "Give the topic a name." };
  }

  return prisma.$transaction(async (tx) => {
    const folder = await tx.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) {
      return { ok: false, error: "Folder not found." };
    }

    const existing = await tx.note.findUnique({
      where: { folderId_title: { folderId, title } },
    });
    if (existing) {
      await ensureSections(tx, existing.id);
      const sectionId = await sectionIdByKind(
        tx,
        existing.id,
        SectionKind.NOTES,
      );
      return { ok: true, sectionId, created: false };
    }

    const maxNote = await tx.note.aggregate({
      where: { folderId },
      _max: { position: true },
    });
    const note = await tx.note.create({
      data: {
        userId,
        folderId,
        title,
        paper: folder.defaultPaper ?? ExamPaper.GS2,
        position: (maxNote._max.position ?? -1) + 1,
        sections: {
          create: SECTION_ORDER.map((kind, position) => ({ kind, position })),
        },
      },
    });
    const sectionId = await sectionIdByKind(tx, note.id, SectionKind.NOTES);
    return { ok: true, sectionId, created: true };
  });
}

function paperForFolder(
  name: string,
  parentPaper: ExamPaper | null,
): ExamPaper {
  const lower = name.toLowerCase();
  if (lower === "anthropology" || lower.startsWith("paper ")) {
    return ExamPaper.OPTIONAL_ANTHROPOLOGY;
  }
  return parentPaper ?? ExamPaper.GS2;
}

async function getOrCreateFolder(
  tx: Prisma.TransactionClient,
  userId: string,
  name: string,
  parentId: string | null,
  depth: number,
  parentPaper: ExamPaper | null,
): Promise<{ id: string; defaultPaper: ExamPaper | null; created: boolean }> {
  const existing = await tx.folder.findFirst({
    where: { userId, parentId, name },
    select: { id: true, defaultPaper: true },
  });
  if (existing) {
    return {
      id: existing.id,
      defaultPaper: existing.defaultPaper ?? parentPaper,
      created: false,
    };
  }

  const max = await tx.folder.aggregate({
    where: { userId, parentId },
    _max: { position: true },
  });
  const folder = await tx.folder.create({
    data: {
      userId,
      name,
      parentId,
      depth,
      position: (max._max.position ?? -1) + 1,
      defaultPaper: paperForFolder(name, parentPaper),
    },
    select: { id: true, defaultPaper: true },
  });
  return { id: folder.id, defaultPaper: folder.defaultPaper, created: true };
}

async function sectionIdByKind(db: Db, noteId: string, kind: SectionKind) {
  const section = await db.noteSection.findFirst({
    where: { noteId, kind },
    select: { id: true },
  });
  return section?.id ?? null;
}
