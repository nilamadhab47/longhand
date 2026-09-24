"use server";

import {
  QuestionKind,
  QuestionOrigin,
  QuotationSource,
  SectionKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { escapeText } from "@/lib/html";
import { parseNotePoints, serializeNotePoints } from "@/lib/note-points";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  routePasted,
  type RouteResult,
  type RoutedQuestion,
  type RoutedQuotation,
} from "@/lib/smartPaste";

export async function routePaste(input: {
  text: string;
}): Promise<RouteResult | { error: string }> {
  const { userId } = await requireUser();
  const text = input.text.trim();
  if (text.length === 0) {
    return { error: "Nothing to route." };
  }

  const topics = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: { title: true },
  });

  return routePasted({
    text,
    topicTitles: topics.map((topic) => topic.title),
  });
}

export async function commitRoutedPaste(input: {
  sectionId: string;
  keywords: string[];
  quotations: RoutedQuotation[];
  questions: RoutedQuestion[];
}) {
  const { userId } = await requireUser();
  const section = await prisma.noteSection.findFirst({
    where: { id: input.sectionId, note: { userId } },
    include: { note: { include: { sections: true } } },
  });
  if (!section) {
    return { ok: false as const, error: "Topic not found." };
  }

  const byKind = new Map(
    section.note.sections.map((file) => [file.kind, file]),
  );
  const keywordsFile = byKind.get(SectionKind.KEYWORDS);
  const quotationsFile = byKind.get(SectionKind.QUOTATIONS);
  const questionsFile = byKind.get(SectionKind.QUESTIONS);

  if (keywordsFile && input.keywords.length > 0) {
    const have = new Set(
      keywordsFile.keywords.map((item) => item.toLowerCase()),
    );
    const next = [...keywordsFile.keywords];
    for (const keyword of input.keywords) {
      const trimmed = keyword.trim();
      if (trimmed.length === 0 || have.has(trimmed.toLowerCase())) continue;
      have.add(trimmed.toLowerCase());
      next.push(trimmed);
    }
    await prisma.noteSection.update({
      where: { id: keywordsFile.id },
      data: { keywords: next },
    });
  }

  if (quotationsFile) {
    const max = await prisma.quotation.aggregate({
      where: { sectionId: quotationsFile.id },
      _max: { position: true },
    });
    let position = (max._max.position ?? -1) + 1;
    for (const quotation of input.quotations) {
      const text = quotation.text.trim();
      const attributedTo = quotation.attributedTo.trim();
      if (text.length === 0 || attributedTo.length === 0) continue;
      const sourceType = isSource(quotation.sourceType)
        ? quotation.sourceType
        : QuotationSource.OTHER;
      await prisma.quotation.create({
        data: {
          sectionId: quotationsFile.id,
          text,
          attributedTo,
          sourceType,
          year: quotation.year,
          position,
        },
      });
      position += 1;
    }
  }

  if (questionsFile) {
    for (const question of input.questions) {
      const stem = question.stem.trim();
      if (stem.length < 8) continue;
      const kind = isKind(question.kind)
        ? question.kind
        : QuestionKind.MAINS_DESCRIPTIVE;
      const isMcq =
        kind === QuestionKind.MCQ || kind === QuestionKind.PRELIMS_STATEMENT;
      const options = isMcq
        ? question.options.map((option) => option.trim()).filter(Boolean)
        : [];
      const answerIndex =
        isMcq &&
        question.answerIndex !== null &&
        question.answerIndex >= 0 &&
        question.answerIndex < options.length
          ? [question.answerIndex]
          : [];
      await prisma.question.create({
        data: {
          userId,
          noteId: section.noteId,
          kind,
          origin: QuestionOrigin.AI_EXTRACTED,
          stem,
          options,
          correctIndices: answerIndex,
        },
      });
    }
  }

  revalidatePath("/", "layout");
  revalidatePath(`/n/${input.sectionId}`);
  return { ok: true as const };
}

export async function appendNotePoints(
  sectionId: string,
  bullets: string[],
) {
  const { userId } = await requireUser();
  const section = await prisma.noteSection.findFirst({
    where: { id: sectionId, note: { userId } },
    select: { noteId: true },
  });
  if (!section) return;

  const notes = await prisma.noteSection.findFirst({
    where: { noteId: section.noteId, kind: SectionKind.NOTES },
  });
  if (!notes) return;

  const points = parseNotePoints(notes.content ?? "");
  for (const bullet of bullets) {
    const text = bullet.trim();
    if (text.length === 0) continue;
    points.push({
      id: crypto.randomUUID(),
      html: `<p>${escapeText(text)}</p>`,
    });
  }
  await prisma.noteSection.update({
    where: { id: notes.id },
    data: { content: serializeNotePoints(points) },
  });
  revalidatePath("/", "layout");
  revalidatePath(`/n/${notes.id}`);
  revalidatePath(`/n/${sectionId}`);
}

function isSource(value: string): value is QuotationSource {
  return (Object.values(QuotationSource) as string[]).includes(value);
}

function isKind(value: string): value is QuestionKind {
  return (Object.values(QuestionKind) as string[]).includes(value);
}
