import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Command, PenLine, Sparkles } from "lucide-react";
import { readSession } from "@/lib/session";

export default async function HomePage() {
  const session = await readSession();
  const primaryHref = session ? "/review" : "/sign-up";
  const primaryLabel = session ? "Open workspace" : "Enter the workspace";

  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-paper text-ink">
      <div className="landing-grain" aria-hidden />
      <div className="landing-orb -right-24 -top-24" aria-hidden />

      <header className="relative z-20 mx-auto mt-[calc(0.75rem+var(--sat,0px))] flex w-[min(1120px,calc(100%-1.5rem))] items-center justify-between rounded-full border border-line bg-paper/80 px-4 py-2.5 shadow-[0_8px_30px_rgba(22,29,38,0.04)] backdrop-blur-xl sm:px-5">
        <Link href="/" className="flex cursor-pointer items-center gap-2.5">
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
            longhand
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href={session ? "/review" : "/sign-in"}
            className="hidden cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 transition-colors duration-200 hover:text-rule sm:inline"
          >
            {session ? "Workspace" : "Sign in"}
          </Link>
          <Link
            href={primaryHref}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-paper transition-colors duration-200 hover:bg-rule"
          >
            {primaryLabel}
            <ArrowUpRight size={13} strokeWidth={1.75} />
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-[min(1120px,calc(100%-1.5rem))] items-end gap-12 pb-8 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:pt-28">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
              A private knowledge studio
            </p>
            <h1 className="landing-display mt-5 text-[clamp(3.6rem,12vw,8.75rem)] font-medium leading-[0.86] tracking-[-0.045em] text-ink">
              Write
              <br />
              like it
              <br />
              <em className="text-rule">matters.</em>
            </h1>
            <p className="mt-8 max-w-md font-serif text-[18px] leading-[1.55] text-ink-2 sm:text-[20px]">
              Notes, recall, and search in one quiet room. No feed. No flags.
              The page stays out of the way until you ask for help.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href={primaryHref}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-rule px-6 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-ink"
              >
                {primaryLabel}
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">
                Free to start · Works offline
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:justify-self-end">
            <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(163,47,42,0.1),transparent_68%)]" />
            <Image
              src="/logo.png"
              alt="Longhand mark"
              width={420}
              height={420}
              priority
              className="relative w-full drop-shadow-[0_24px_50px_rgba(22,29,38,0.12)]"
            />
          </div>
        </section>

        <section className="mx-auto mt-8 w-[min(1120px,calc(100%-1.5rem))]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Bento
              kicker="01 / Write"
              icon={<PenLine size={16} strokeWidth={1.6} />}
              title="The cursor stays quiet."
              body="Autosave is silent. The page does not re-render under your hands. You think, you type, it stays."
            />
            <Bento
              kicker="02 / Find"
              icon={<Command size={16} strokeWidth={1.6} />}
              title="Search your words."
              body="Command-K reads the notes you actually wrote. Suggestions come from your vocabulary, not a model."
            />
            <Bento
              kicker="03 / Ask"
              icon={<Sparkles size={16} strokeWidth={1.6} />}
              title="Assist on request."
              body="Select a line. Fix spelling, rewrite, or proofread. Nothing runs until you ask."
            />
            <Bento
              kicker="04 / Keep"
              title="Install it. Take it with you."
              body="A real PWA — home screen, standalone, offline reading. It should feel like opening your notes app, not a tab."
            />
          </div>
        </section>

        <section className="relative mx-auto mt-24 w-[min(1120px,calc(100%-1.5rem))] pb-8">
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2 className="landing-display max-w-[12ch] text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-ink">
              The page, not the product.
            </h2>
            <p className="hidden max-w-xs font-serif text-[15px] leading-snug text-ink-2 md:block">
              Folders, points, recall. The interface recedes so the sentence can
              stay.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-line bg-[#f7f5ee] shadow-[0_24px_70px_rgba(22,29,38,0.08)]">
            <div className="flex items-center gap-2 border-b border-line bg-panel px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c9a4a1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#c9c4a4]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#b5c4b4]" />
              <p className="ml-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
                longhand · Article 19
              </p>
              <p className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-ok">
                saved
              </p>
            </div>
            <div className="grid min-h-[340px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-line bg-panel px-5 py-6 lg:block">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brass">
                  Library
                </p>
                <p className="mt-5 font-serif text-[15px] text-ink-2">Polity</p>
                <p className="mt-2 font-serif text-[15px] text-ink-2">
                  Fundamental Rights
                </p>
                <p className="mt-2 font-serif text-[16px] text-ink">
                  Article 19
                </p>
              </aside>
              <div className="bg-paper px-6 py-8 sm:px-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-rule">
                  notes
                </p>
                <p className="landing-display mt-5 text-[clamp(1.6rem,3vw,2.15rem)] leading-[1.25] text-ink">
                  Right to freedom — positive, not absolute, citizens only,
                  subject to reasonable restrictions.
                </p>
                <p className="mt-6 max-w-xl font-serif text-[16px] leading-[1.7] text-ink-2">
                  Speech, assembly, association, movement, residence, profession.
                  Each limb carries its own limit. The note stays compressed
                  until you ask it to open.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {["speech", "reasonable restriction", "citizens"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-2"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto my-24 w-[min(1120px,calc(100%-1.5rem))] overflow-hidden rounded-[32px] border border-line bg-[#f7f5ee] px-6 py-14 text-center sm:px-16 sm:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brass">
            Ready when you are
          </p>
          <h2 className="landing-display mx-auto mt-4 max-w-[16ch] text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.92] tracking-[-0.035em] text-ink">
            Open a page.
            <br />
            Keep going.
          </h2>
          <div className="mt-10">
            <Link
              href={primaryHref}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-mono text-[12px] uppercase tracking-[0.12em] text-paper transition-colors duration-200 hover:bg-rule"
            >
              {primaryLabel}
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex w-[min(1120px,calc(100%-1.5rem))] items-center justify-between border-t border-line py-8 pb-[calc(2rem+var(--sab,0px))]">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          longhand
        </p>
        <p className="font-serif italic text-ink-3">Think. Type. Continue.</p>
      </footer>
    </div>
  );
}

function Bento({
  className,
  kicker,
  title,
  body,
  icon,
}: {
  className?: string;
  kicker: string;
  title: string;
  body: string;
  icon?: ReactNode;
}) {
  return (
    <article
      className={`landing-card rounded-[24px] border border-line p-6 shadow-[0_10px_28px_rgba(22,29,38,0.04)] transition-colors duration-200 hover:border-rule/35 hover:bg-paper sm:p-7 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-brass">
          {kicker}
        </p>
        {icon ? <span className="text-ink-3">{icon}</span> : null}
      </div>
      <h3 className="landing-display mt-5 text-[1.65rem] leading-[1.15] tracking-[-0.02em] text-ink sm:text-[1.85rem]">
        {title}
      </h3>
      <p className="mt-3 max-w-prose font-serif text-[15px] leading-[1.55] text-ink-2">
        {body}
      </p>
    </article>
  );
}
