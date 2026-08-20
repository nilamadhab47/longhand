"use client";

import { useEffect, useState } from "react";
import {
  EMPTY_PROGRESS,
  GUIDE_SLIDES,
  readGuideProgress,
  writeGuideProgress,
  type GuideProgress,
} from "@/lib/onboarding";
import { trackEvent, EVENTS } from "@/lib/analytics";

export function OnboardingGuide({
  open,
  fromStart,
  onOpenChange,
}: {
  open: boolean;
  fromStart?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [progress, setProgress] = useState<GuideProgress>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readGuideProgress();
    setProgress(stored);
    setReady(true);
    if (stored.phase === "welcome" || stored.phase === "active") {
      onOpenChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && fromStart) {
      save({ phase: "welcome", stepIndex: 0 });
    }
  }, [open, fromStart]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, progress]);

  function save(next: GuideProgress) {
    setProgress(next);
    writeGuideProgress(next);
  }

  function startGuide() {
    trackEvent(EVENTS.GUIDE_STARTED);
    save({ phase: "active", stepIndex: 0 });
  }

  function next() {
    const nextIndex = progress.stepIndex + 1;
    if (nextIndex >= GUIDE_SLIDES.length) {
      save({ phase: "complete", stepIndex: GUIDE_SLIDES.length - 1 });
      return;
    }
    save({ phase: "active", stepIndex: nextIndex });
  }

  function back() {
    if (progress.stepIndex > 0) {
      save({ phase: "active", stepIndex: progress.stepIndex - 1 });
    }
  }

  function dismiss() {
    trackEvent(EVENTS.GUIDE_SKIPPED, { step: progress.stepIndex });
    save({ phase: "hidden", stepIndex: progress.stepIndex });
    onOpenChange(false);
  }

  function finish() {
    trackEvent(EVENTS.GUIDE_COMPLETED);
    save({ phase: "hidden", stepIndex: 0 });
    onOpenChange(false);
  }

  if (!ready || !open) return null;

  // Welcome screen
  if (progress.phase === "welcome") {
    return (
      <Backdrop>
        <div className="w-[min(460px,100%)] border border-line bg-paper p-6 shadow-[0_16px_40px_rgba(22,29,38,0.14)]">
          {/* Inspirational quote */}
          <blockquote className="border-l-2 border-rule pl-4">
            <p className="font-serif text-[15px] italic leading-[1.8] text-ink-2">
              &ldquo;The faintest ink is more powerful than the strongest memory.&rdquo;
            </p>
            <cite className="mt-1 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
              — Chinese Proverb
            </cite>
          </blockquote>

          <h2 className="mt-5 font-sans text-[20px] font-medium text-ink">
            Welcome to Longhand
          </h2>
          <p className="mt-2 font-serif text-[15px] leading-[1.7] text-ink-2">
            A quiet place to write what you learn, keep what matters, and remember it when you need it most.
          </p>

          <div className="mt-4 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              What you can do here
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-serif text-[13.5px] leading-[1.6] text-ink-2">
              <div><strong className="text-ink">Topics</strong> — organize by subject</div>
              <div><strong className="text-ink">Notes</strong> — write in your own words</div>
              <div><strong className="text-ink">Keywords</strong> — save key terms</div>
              <div><strong className="text-ink">Quotations</strong> — keep exact words</div>
              <div><strong className="text-ink">Questions</strong> — test yourself</div>
              <div><strong className="text-ink">Review</strong> — recall when due</div>
            </div>
          </div>

          <p className="mt-4 font-serif text-[13.5px] leading-[1.6] text-ink-3">
            This short guide walks you through each feature. Takes about 2 minutes. You can skip or come back any time.
          </p>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={startGuide}
              className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
            >
              Show me around
            </button>
          </div>
        </div>
      </Backdrop>
    );
  }

  // Complete screen
  if (progress.phase === "complete") {
    return (
      <Backdrop>
        <div className="w-[min(460px,100%)] border border-line bg-paper p-6 shadow-[0_16px_40px_rgba(22,29,38,0.14)]">
          <blockquote className="border-l-2 border-rule pl-4">
            <p className="font-serif text-[15px] italic leading-[1.8] text-ink-2">
              &ldquo;What is written without effort is in general read without pleasure.&rdquo;
            </p>
            <cite className="mt-1 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
              — Samuel Johnson
            </cite>
          </blockquote>

          <h2 className="mt-5 font-sans text-[20px] font-medium text-ink">
            You&apos;re ready.
          </h2>
          <p className="mt-2 font-serif text-[15px] leading-[1.7] text-ink-2">
            You now know everything you need. Create your first topic, write what you&apos;re learning, and let Longhand help you remember it.
          </p>
          <ul className="mt-3 space-y-1 font-serif text-[13.5px] leading-[1.6] text-ink-3">
            <li>Start with one topic — keep it simple</li>
            <li>Write notes in your own words (that&apos;s how memory works)</li>
            <li>Come back to Review when things are due</li>
            <li>Click &quot;Guide&quot; in the sidebar any time</li>
          </ul>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={finish}
              className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
            >
              Start writing
            </button>
          </div>
        </div>
      </Backdrop>
    );
  }

  // Step slides
  if (progress.phase !== "active") return null;

  const slide = GUIDE_SLIDES[progress.stepIndex];
  if (!slide) return null;
  const total = GUIDE_SLIDES.length;

  return (
    <Backdrop>
      <div className="w-[min(440px,100%)] border border-line bg-paper p-5 shadow-[0_16px_40px_rgba(22,29,38,0.14)]">
        {/* Progress bar */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1">
            <div className="flex h-1 overflow-hidden bg-sunk">
              <div
                className="bg-rule transition-all duration-300"
                style={{ width: `${((progress.stepIndex + 1) / total) * 100}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {progress.stepIndex + 1}/{total}
          </span>
        </div>

        {/* Content */}
        <h3 className="font-sans text-[16px] font-medium text-ink">
          {slide.title}
        </h3>
        <p className="mt-2 font-serif text-[14.5px] leading-[1.7] text-ink-2">
          {slide.body}
        </p>
        {slide.bullets && (
          <ul className="mt-3 space-y-1 font-serif text-[13.5px] leading-[1.6] text-ink-2">
            {slide.bullets.map((b, i) => (
              <li key={i} className="pl-3 relative before:absolute before:left-0 before:content-['·'] before:text-ink-3">
                {b}
              </li>
            ))}
          </ul>
        )}

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={progress.stepIndex === 0}
            onClick={back}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
            >
              Exit
            </button>
            <button
              type="button"
              onClick={next}
              className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
            >
              {progress.stepIndex === total - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      {children}
    </div>
  );
}
