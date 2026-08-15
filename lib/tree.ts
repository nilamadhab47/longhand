import { SectionKind } from "@prisma/client";
import { notesPlainText } from "@/lib/note-points";
import { prisma } from "@/lib/prisma";
import type { TreeFolder, TreeNote, TreeSection } from "@/lib/tree-types";

export type { TreeFolder, TreeNote, TreeSection };

export async function loadTree(userId: string): Promise<TreeFolder[]> {
  const [folders, notes] = await Promise.all([
    prisma.folder.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: [{ position: "asc" }, { title: "asc" }],
      include: {
        sections: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            kind: true,
            keywords: true,
            content: true,
            _count: { select: { quotations: true } },
          },
        },
        _count: { select: { questions: true } },
      },
    }),
  ]);

  const now = Date.now();
  const notesByFolder = new Map<string, TreeNote[]>();
  for (const note of notes) {
    const mapped: TreeNote = {
      id: note.id,
      title: note.title,
      folderId: note.folderId,
      position: note.position,
      due: note.nextReviewAt !== null && note.nextReviewAt.getTime() <= now,
      sections: note.sections.map((section) => ({
        id: section.id,
        kind: section.kind,
        empty: isEmpty(section, note._count.questions),
      })),
    };
    const list = notesByFolder.get(note.folderId) ?? [];
    list.push(mapped);
    notesByFolder.set(note.folderId, list);
  }

  const byParent = new Map<string | null, typeof folders>();
  for (const folder of folders) {
    const list = byParent.get(folder.parentId) ?? [];
    list.push(folder);
    byParent.set(folder.parentId, list);
  }

  function nest(parentId: string | null): TreeFolder[] {
    return (byParent.get(parentId) ?? []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      depth: folder.depth,
      position: folder.position,
      children: nest(folder.id),
      notes: notesByFolder.get(folder.id) ?? [],
    }));
  }

  return nest(null);
}

function isEmpty(
  section: {
    kind: SectionKind;
    keywords: string[];
    content: string | null;
    _count: { quotations: number };
  },
  questionCount: number,
): boolean {
  switch (section.kind) {
    case SectionKind.KEYWORDS:
      return section.keywords.length === 0;
    case SectionKind.QUOTATIONS:
      return section._count.quotations === 0;
    case SectionKind.NOTES:
      return notesPlainText(section.content ?? "").length === 0;
    case SectionKind.QUESTIONS:
      return questionCount === 0;
  }
}
