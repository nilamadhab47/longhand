import { SectionKind } from "@prisma/client";

export const SECTION_PURPOSE: Record<SectionKind, string> = {
  KEYWORDS: "Terms you must be able to drop in an answer.",
  QUOTATIONS: "Attributed lines only — a quote without a name is a rumour.",
  NOTES: "Your compression of the topic. Write it yourself.",
  QUESTIONS:
    "Write one you'd struggle to answer — that's the one worth keeping.",
};

export function MarginRail({
  kind,
  paper,
  review,
  children,
}: {
  kind: SectionKind;
  paper: string;
  review: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-0 flex-1">
      <div className="hidden w-[132px] shrink-0 px-3 py-5 min-[720px]:block">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule">
          {kind}
        </p>
        <p className="mt-2 font-serif text-[13px] italic leading-snug text-ink-2">
          {SECTION_PURPOSE[kind]}
        </p>
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-ink-3">
          {paper}
          <br />
          {review}
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l-[2px] border-rule px-4 py-5 sm:px-6">
        <div className="mb-4 min-[720px]:hidden">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule">
            {kind}
          </p>
          <p className="mt-1 font-serif text-[13px] italic text-ink-2">
            {SECTION_PURPOSE[kind]}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink-3">
            {paper} · {review}
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
