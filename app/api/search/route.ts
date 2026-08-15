import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSnippet, type SearchHit } from "@/lib/search";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  const { userId } = await requireUser();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] as SearchHit[] });
  }
  const like = { contains: q, mode: "insensitive" as const };

  const notes = await prisma.note.findMany({
    where: {
      userId,
      OR: [
        { title: like },
        { sections: { some: { content: like } } },
        { sections: { some: { keywords: { has: q.toLowerCase() } } } },
        {
          sections: {
            some: {
              quotations: {
                some: { OR: [{ text: like }, { attributedTo: like }] },
              },
            },
          },
        },
        { questions: { some: { stem: like } } },
      ],
    },
    take: 30,
    orderBy: { updatedAt: "desc" },
    include: {
      folder: { select: { name: true } },
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          kind: true,
          content: true,
          keywords: true,
          quotations: {
            where: { OR: [{ text: like }, { attributedTo: like }] },
            select: { text: true, attributedTo: true },
            take: 1,
          },
        },
      },
      questions: {
        where: { stem: like },
        select: { stem: true },
        take: 1,
      },
    },
  });

  const needle = q.toLowerCase();
  const results: SearchHit[] = notes.map((note) => {
    const notesSection = note.sections.find((s) => s.kind === "NOTES");
    const contentMatch = note.sections.find((s) =>
      (s.content ?? "").toLowerCase().includes(needle),
    );
    const keywordMatch = note.sections.find((s) =>
      s.keywords.some((k) => k.toLowerCase().includes(needle)),
    );
    const quoteMatchSection = note.sections.find(
      (s) => s.quotations.length > 0,
    );
    const questionMatch = note.questions[0];

    let matched: SearchHit["matched"] = "title";
    let snippet = note.title;
    let sectionId = notesSection?.id ?? note.sections[0]?.id ?? "";

    if (note.title.toLowerCase().includes(needle)) {
      matched = "title";
      snippet = note.title;
    } else if (contentMatch) {
      matched = "content";
      snippet = buildSnippet(contentMatch.content ?? "", q);
      sectionId = contentMatch.id;
    } else if (keywordMatch) {
      matched = "keyword";
      snippet = keywordMatch.keywords
        .filter((k) => k.toLowerCase().includes(needle))
        .join(" · ");
      sectionId = keywordMatch.id;
    } else if (quoteMatchSection) {
      const q0 = quoteMatchSection.quotations[0];
      matched = "quotation";
      snippet = q0
        ? buildSnippet(`${q0.text} — ${q0.attributedTo}`, q)
        : snippet;
      sectionId = quoteMatchSection.id;
    } else if (questionMatch) {
      matched = "question";
      snippet = buildSnippet(questionMatch.stem, q);
    }

    return {
      noteId: note.id,
      sectionId,
      title: note.title,
      folder: note.folder.name,
      snippet,
      matched,
    };
  });

  return NextResponse.json({ results });
}
