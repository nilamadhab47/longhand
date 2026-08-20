import { markFeedbackRead } from "@/app/actions/feedback";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function InboxPage() {
  await requireUser();

  const items = await prisma.feedback.findMany({
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 80,
  });
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <main className="flex min-h-0 flex-1">
      <div className="hidden w-[132px] shrink-0 px-3 py-5 min-[720px]:block">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule">
          inbox
        </p>
        <p className="mt-2 font-serif text-[13px] italic leading-snug text-ink-2">
          What people are hitting. What they want next.
        </p>
      </div>
      <div className="min-w-0 flex-1 border-l-[2px] border-rule px-4 py-5 sm:px-6">
        <h1 className="font-sans text-[14px] font-medium text-ink">Feedback</h1>
        <p className="mt-1 font-mono text-[12px] text-ink-3">
          {unread} unread · {items.length} total
        </p>

        {items.length === 0 ? (
          <p className="mt-4 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
            Nothing yet. The first notes will land here.
          </p>
        ) : (
          <ul className="mt-5 max-w-2xl space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`border bg-panel px-3 py-3 ${
                  item.readAt ? "border-line" : "border-rule/40"
                }`}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-brass">
                  {labelKind(item.kind)}
                  {item.readAt ? "" : " · new"} ·{" "}
                  {item.createdAt.toLocaleString()}
                </p>
                {item.doing ? (
                  <p className="mt-2 font-serif text-[14px] italic text-ink-2">
                    Trying to: {item.doing}
                  </p>
                ) : null}
                <p className="mt-2 font-serif text-[15.5px] leading-[1.65] text-ink">
                  {item.body}
                </p>
                {!item.readAt ? (
                  <form action={markFeedbackRead.bind(null, item.id)} className="mt-3">
                    <button
                      type="submit"
                      className="font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:underline"
                    >
                      Mark read
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function labelKind(kind: string) {
  if (kind === "ISSUE") return "Issue";
  if (kind === "IDEA") return "Idea";
  return "Other";
}
