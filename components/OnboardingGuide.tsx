"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  EMPTY_PROGRESS,
  findTargetEl,
  GUIDE_STEPS,
  readGuideProgress,
  writeGuideProgress,
  type GuideProgress,
  type GuideStep,
} from "@/lib/onboarding";

// ─── Main Component ─────────────────────────────────────────────────────────

export function OnboardingGuide({
  open,
  fromStart,
  onOpenChange,
}: {
  open: boolean;
  fromStart?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [progress, setProgress] = useState<GuideProgress>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [hole, setHole] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step: GuideStep | null =
    progress.phase === "active" ? (GUIDE_STEPS[progress.stepIndex] ?? null) : null;
  const total = GUIDE_STEPS.length;

  // ─── Boot ───────────────────────────────────────────────────────────────

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
      const next: GuideProgress = {
        phase: "active",
        stepIndex: 0,
        skipped: [],
        done: [],
      };
      save(next);
    }
  }, [open, fromStart]);

  // ─── Highlight measurement ──────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!open || !step) {
      setHole(null);
      return;
    }
    let targetEl: HTMLElement | null = null;

    function measure() {
      if (!step) return;
      const el =
        findTargetEl(step.target) ??
        (step.fallbackTarget ? findTargetEl(step.fallbackTarget) : null);
      if (el !== targetEl) {
        if (targetEl) {
          targetEl.style.removeProperty("position");
          targetEl.style.removeProperty("z-index");
        }
        targetEl = el;
        if (targetEl) {
          const pos = window.getComputedStyle(targetEl).position;
          if (pos === "static") targetEl.style.position = "relative";
          targetEl.style.zIndex = "61";
        }
      }
      setHole(el ? el.getBoundingClientRect() : null);
    }
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      if (targetEl) {
        targetEl.style.removeProperty("position");
        targetEl.style.removeProperty("z-index");
      }
    };
  }, [open, step, pathname]);

  // ─── Listen for guide events from the app ───────────────────────────────

  const stepRef = useRef<GuideStep | null>(step);
  stepRef.current = step;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // ─── Listen for guide events from the app ───────────────────────────────

  useEffect(() => {
    function handler(event: Event) {
      const currentStep = stepRef.current;
      if (!currentStep) return;
      const detail = (event as CustomEvent).detail as string;
      if (detail === currentStep.waitFor) {
        const nextIndex = progressRef.current.stepIndex + 1;
        if (nextIndex >= total) {
          save({ ...progressRef.current, phase: "complete", stepIndex: total - 1 });
          return;
        }
        save({
          ...progressRef.current,
          stepIndex: nextIndex,
          done: [...progressRef.current.done, currentStep.id],
        });
      }
    }
    window.addEventListener("longhand:guide", handler);
    return () => window.removeEventListener("longhand:guide", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Keyboard ───────────────────────────────────────────────────────────

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

  // ─── Actions ────────────────────────────────────────────────────────────

  function save(next: GuideProgress) {
    setProgress(next);
    writeGuideProgress(next);
  }

  function startGuide() {
    save({ phase: "active", stepIndex: 0, skipped: [], done: [] });
  }

  function advance() {
    const nextIndex = progress.stepIndex + 1;
    if (nextIndex >= total) {
      save({ ...progress, phase: "complete", stepIndex: total - 1 });
      return;
    }
    save({ ...progress, stepIndex: nextIndex, done: step ? [...progress.done, step.id] : progress.done });
  }

  function skipStep() {
    if (!step) return;
    const nextIndex = progress.stepIndex + 1;
    const nextSkipped = [...progress.skipped, step.id];
    if (nextIndex >= total) {
      save({ ...progress, phase: "complete", stepIndex: total - 1, skipped: nextSkipped });
      return;
    }
    save({ ...progress, stepIndex: nextIndex, skipped: nextSkipped });
  }

  function goBack() {
    if (progress.stepIndex > 0) {
      save({ ...progress, stepIndex: progress.stepIndex - 1 });
    }
  }

  function dismiss() {
    save({ ...progress, phase: "hidden" });
    onOpenChange(false);
  }

  function finishGuide() {
    save({ ...progress, phase: "hidden" });
    onOpenChange(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!ready || !open) return null;

  if (progress.phase === "welcome") {
    return <WelcomeModal onStart={startGuide} onSkip={dismiss} />;
  }

  if (progress.phase === "complete") {
    return <CompleteModal onFinish={finishGuide} />;
  }

  if (progress.phase !== "active" || !step) return null;

  const cardPos = computeCardPosition(hole, cardRef.current);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Overlay panels around the cutout — leaves the target clickable */}
      {hole ? (
        <>
          {/* Top */}
          <div
            className="pointer-events-auto fixed left-0 right-0 top-0 bg-ink/45"
            style={{ height: Math.max(0, hole.top - 4) }}
          />
          {/* Bottom */}
          <div
            className="pointer-events-auto fixed bottom-0 left-0 right-0 bg-ink/45"
            style={{ top: hole.bottom + 4 }}
          />
          {/* Left */}
          <div
            className="pointer-events-auto fixed left-0 bg-ink/45"
            style={{
              top: Math.max(0, hole.top - 4),
              width: Math.max(0, hole.left - 4),
              height: hole.height + 8,
            }}
          />
          {/* Right */}
          <div
            className="pointer-events-auto fixed right-0 bg-ink/45"
            style={{
              top: Math.max(0, hole.top - 4),
              left: hole.right + 4,
              height: hole.height + 8,
            }}
          />
          {/* Highlight border */}
          <div
            className="pointer-events-none fixed z-[70] border-2 border-rule"
            style={{
              top: hole.top - 4,
              left: hole.left - 4,
              width: hole.width + 8,
              height: hole.height + 8,
              borderRadius: 3,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0 bg-ink/45" />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute z-[70] w-[min(300px,calc(100vw-24px))] border border-line bg-paper p-4 shadow-[0_12px_32px_rgba(22,29,38,0.18)]"
        style={{ top: cardPos.top, left: cardPos.left }}
      >
        {/* Progress */}
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1">
            <div className="flex h-1 overflow-hidden bg-sunk">
              <div
                className="bg-rule transition-all duration-300"
                style={{
                  width: `${((progress.stepIndex + 1) / total) * 100}%`,
                }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            {progress.stepIndex + 1}/{total}
          </span>
        </div>

        {/* Content */}
        <h3 className="font-sans text-[14px] font-medium text-ink">
          {step.title}
        </h3>
        <p className="mt-1.5 font-serif text-[13.5px] leading-[1.6] text-ink-2">
          {step.description}
        </p>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={progress.stepIndex === 0}
            onClick={goBack}
            className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={skipStep}
              className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
            >
              Skip
            </button>
            {step.action === "observe" && step.id !== "complete" ? (
              <button
                type="button"
                onClick={advance}
                className="border border-ink bg-ink px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
              >
                Next
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Modal ──────────────────────────────────────────────────────────

function WelcomeModal({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4">
      <div className="w-[min(420px,100%)] border border-line bg-paper p-5 shadow-[0_16px_40px_rgba(22,29,38,0.14)]">
        <h2 className="font-sans text-[18px] font-medium text-ink">
          Welcome to Longhand
        </h2>
        <p className="mt-3 font-serif text-[15px] leading-[1.7] text-ink-2">
          Longhand is a quiet place to write, organize, and remember what you
          learn.
        </p>
        <ul className="mt-3 space-y-1.5 font-serif text-[14px] leading-[1.6] text-ink-2">
          <li>
            <strong className="text-ink">Topics</strong> — organize everything
            by subject
          </li>
          <li>
            <strong className="text-ink">Notes</strong> — write ideas in your
            own words
          </li>
          <li>
            <strong className="text-ink">Keywords</strong> — save important
            terms
          </li>
          <li>
            <strong className="text-ink">Quotations</strong> — keep exact words
            someone said
          </li>
          <li>
            <strong className="text-ink">Questions</strong> — test yourself
            later
          </li>
          <li>
            <strong className="text-ink">Review</strong> — recall notes when
            they&apos;re due
          </li>
        </ul>
        <p className="mt-3 font-serif text-[14px] leading-[1.6] text-ink-2">
          This short guide walks you through each feature step by step. You can
          skip any step or exit at any time.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
          >
            Skip Guide
          </button>
          <button
            type="button"
            onClick={onStart}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
          >
            Start Guide
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complete Modal ─────────────────────────────────────────────────────────

function CompleteModal({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4">
      <div className="w-[min(420px,100%)] border border-line bg-paper p-5 shadow-[0_16px_40px_rgba(22,29,38,0.14)]">
        <h2 className="font-sans text-[18px] font-medium text-ink">
          You&apos;re all set!
        </h2>
        <p className="mt-3 font-serif text-[15px] leading-[1.7] text-ink-2">
          You now know the basics of Longhand and how to use its main features.
        </p>
        <ul className="mt-3 space-y-1 font-serif text-[14px] leading-[1.6] text-ink-2">
          <li>Write notes, keywords, quotations, and questions</li>
          <li>Search when you forget something</li>
          <li>Review when notes are due</li>
          <li>Open <strong className="text-ink">Guide</strong> in the sidebar to see this again</li>
        </ul>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onFinish}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-paper hover:bg-rule"
          >
            Start Using the App
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Positioning ───────────────────────────────────────────────────────

function computeCardPosition(
  hole: DOMRect | null,
  card: HTMLElement | null,
): { top: number; left: number } {
  const vw = typeof window === "undefined" ? 800 : window.innerWidth;
  const vh = typeof window === "undefined" ? 600 : window.innerHeight;
  const cardW = card?.offsetWidth ?? 300;
  const cardH = card?.offsetHeight ?? 160;
  const gap = 12;

  if (!hole) {
    return {
      top: Math.max(16, (vh - cardH) / 2),
      left: Math.max(12, (vw - cardW) / 2),
    };
  }

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  // Prefer right
  if (hole.right + gap + cardW < vw - 8) {
    return {
      left: hole.right + gap,
      top: clamp(hole.top, 8, vh - cardH - 8),
    };
  }
  // Try left
  if (hole.left - gap - cardW > 8) {
    return {
      left: hole.left - gap - cardW,
      top: clamp(hole.top, 8, vh - cardH - 8),
    };
  }
  // Try below
  if (hole.bottom + gap + cardH < vh - 8) {
    return {
      left: clamp(hole.left + hole.width / 2 - cardW / 2, 8, vw - cardW - 8),
      top: hole.bottom + gap,
    };
  }
  // Above
  return {
    left: clamp(hole.left + hole.width / 2 - cardW / 2, 8, vw - cardW - 8),
    top: Math.max(8, hole.top - gap - cardH),
  };
}
