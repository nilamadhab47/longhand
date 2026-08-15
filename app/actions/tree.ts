"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Direction = "up" | "down";

export async function moveFolder(folderId: string, direction: Direction) {
  const { userId } = await requireUser();
  await prisma.$transaction(async (tx) => {
    const folder = await tx.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) return;
    const siblings = await tx.folder.findMany({
      where: { userId, parentId: folder.parentId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    const next = reorder(siblings, folderId, direction);
    if (!next) return;
    for (const [position, row] of next.entries()) {
      await tx.folder.update({ where: { id: row.id }, data: { position } });
    }
  });
  revalidatePath("/", "layout");
}

export async function moveNote(noteId: string, direction: Direction) {
  const { userId } = await requireUser();
  await prisma.$transaction(async (tx) => {
    const note = await tx.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) return;
    const siblings = await tx.note.findMany({
      where: { userId, folderId: note.folderId },
      orderBy: [{ position: "asc" }, { title: "asc" }],
    });
    const next = reorder(siblings, noteId, direction);
    if (!next) return;
    for (const [position, row] of next.entries()) {
      await tx.note.update({ where: { id: row.id }, data: { position } });
    }
  });
  revalidatePath("/", "layout");
}

function reorder<T extends { id: string }>(
  siblings: T[],
  id: string,
  direction: Direction,
): T[] | null {
  const index = siblings.findIndex((row) => row.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return null;
  const next = [...siblings];
  const current = next[index];
  const other = next[target];
  if (!current || !other) return null;
  next[index] = other;
  next[target] = current;
  return next;
}
