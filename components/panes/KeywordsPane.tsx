"use client";

import { useState, useTransition } from "react";
import {
  addKeyword,
  addKeywords,
  removeKeyword,
  replaceKeyword,
} from "@/app/actions/sections";
import { runAssist } from "@/app/actions/assist";
import { DictateControl } from "@/components/DictateControl";
import {
  interceptRoutedPaste,
  usePasteRouter,
} from "@/components/SmartPasteHost";
import { localSpellSuggestion, looksMisspelled } from "@/lib/spell";

export function KeywordsPane({
  sectionId,
  keywords,
  topic,
}: {
  sectionId: string;
  keywords: string[];
  topic?: string;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const paste = usePasteRouter();

  function add() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    startTransition(() => addKeyword(sectionId, value));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <KeywordChip
            key={keyword}
            keyword={keyword}
            sectionId={sectionId}
            pending={pending}
            startTransition={startTransition}
          />
        ))}
      </div>
      {keywords.length === 0 ? (
        <p className="font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
          Add the words that must survive compression.
        </p>
      ) : null}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onPaste={(event) =>
          interceptRoutedPaste(event, paste, (text) =>
            text.includes("\n") || text.includes(",") || text.length > 40,
          )
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        placeholder={pending ? "Saving…" : "Type a term, then Enter"}
        className="mt-3 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3"
      />
      <div className="mt-2">
        <DictateControl
          target="keywords"
          topic={topic}
          onApply={(items) => {
            startTransition(() => addKeywords(sectionId, items));
          }}
        />
      </div>
    </div>
  );
}

function KeywordChip({
  keyword,
  sectionId,
  pending,
  startTransition,
}: {
  keyword: string;
  sectionId: string;
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const local = localSpellSuggestion(keyword);
  const flagged = Boolean(local) || looksMisspelled(keyword);

  async function fix() {
    if (local) {
      startTransition(() => replaceKeyword(sectionId, keyword, local));
      return;
    }
    const result = await runAssist({
      operation: "spell",
      mode: "prose",
      selection: keyword,
    });
    if (
      result.ok &&
      result.payload.op === "spell" &&
      result.payload.changed &&
      result.payload.corrected !== keyword
    ) {
      const corrected = result.payload.corrected;
      startTransition(() => replaceKeyword(sectionId, keyword, corrected));
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1 border bg-panel px-2 py-0.5 font-mono text-[12px] text-ink ${
        flagged ? "border-rule border-dashed" : "border-line"
      }`}
    >
      <span className={flagged ? "underline decoration-rule decoration-1" : ""}>
        {keyword}
      </span>
      {flagged ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void fix()}
          className="font-mono text-[10px] uppercase text-rule"
        >
          Fix
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`Remove ${keyword}`}
        onClick={() =>
          startTransition(() => removeKeyword(sectionId, keyword))
        }
        className="text-ink-3 hover:text-rule"
      >
        ×
      </button>
    </span>
  );
}
