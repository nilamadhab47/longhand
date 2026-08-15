"use client";

import { useEffect, useRef, useState } from "react";
import {
  fileToImage,
  usePasteRouter,
} from "@/components/SmartPasteHost";
import { toEditorHtml } from "@/lib/html";

type Mark = "bold" | "italic" | "underline";

export function NotesEditor({
  html,
  onChange,
  onPasteTooLong,
  label = "Notes",
  autoFocus = false,
}: {
  html: string;
  onChange: (next: string) => void;
  onPasteTooLong: (characterCount: number) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const paste = usePasteRouter();
  const [marks, setMarks] = useState<Record<Mark, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const next = toEditorHtml(html);
    if (document.activeElement === node) return;
    if (node.innerHTML !== next) {
      node.innerHTML = next;
    }
    if (autoFocus) node.focus();
  }, [html, autoFocus]);

  function emit() {
    onChange(ref.current?.innerHTML ?? "");
  }

  function syncMarks() {
    setMarks({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }

  function run(command: Mark) {
    ref.current?.focus();
    document.execCommand(command, false);
    emit();
    syncMarks();
  }

  return (
    <div className="border border-line bg-panel">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1">
        <MarkButton
          label="B"
          title="Bold"
          active={marks.bold}
          onClick={() => run("bold")}
          className="font-semibold"
        />
        <MarkButton
          label="I"
          title="Italic"
          active={marks.italic}
          onClick={() => run("italic")}
          className="italic"
        />
        <MarkButton
          label="U"
          title="Underline"
          active={marks.underline}
          onClick={() => run("underline")}
          className="underline"
        />
      </div>
      <div
        ref={ref}
        data-notes-editor
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onMouseUp={syncMarks}
        onKeyUp={syncMarks}
        onPaste={(event) => {
          const file = [...event.clipboardData.files].find((item) =>
            item.type.startsWith("image/"),
          );
          if (file && paste) {
            event.preventDefault();
            void fileToImage(file).then((image) => paste.routeImage(image));
            return;
          }
          const pasted = event.clipboardData.getData("text/plain");
          if (pasted.length > 150) {
            event.preventDefault();
            onPasteTooLong(pasted.length);
            return;
          }
          event.preventDefault();
          document.execCommand("insertText", false, pasted);
          emit();
        }}
        className="min-h-[88px] px-3 py-2 font-serif text-[15.5px] leading-[1.72] text-ink outline-none"
      />
    </div>
  );
}

function MarkButton({
  label,
  title,
  active,
  onClick,
  className,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`h-7 min-w-7 px-1.5 font-serif text-[13px] ${className} ${
        active ? "bg-sunk text-rule" : "text-ink-2 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
