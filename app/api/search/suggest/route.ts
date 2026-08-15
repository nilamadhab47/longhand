import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { collectPrefixMatches } from "@/lib/search";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  const { userId } = await requireUser();
  const url = new URL(req.url);
  const prefix = (url.searchParams.get("prefix") ?? "").trim();
  if (prefix.length < 2) {
    return NextResponse.json({ terms: [] as string[] });
  }
  const contains = { contains: prefix, mode: "insensitive" as const };

  const notes = await prisma.note.findMany({
    where: {
      userId,
      OR: [
        { title: contains },
        { sections: { some: { content: contains } } },
        { sections: { some: { keywords: { has: prefix.toLowerCase() } } } },
      ],
    },
    take: 40,
    orderBy: { updatedAt: "desc" },
    select: {
      title: true,
      sections: { select: { content: true, keywords: true } },
    },
  });

  const scores = new Map<string, number>();
  for (const note of notes) {
    collectPrefixMatches(note.title, prefix, scores, 5);
    if (note.title.toLowerCase().startsWith(prefix.toLowerCase())) {
      scores.set(note.title.toLowerCase(), (scores.get(note.title.toLowerCase()) ?? 0) + 10);
    }
    for (const section of note.sections) {
      for (const keyword of section.keywords) {
        if (keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
          scores.set(keyword.toLowerCase(), (scores.get(keyword.toLowerCase()) ?? 0) + 6);
        }
      }
      if (section.content) {
        collectPrefixMatches(section.content, prefix, scores, 1);
      }
    }
  }

  const terms = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term]) => term);

  return NextResponse.json({ terms });
}
