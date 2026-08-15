import { SectionKind } from "@prisma/client";
import { DueList, type DueTopic } from "@/components/DueList";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ReviewPage() {
  const { userId } = await requireUser();

  const due = await prisma.note.findMany({
    where: { userId, nextReviewAt: { lte: new Date() } },
    include: {
      folder: true,
      sections: { orderBy: { position: "asc" } },
    },
    orderBy: { nextReviewAt: "asc" },
  });

  const grouped = new Map<string, { folder: string; notes: DueTopic[] }>();
  for (const note of due) {
    const keywords =
      note.sections.find((section) => section.kind === SectionKind.KEYWORDS)
        ?.keywords ?? [];
    const notesFile = note.sections.find(
      (section) => section.kind === SectionKind.NOTES,
    );
    const topic: DueTopic = {
      id: note.id,
      title: note.title,
      paper: note.paper,
      folderName: note.folder.name,
      keywords,
      notes: notesFile?.content ?? "",
      notesSectionId: notesFile?.id ?? null,
    };
    const bucket = grouped.get(note.folderId);
    if (bucket) {
      bucket.notes.push(topic);
    } else {
      grouped.set(note.folderId, { folder: note.folder.name, notes: [topic] });
    }
  }

  const groups = [...grouped.values()];

  return (
    <main className="flex min-h-0 flex-1">
      <div className="hidden w-[132px] shrink-0 px-3 py-5 min-[720px]:block">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule">
          due today
        </p>
        <p className="mt-2 font-serif text-[13px] italic leading-snug text-ink-2">
          Topics whose interval has come due. Drill, then rate 0–5.
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l-[2px] border-rule px-4 py-5 sm:px-6">
        <h1 className="font-sans text-[14px] font-medium text-ink">Review</h1>
        <p className="mt-1 font-mono text-[12px] text-ink-3">
          {due.length} due
        </p>
        <DueList groups={groups} />
      </div>
    </main>
  );
}
