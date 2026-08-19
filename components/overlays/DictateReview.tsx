"use client";

import { useMemo, useState } from "react";
import { runDictateRefine } from "@/app/actions/assist";
import { splitSpokenKeywords, splitSpokenNotes } from "@/lib/speech";

export function DictateReview({
  target,
  transcript,
  topic,
  onApply,
  onClose,
}: {
  target: "notes" | "keywords";
  transcript: string;
  topic?: string;
  onApply: (items: string[]) => void;
  onClose: () => void;
}) {
  const spoken = useMemo(
    () =>
      target === "notes"
        ? splitSpokenNotes(transcript)
        : splitSpokenKeywords(transcript),
    [target, transcript],
  );
  const [items, setItems] = useState(spoken);
  const [refined, setRefined] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refine() {
    setPending(true);
    setError(null);
    const result = await runDictateRefine({
      transcript,
      target,
      topic,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems(result.items);
    setRefined(true);
  }

  function update(index: number, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? value : item)),
    );
  }

  function remove(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  const ready = items.some((item) => item.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 pt-[10vh] pb-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dictate-review-title"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(520px,calc(100%-2rem))] border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
      >
        <p
          id="dictate-review-title"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule"
        >
          spoken {target}
        </p>
        <p className="mt-1 font-serif text-[13px] italic text-ink-2">
          {refined
            ? "Cleaned by request. Edit before it lands."
            : "As spoken. Refine only if you want the fillers gone."}
        </p>

        <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
          Transcript
        </p>
        <p className="mt-1 font-serif text-[15px] leading-[1.6] text-ink-2">
          {transcript}
        </p>

        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li key={`${index}-${item.slice(0, 12)}`} className="flex gap-2">
              <textarea
                value={item}
                onChange={(event) => update(index, event.target.value)}
                rows={target === "notes" ? 5 : 1}
                className={`min-h-9 w-full resize-y border border-line bg-panel px-2 py-1.5 text-ink ${
                  target === "keywords"
                    ? "font-mono text-[13px]"
                    : "font-serif text-[15.5px] leading-[1.6]"
                }`}
              />
              {target === "keywords" ? (
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => remove(index)}
                  className="self-start font-mono text-[12px] text-ink-3 hover:text-rule"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-2 font-serif text-[13px] italic text-rule" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void refine()}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-rule disabled:opacity-40"
          >
            {pending ? "Refining…" : refined ? "Refine again" : "Refine"}
          </button>
          <button
            type="button"
            disabled={!ready || pending}
            onClick={() =>
              onApply(items.map((item) => item.trim()).filter(Boolean))
            }
            className="border border-rule bg-paper px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-rule disabled:opacity-40"
          >
            {refined ? "Apply refined" : "Use as spoken"}
          </button>
        </div>
      </div>
    </div>
  );
}
