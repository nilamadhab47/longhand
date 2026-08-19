"use server";

import {
  QuestionKind,
  QuestionOrigin,
  QuotationSource,
  SectionKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notesPlainText, parseNotePoints, serializeNotePoints } from "@/lib/note-points";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function ownedSection(sectionId: string, userId: string) {
  return prisma.noteSection.findFirst({
    where: { id: sectionId, note: { userId } },
    include: { note: true },
  });
}

function refresh(sectionId: string) {
  revalidatePath(`/n/${sectionId}`);
  revalidatePath("/", "layout");
}

export async function addKeyword(sectionId: string, raw: string) {
  await addKeywords(sectionId, [raw]);
}

export async function addKeywords(sectionId: string, raw: string[]) {
  const { userId } = await requireUser();
  const section = await ownedSection(sectionId, userId);
  if (!section || section.kind !== SectionKind.KEYWORDS) return;

  const seen = new Set(section.keywords.map((item) => item.toLowerCase()));
  const extras: string[] = [];
  for (const value of raw) {
    const keyword = value.trim();
    if (keyword.length === 0) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    extras.push(keyword);
  }
  if (extras.length === 0) return;

  await prisma.noteSection.update({
    where: { id: sectionId },
    data: { keywords: [...section.keywords, ...extras] },
  });
  refresh(sectionId);
}

export async function replaceKeyword(
  sectionId: string,
  from: string,
  to: string,
) {
  const { userId } = await requireUser();
  const section = await ownedSection(sectionId, userId);
  if (!section || section.kind !== SectionKind.KEYWORDS) return;
  const next = to.trim();
  if (next.length === 0) return;
  await prisma.noteSection.update({
    where: { id: sectionId },
    data: {
      keywords: section.keywords.map((item) =>
        item === from ? next : item,
      ),
    },
  });
  refresh(sectionId);
}

export async function removeKeyword(sectionId: string, keyword: string) {
  const { userId } = await requireUser();
  const section = await ownedSection(sectionId, userId);
  if (!section || section.kind !== SectionKind.KEYWORDS) return;

  await prisma.noteSection.update({
    where: { id: sectionId },
    data: {
      keywords: section.keywords.filter((item) => item !== keyword),
    },
  });
  refresh(sectionId);
}

export type SaveNotesResult =
  | { ok: true; savedAt: number; scheduledReview: boolean }
  | { ok: false; error: string };

export async function saveNotes(
  sectionId: string,
  content: string,
  options: { silent?: boolean } = {},
): Promise<SaveNotesResult> {
  const { userId } = await requireUser();
  const section = await ownedSection(sectionId, userId);
  if (!section || section.kind !== SectionKind.NOTES) {
    return { ok: false, error: "Section not found." };
  }

  const stored = serializeNotePoints(parseNotePoints(content));
  await prisma.noteSection.update({
    where: { id: sectionId },
    data: { content: stored },
  });

  let scheduledReview = false;
  if (section.note.nextReviewAt === null && notesPlainText(stored).length > 0) {
    const keywords = await prisma.noteSection.findFirst({
      where: { noteId: section.noteId, kind: SectionKind.KEYWORDS },
      select: { keywords: true },
    });
    if (keywords && keywords.keywords.length > 0) {
      await prisma.note.update({
        where: { id: section.noteId },
        data: { nextReviewAt: new Date() },
      });
      scheduledReview = true;
    }
  }

  // Only revalidate when there's a structural change worth reflecting elsewhere.
  // Autosave (silent=true) keeps typing smooth by not thrashing the layout/tree.
  if (!options.silent || scheduledReview) {
    refresh(sectionId);
  }

  return { ok: true, savedAt: Date.now(), scheduledReview };
}

export async function addQuotation(input: {
  sectionId: string;
  text: string;
  attributedTo: string;
  sourceType: QuotationSource;
  year: number | null;
}) {
  const { userId } = await requireUser();
  const section = await ownedSection(input.sectionId, userId);
  if (!section || section.kind !== SectionKind.QUOTATIONS) {
    return { ok: false as const, error: "Not a quotations file." };
  }

  const text = input.text.trim();
  const attributedTo = input.attributedTo.trim();
  if (text.length === 0 || attributedTo.length === 0) {
    return {
      ok: false as const,
      error: "A quotation needs both the line and who said it.",
    };
  }

  const max = await prisma.quotation.aggregate({
    where: { sectionId: input.sectionId },
    _max: { position: true },
  });

  await prisma.quotation.create({
    data: {
      sectionId: input.sectionId,
      text,
      attributedTo,
      sourceType: input.sourceType,
      year: input.year,
      position: (max._max.position ?? -1) + 1,
    },
  });
  refresh(input.sectionId);
  return { ok: true as const };
}

export async function removeQuotation(quotationId: string) {
  const { userId } = await requireUser();
  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, section: { note: { userId } } },
    select: { id: true, sectionId: true },
  });
  if (!quotation) return;
  await prisma.quotation.delete({ where: { id: quotation.id } });
  refresh(quotation.sectionId);
}

export async function addQuestion(input: {
  sectionId: string;
  kind: QuestionKind;
  stem: string;
  options: string[];
  correctIndices: number[];
}) {
  const { userId } = await requireUser();
  const section = await ownedSection(input.sectionId, userId);
  if (!section || section.kind !== SectionKind.QUESTIONS) {
    return { ok: false as const, error: "Not a questions file." };
  }

  const stem = input.stem.trim();
  if (stem.length < 8) {
    return {
      ok: false as const,
      error: "Write a stem you'd actually meet in the hall.",
    };
  }

  const options = input.options.map((option) => option.trim()).filter(Boolean);
  const isMcq =
    input.kind === QuestionKind.MCQ ||
    input.kind === QuestionKind.PRELIMS_STATEMENT;

  if (isMcq) {
    if (options.length < 2) {
      return { ok: false as const, error: "An MCQ needs at least two options." };
    }
    const valid = input.correctIndices.every(
      (index) => index >= 0 && index < options.length,
    );
    if (!valid || input.correctIndices.length === 0) {
      return {
        ok: false as const,
        error: "Mark the correct option. Do not guess later.",
      };
    }
  }

  await prisma.question.create({
    data: {
      userId,
      noteId: section.noteId,
      kind: input.kind,
      origin: QuestionOrigin.USER_WRITTEN,
      stem,
      options: isMcq ? options : [],
      correctIndices: isMcq ? input.correctIndices : [],
    },
  });
  refresh(input.sectionId);
  return { ok: true as const };
}

export async function answerMcq(
  questionId: string,
  selectedIndices: number[],
) {
  const { userId } = await requireUser();
  const question = await prisma.question.findFirst({
    where: { id: questionId, userId },
  });
  if (!question) return;

  const already = await prisma.attempt.findFirst({
    where: { questionId, userId },
    select: { id: true },
  });
  if (already) return;

  const correct = sameSet(question.correctIndices, selectedIndices);
  await prisma.attempt.create({
    data: {
      questionId,
      userId,
      selectedIndices,
      isCorrect: correct,
    },
  });
  if (question.noteId) {
    const section = await prisma.noteSection.findFirst({
      where: { noteId: question.noteId, kind: SectionKind.QUESTIONS },
      select: { id: true },
    });
    if (section) refresh(section.id);
  }
}

export async function saveWrittenAnswer(questionId: string, answer: string) {
  const { userId } = await requireUser();
  const question = await prisma.question.findFirst({
    where: { id: questionId, userId },
  });
  if (!question || question.kind !== QuestionKind.MAINS_DESCRIPTIVE) return;

  const writtenAnswer = answer.trim();
  if (writtenAnswer.length === 0) return;

  await prisma.attempt.create({
    data: {
      questionId,
      userId,
      writtenAnswer,
    },
  });
}

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}
