"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { scheduleReview } from "@/lib/srs";
import { requireUser } from "@/lib/session";

export async function submitReview(noteId: string, quality: number) {
  const { userId } = await requireUser();
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    return { ok: false as const, error: "Rate from 0 to 5." };
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId },
  });
  if (!note) {
    return { ok: false as const, error: "Topic not found." };
  }

  const next = scheduleReview(note, quality);
  await prisma.note.update({
    where: { id: noteId },
    data: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      nextReviewAt: next.nextReviewAt,
      lastReviewedAt: next.lastReviewedAt,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/");
  return { ok: true as const, nextReviewAt: next.nextReviewAt.toISOString() };
}
