"use client";

import { useState, useTransition } from "react";
import { QuotationSource } from "@prisma/client";
import { addQuotation, removeQuotation } from "@/app/actions/sections";
import {
  interceptRoutedPaste,
  usePasteRouter,
} from "@/components/SmartPasteHost";
import { guideEvent } from "@/lib/onboarding";

const SOURCES: QuotationSource[] = [
  "SCHOLAR",
  "JUDGMENT",
  "COMMITTEE_REPORT",
  "CONSTITUENT_ASSEMBLY",
  "ARTICLE_TEXT",
  "OTHER",
];

export type QuotationItem = {
  id: string;
  text: string;
  attributedTo: string;
  sourceType: QuotationSource;
  year: number | null;
};

export function QuotationsPane({
  sectionId,
  quotations,
}: {
  sectionId: string;
  quotations: QuotationItem[];
}) {
  const [text, setText] = useState("");
  const [attributedTo, setAttributedTo] = useState("");
  const [sourceType, setSourceType] = useState<QuotationSource>("SCHOLAR");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paste = usePasteRouter();

  const canSave = text.trim().length > 0 && attributedTo.trim().length > 0;

  function submit() {
    if (!canSave) {
      setError("A quotation needs both the line and who said it.");
      return;
    }
    const parsedYear = year.trim() === "" ? null : Number(year);
    startTransition(async () => {
      const result = await addQuotation({
        sectionId,
        text,
        attributedTo,
        sourceType,
        year:
          parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setText("");
      setAttributedTo("");
      setYear("");
      setError(null);
      guideEvent("quotation-added");
    });
  }

  return (
    <div>
      {quotations.length === 0 ? (
        <p className="mb-4 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
          File a line only when you can name who said it.
        </p>
      ) : (
        <ul className="space-y-3">
          {quotations.map((quotation) => (
            <li
              key={quotation.id}
              className="border-l-2 border-brass pl-3"
            >
              <p className="font-serif text-[15.5px] leading-[1.72] text-ink">
                {quotation.text}
              </p>
              <p className="mt-1 font-mono text-[12px] text-ink-2">
                {quotation.attributedTo}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
                {quotation.sourceType.replaceAll("_", " ")}
                {quotation.year ? ` · ${quotation.year}` : ""}
              </p>
              <button
                type="button"
                onClick={() =>
                  startTransition(() => removeQuotation(quotation.id))
                }
                className="mt-1 font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div data-guide="quotation-form" className="mt-6 space-y-2 border-t border-line pt-4">
        <textarea
          data-guide="quotation-text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.trim().length > 0) {
              guideEvent("quotation-text-filled");
            }
          }}
          onPaste={(event) =>
            interceptRoutedPaste(event, paste, (pasted) => pasted.length > 80)
          }
          placeholder="The line, exactly"
          rows={3}
          className="w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] leading-[1.72] text-ink placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3"
        />
        <input
          data-guide="quotation-author"
          value={attributedTo}
          onChange={(event) => setAttributedTo(event.target.value)}
          placeholder="Attributed to"
          className="w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3"
        />
        <div className="flex gap-2">
          <select
            value={sourceType}
            onChange={(event) =>
              setSourceType(event.target.value as QuotationSource)
            }
            className="flex-1 border border-line bg-panel px-2 py-1.5 font-mono text-[12px] uppercase text-ink"
          >
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {source.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Year"
            inputMode="numeric"
            className="w-20 border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3"
          />
        </div>
        {error ? (
          <p className="font-serif text-[13px] italic text-rule" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          data-guide="save-quotation"
          disabled={!canSave || pending}
          onClick={submit}
          className="border border-rule bg-rule px-3 py-1.5 font-sans text-[13px] font-medium text-paper disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save quotation"}
        </button>
      </div>
    </div>
  );
}
