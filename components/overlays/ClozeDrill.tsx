"use client";

import { useEffect, useState, useTransition } from "react";
import { submitReview } from "@/app/actions/review";
import { EVENTS, trackEvent } from "@/lib/analytics";

export function ClozeDrill({
  noteId,
  title,
  prose,
  onClose,
}: {
  noteId: string;
  title: string;
  prose: string;
  keywords?: string[];
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasContent = prose.trim().length > 0;

  useEffect(() => {
    trackEvent(EVENTS.REVIEW_STARTED, { noteId });
  }, [noteId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === " " && !revealed) {
        event.preventDefault();
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, revealed]);

  function rate(quality: number) {
    startTransition(async () => {
      const result = await submitReview(noteId, quality);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackEvent(EVENTS.REVIEW_COMPLETED, { noteId, quality });
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 pt-[8vh] pb-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recall-title"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(640px,calc(100%-2rem))] border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            id="recall-title"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule"
          >
            recall
          </p>
          <p className="font-mono text-[11px] text-ink-3">
            {revealed ? "rate honestly" : "recall in your head first"}
          </p>
        </div>
        <p className="mt-1 font-serif text-[15.5px] text-ink">{title}</p>

        {!hasContent ? (
          <p className="mt-4 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
            Write the note first. Recall reads what you actually wrote.
          </p>
        ) : !revealed ? (
          <div className="mt-4">
            <p className="font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
              Say it out loud, or write it on paper. Then reveal.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-3 border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:bg-sunk"
            >
              Reveal (space)
            </button>
          </div>
        ) : (
          <div className="mt-4 whitespace-pre-wrap font-serif text-[15.5px] leading-[1.72] text-ink">
            {prose}
          </div>
        )}

        {revealed && hasContent ? (
          <div className="mt-5 border-t border-line pt-3">
            <p className="font-serif text-[13px] italic text-ink-2">
              How well did you know it?
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((quality) => (
                <button
                  key={quality}
                  type="button"
                  disabled={pending}
                  onClick={() => rate(quality)}
                  className="h-8 w-8 border border-line bg-panel font-mono text-[13px] text-ink hover:border-rule disabled:opacity-40"
                >
                  {quality}
                </button>
              ))}
            </div>
            {error ? (
              <p className="mt-2 font-serif text-[13px] italic text-rule">
                {error}
              </p>
            ) : (
              <p className="mt-2 font-mono text-[11px] text-ink-3">
                0–2 again tomorrow · 3–5 stretches the interval
              </p>
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
        >
          Close
        </button>
      </div>
    </div>
  );
}
