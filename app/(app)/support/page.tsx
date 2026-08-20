import { FeedbackForm } from "@/components/FeedbackForm";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function SupportPage() {
  const { userId } = await requireUser();
  const mine = await prisma.feedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, kind: true, body: true, createdAt: true },
  });

  return (
    <main className="flex min-h-0 flex-1">
      <div className="hidden w-[132px] shrink-0 px-3 py-5 min-[720px]:block">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule">
          support
        </p>
        <p className="mt-2 font-serif text-[13px] italic leading-snug text-ink-2">
          Tell us what broke, or what the page should do next.
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l-[2px] border-rule px-4 py-5 sm:px-6">
        <h1 className="font-sans text-[14px] font-medium text-ink">
          Support & feedback
        </h1>
        <p className="mt-1 max-w-xl font-serif text-[15.5px] leading-[1.72] text-ink-2">
          Longhand is early. If something is in the way, or you want a tool we
          have not built yet, write it here. We read every note.
        </p>
        <FeedbackForm />

        {mine.length > 0 ? (
          <section className="mt-12 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Your recent notes
            </p>
            <ul className="mt-3 space-y-3">
              {mine.map((item) => (
                <li key={item.id} className="border border-line bg-panel px-3 py-2">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-brass">
                    {labelKind(item.kind)} · {item.createdAt.toLocaleDateString()}
                  </p>
                  <p className="mt-1 font-serif text-[15px] leading-[1.6] text-ink-2">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function labelKind(kind: string) {
  if (kind === "ISSUE") return "Issue";
  if (kind === "IDEA") return "Idea";
  return "Other";
}
