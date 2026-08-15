import {
  ExamPaper,
  QuestionKind,
  QuestionOrigin,
  QuotationSource,
  SectionKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SECTION_ORDER, ensureSections } from "@/lib/scaffold";

const STARTER_KEYWORDS = [
  "holism",
  "cultural relativism",
  "ethnography",
  "comparative method",
  "participant observation",
];

const STARTER_NOTES =
  "Anthropology takes the whole of a people at once — holism — rather than one institution in isolation. Cultural relativism asks that a practice be judged in its own terms, not against a civilisational ranking. The primary method is ethnography, built on participant observation in the field; the comparative method then sets one society beside another so a kinship or religion answer does not float free of evidence.";

export async function seedStarterTopic(userId: string) {
  const existing = await prisma.note.findFirst({
    where: { userId, title: "Meaning, Scope and Development" },
  });

  if (existing) {
    await ensureSections(prisma, existing.id);
    await ensureStarterContent(userId, existing.id);
    return existing.id;
  }

  const folder = await prisma.folder.create({
    data: {
      userId,
      name: "Anthropology",
      depth: 0,
      defaultPaper: ExamPaper.OPTIONAL_ANTHROPOLOGY,
      position: 0,
    },
  });

  const note = await prisma.note.create({
    data: {
      userId,
      folderId: folder.id,
      title: "Meaning, Scope and Development",
      paper: ExamPaper.OPTIONAL_ANTHROPOLOGY,
      sections: {
        create: SECTION_ORDER.map((kind, position) => ({
          kind,
          position,
          keywords: kind === "KEYWORDS" ? STARTER_KEYWORDS : [],
        })),
      },
    },
  });

  await ensureStarterContent(userId, note.id);
  return note.id;
}

async function ensureStarterContent(userId: string, noteId: string) {
  const quotationsFile = await prisma.noteSection.findUnique({
    where: { noteId_kind: { noteId, kind: SectionKind.QUOTATIONS } },
    include: { quotations: true },
  });
  if (quotationsFile && quotationsFile.quotations.length === 0) {
    await prisma.quotation.create({
      data: {
        sectionId: quotationsFile.id,
        text: "Man is an animal suspended in webs of significance he himself has spun.",
        attributedTo: "Clifford Geertz",
        sourceType: QuotationSource.SCHOLAR,
        year: 1973,
        position: 0,
      },
    });
  }

  const notesFile = await prisma.noteSection.findUnique({
    where: { noteId_kind: { noteId, kind: SectionKind.NOTES } },
  });
  if (notesFile && !notesFile.content?.trim()) {
    await prisma.noteSection.update({
      where: { id: notesFile.id },
      data: { content: STARTER_NOTES },
    });
  }

  await prisma.note.updateMany({
    where: { id: noteId, nextReviewAt: null },
    data: { nextReviewAt: new Date() },
  });

  const questionCount = await prisma.question.count({ where: { noteId, userId } });
  if (questionCount === 0) {
    await prisma.question.create({
      data: {
        userId,
        noteId,
        kind: QuestionKind.MCQ,
        origin: QuestionOrigin.USER_WRITTEN,
        stem: "Participant observation as a method is most closely associated with:",
        options: [
          "Morgan's unilinear evolution",
          "Malinowski's Trobriand fieldwork",
          "Tylor's armchair anthropology",
          "Spencer's social Darwinism",
        ],
        correctIndices: [1],
      },
    });
    await prisma.question.create({
      data: {
        userId,
        noteId,
        kind: QuestionKind.MAINS_DESCRIPTIVE,
        origin: QuestionOrigin.USER_WRITTEN,
        stem: "Distinguish holism from cultural relativism. Why does a kinship answer fail if it drops either?",
      },
    });
  }
}
