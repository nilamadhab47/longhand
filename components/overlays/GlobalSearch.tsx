"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { SearchHit } from "@/lib/search";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSuggestions([]);
    setResults([]);
    setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const [suggestRes, searchRes] = await Promise.all([
          fetch(`/api/search/suggest?prefix=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          }),
          fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          }),
        ]);
        const suggestJson = (await suggestRes.json()) as { terms: string[] };
        const searchJson = (await searchRes.json()) as { results: SearchHit[] };
        setSuggestions(suggestJson.terms);
        setResults(searchJson.results);
        setCursor(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [q, open]);

  const totalItems = suggestions.length + results.length;

  const openHit = useCallback(
    (hit: SearchHit) => {
      onOpenChange(false);
      router.push(`/n/${hit.sectionId}?highlight=${encodeURIComponent(q)}`);
    },
    [onOpenChange, router, q],
  );

  const selectSuggestion = useCallback((term: string) => {
    setQ(term);
    setCursor(0);
    inputRef.current?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((c) => Math.min(c + 1, Math.max(0, totalItems - 1)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (cursor < suggestions.length) {
          const term = suggestions[cursor];
          if (term) selectSuggestion(term);
          return;
        }
        const hit = results[cursor - suggestions.length];
        if (hit) openHit(hit);
      }
    },
    [cursor, onOpenChange, openHit, results, selectSuggestion, suggestions, totalItems],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-stretch justify-start bg-ink/25 sm:items-center sm:justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full flex-col border border-line bg-paper shadow-[0_8px_24px_rgba(22,29,38,0.14)] sm:h-auto sm:w-[min(640px,calc(100%-2rem))]"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Search size={14} strokeWidth={1.75} className="text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search notes — freedom, article 19, ambedkar…"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent font-serif text-[15.5px] leading-[1.72] text-ink outline-none placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            {loading ? "…" : q.length >= 2 ? `${totalItems}` : "⌘K"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto sm:max-h-[60vh]">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 font-serif text-[13px] italic text-ink-3">
              Type at least two letters. ↑/↓ to navigate. Enter to open.
            </p>
          ) : totalItems === 0 && !loading ? (
            <p className="px-3 py-6 font-serif text-[13px] italic text-ink-3">
              Nothing yet. Try a different word.
            </p>
          ) : (
            <>
              {suggestions.length > 0 ? (
                <div className="border-b border-line py-1">
                  <p className="px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                    Suggestions
                  </p>
                  {suggestions.map((term, index) => {
                    const active = cursor === index;
                    return (
                      <button
                        key={term}
                        type="button"
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => selectSuggestion(term)}
                        className={`block w-full px-3 py-1.5 text-left font-serif text-[14px] text-ink ${
                          active ? "bg-sunk" : ""
                        }`}
                      >
                        {term}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {results.length > 0 ? (
                <div className="py-1">
                  <p className="px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                    Notes
                  </p>
                  {results.map((hit, index) => {
                    const cursorIndex = suggestions.length + index;
                    const active = cursor === cursorIndex;
                    return (
                      <button
                        key={`${hit.noteId}-${hit.sectionId}`}
                        type="button"
                        onMouseEnter={() => setCursor(cursorIndex)}
                        onClick={() => openHit(hit)}
                        className={`block w-full border-l-2 px-3 py-2 text-left ${
                          active
                            ? "border-rule bg-sunk"
                            : "border-transparent"
                        }`}
                      >
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-brass">
                          {hit.folder} · {hit.matched}
                        </p>
                        <p className="font-serif text-[14.5px] text-ink">
                          {highlight(hit.title, q)}
                        </p>
                        {hit.snippet && hit.snippet !== hit.title ? (
                          <p className="mt-0.5 font-serif text-[12.5px] italic leading-snug text-ink-2">
                            {highlight(hit.snippet, q)}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (q.length === 0) return text;
  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={idx}
        className="bg-transparent text-rule underline decoration-rule/40 decoration-1 underline-offset-2"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return parts;
}
