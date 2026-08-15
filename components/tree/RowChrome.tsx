"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function MoveButtons({
  onUp,
  onDown,
}: {
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <span className="ml-auto flex shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
      <button
        type="button"
        aria-label="Move up"
        onClick={(event) => {
          event.stopPropagation();
          onUp();
        }}
        className="p-0.5 text-ink-3 hover:text-ink"
      >
        <ChevronUp size={12} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Move down"
        onClick={(event) => {
          event.stopPropagation();
          onDown();
        }}
        className="p-0.5 text-ink-3 hover:text-ink"
      >
        <ChevronDown size={12} strokeWidth={1.75} />
      </button>
    </span>
  );
}

export function IndentGuides({ depth }: { depth: number }) {
  return (
    <>
      {Array.from({ length: depth }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-line"
          style={{ left: index * 15 + 7 }}
        />
      ))}
    </>
  );
}
