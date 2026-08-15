import { notFound } from "next/navigation";
import { SectionKind } from "@prisma/client";
import { MarginRail } from "@/components/MarginRail";
import { TopicBody } from "@/components/TopicBody";
import { KeywordsPane } from "@/components/panes/KeywordsPane";
import { NotesPane } from "@/components/panes/NotesPane";
import { QuestionsPane } from "@/components/panes/QuestionsPane";
import { QuotationsPane } from "@/components/panes/QuotationsPane";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { userId } = await requireUser();
  const { sectionId } = await params;

  const section = await prisma.noteSection.findFirst({
    where: { id: sectionId, note: { userId } },
    include: {
      quotations: { orderBy: { position: "asc" } },
      note: {
        include: {
          folder: true,
          sections: { select: { kind: true, keywords: true } },
          questions: {
            orderBy: { createdAt: "asc" },
            include: {
              attempts: {
                where: { userId },
                orderBy: { attemptedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!section) notFound();

  const due =
    section.note.nextReviewAt !== null &&
    section.note.nextReviewAt.getTime() <= Date.now();
  const review = due
    ? "due"
    : section.note.nextReviewAt
      ? "scheduled"
      : "unscheduled";

  return (
    <MarginRail kind={section.kind} paper={section.note.paper} review={review}>
      <TopicBody
        sectionId={section.id}
        topic={section.note.title}
        mode={section.kind === SectionKind.NOTES ? "notes" : "prose"}
      >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-brass">
        {section.note.folder.name}
      </p>
      <h1 className="mb-4 font-serif text-[15.5px] leading-[1.72] text-ink">
        {section.note.title}
      </h1>
      {section.kind === SectionKind.KEYWORDS ? (
        <KeywordsPane sectionId={section.id} keywords={section.keywords} />
      ) : null}
      {section.kind === SectionKind.QUOTATIONS ? (
        <QuotationsPane
          sectionId={section.id}
          quotations={section.quotations.map((quotation) => ({
            id: quotation.id,
            text: quotation.text,
            attributedTo: quotation.attributedTo,
            sourceType: quotation.sourceType,
            year: quotation.year,
          }))}
        />
      ) : null}
      {section.kind === SectionKind.NOTES ? (
        <NotesPane
          sectionId={section.id}
          noteId={section.note.id}
          title={section.note.title}
          content={section.content ?? ""}
          keywords={
            section.note.sections.find(
              (file) => file.kind === SectionKind.KEYWORDS,
            )?.keywords ?? []
          }
        />
      ) : null}
      {section.kind === SectionKind.QUESTIONS ? (
        <QuestionsPane
          sectionId={section.id}
          questions={section.note.questions.map((question) => {
            const latest = question.attempts[0];
            return {
              id: question.id,
              kind: question.kind,
              origin: question.origin,
              stem: question.stem,
              options: question.options,
              correctIndices: question.correctIndices,
              attempt: latest
                ? {
                    selectedIndices: latest.selectedIndices,
                    isCorrect: latest.isCorrect,
                  }
                : null,
            };
          })}
        />
      ) : null}
      </TopicBody>
    </MarginRail>
  );
}
