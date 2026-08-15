import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { scheduleReview } from "@/lib/srs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const quality =
    typeof body === "object" &&
    body !== null &&
    "quality" in body &&
    typeof body.quality === "number"
      ? body.quality
      : NaN;

  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    return NextResponse.json({ error: "Rate from 0 to 5." }, { status: 400 });
  }

  const note = await prisma.note.findFirst({
    where: { id, userId: session.userId },
  });
  if (!note) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }

  const next = scheduleReview(note, quality);
  await prisma.note.update({
    where: { id },
    data: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      nextReviewAt: next.nextReviewAt,
      lastReviewedAt: next.lastReviewedAt,
    },
  });

  return NextResponse.json({
    nextReviewAt: next.nextReviewAt.toISOString(),
    intervalDays: next.intervalDays,
  });
}
