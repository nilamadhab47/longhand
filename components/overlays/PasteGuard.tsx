"use client";

import { useEffect, useRef, useState } from "react";

export function PasteGuard({
  characterCount,
  onSubmit,
  onDiscard,
}: {
  characterCount: number;
  onSubmit: (bullets: [string, string, string]) => void;
  onDiscard: () => void;
}) {
  const [one, setOne] = useState("");
  const [two, setTwo] = useState("");
  const [three, setThree] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDiscard();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDiscard]);

  const ready =
    one.trim().length > 2 && two.trim().length > 2 && three.trim().length > 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 pt-[12vh]"
      onClick={onDiscard}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-guard-title"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(480px,calc(100%-2rem))] border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
      >
        <p
          id="paste-guard-title"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule"
        >
          paste held
        </p>
        <p className="mt-2 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
          {characterCount} characters. Compress it into three points of your
          own. The original is discarded.
        </p>
        <ol className="mt-4 space-y-2">
          <li>
            <input
              ref={firstRef}
              value={one}
              onChange={(event) => setOne(event.target.value)}
              placeholder="1."
              className="w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink"
            />
          </li>
          <li>
            <input
              value={two}
              onChange={(event) => setTwo(event.target.value)}
              placeholder="2."
              className="w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink"
            />
          </li>
          <li>
            <input
              value={three}
              onChange={(event) => setThree(event.target.value)}
              placeholder="3."
              className="w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink"
            />
          </li>
        </ol>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() =>
              onSubmit([one.trim(), two.trim(), three.trim()])
            }
            className="border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-40"
          >
            File the three points
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
