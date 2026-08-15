"use client";

import { useState } from "react";
import { commitRoutedPaste } from "@/app/actions/paste";
import type { RouteResult } from "@/lib/smartPaste";

export function PasteReview({
  sectionId,
  result,
  onClose,
  onCompressProse,
}: {
  sectionId: string;
  result: RouteResult;
  onClose: () => void;
  onCompressProse: (prose: string) => void;
}) {
  const [keywords, setKeywords] = useState(() =>
    result.keywords.map((item) => ({ item, on: true })),
  );
  const [quotations, setQuotations] = useState(() =>
    result.quotations.map((item) => ({ item, on: true })),
  );
  const [questions, setQuestions] = useState(() =>
    result.questions.map((item) => ({ item, on: true })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const empty =
    keywords.every((row) => !row.on) &&
    quotations.every((row) => !row.on) &&
    questions.every((row) => !row.on);

  async function commit() {
    setPending(true);
    const response = await commitRoutedPaste({
      sectionId,
      keywords: keywords.filter((row) => row.on).map((row) => row.item),
      quotations: quotations.filter((row) => row.on).map((row) => row.item),
      questions: questions.filter((row) => row.on).map((row) => row.item),
    });
    setPending(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/25 pt-[8vh] pb-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-review-title"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(560px,calc(100%-2rem))] border border-line bg-paper p-4 shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
      >
        <p
          id="paste-review-title"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule"
        >
          review paste
        </p>
        <p className="mt-1 font-mono text-[11px] text-ink-3">
          {result.tier === "local"
            ? "Routed locally — no API call"
            : result.tier === "capped"
              ? "Monthly cap reached — compress the prose yourself"
              : "Routed by Haiku"}
          {result.suggestedTopic ? ` · ${result.suggestedTopic}` : ""}
        </p>

        <Section
          title="Keywords"
          rows={keywords}
          label={(row) => row.item}
          onToggle={(index) =>
            setKeywords((current) => toggleRow(current, index))
          }
        />
        <Section
          title="Quotations"
          rows={quotations}
          label={(row) =>
            `“${row.item.text}” — ${row.item.attributedTo}`
          }
          onToggle={(index) =>
            setQuotations((current) => toggleRow(current, index))
          }
        />
        <Section
          title="Questions"
          rows={questions}
          label={(row) =>
            row.item.answerIndex === null
              ? row.item.stem
              : `${row.item.stem} (ans ${String.fromCharCode(97 + row.item.answerIndex)})`
          }
          onToggle={(index) =>
            setQuestions((current) => toggleRow(current, index))
          }
        />

        {result.prose ? (
          <div className="mt-4 border-t border-line pt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Prose — not filed
            </p>
            <p className="mt-1 max-h-28 overflow-y-auto font-serif text-[13px] italic leading-[1.72] text-ink-2">
              {result.prose}
            </p>
            <button
              type="button"
              onClick={() => onCompressProse(result.prose)}
              className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:underline"
            >
              Compress into three points
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 font-serif text-[13px] italic text-rule">{error}</p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            disabled={pending || empty}
            onClick={() => void commit()}
            className="border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-40"
          >
            {pending ? "Filing…" : "File selected"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

function Section<T>({
  title,
  rows,
  label,
  onToggle,
}: {
  title: string;
  rows: { item: T; on: boolean }[];
  label: (row: { item: T; on: boolean }) => string;
  onToggle: (index: number) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {rows.map((row, index) => (
          <li key={`${title}-${index}`}>
            <label className="flex items-start gap-2 font-serif text-[13px] leading-snug text-ink">
              <input
                type="checkbox"
                checked={row.on}
                onChange={() => onToggle(index)}
                className="mt-0.5 accent-[var(--rule)]"
              />
              <span>{label(row)}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function toggleRow<T>(
  rows: { item: T; on: boolean }[],
  index: number,
) {
  return rows.map((row, current) =>
    current === index ? { ...row, on: !row.on } : row,
  );
}
