"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { attachNoteImage } from "@/lib/note-image";
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
  const rangeRef = useRef<Range | null>(null);
  const [marks, setMarks] = useState<Record<Mark, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [addingPhoto, setAddingPhoto] = useState(false);

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

  function rememberRange() {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      rangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreRange() {
    const selection = window.getSelection();
    const range = rangeRef.current;
    if (!selection || !range) {
      ref.current?.focus();
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
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

  async function insertImage(file: File) {
    setError(null);
    setAddingPhoto(true);
    try {
      const markup = await attachNoteImage(file);
      restoreRange();
      document.execCommand("insertHTML", false, markup);
      emit();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add that image.",
      );
    } finally {
      setAddingPhoto(false);
    }
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
        <span aria-hidden className="mx-1 h-4 w-px bg-line" />
        <label
          className={`inline-flex h-7 cursor-pointer items-center gap-1 px-1.5 text-ink-2 hover:text-ink ${
            addingPhoto ? "pointer-events-none opacity-40" : ""
          }`}
          onMouseDown={(event) => {
            event.preventDefault();
            rememberRange();
          }}
        >
          <ImagePlus size={13} strokeWidth={1.75} />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em]">
            {addingPhoto ? "Adding" : "Photo"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={addingPhoto}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void insertImage(file);
            }}
          />
        </label>
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
          if (file) {
            event.preventDefault();
            rememberRange();
            void insertImage(file);
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
      {error ? (
        <p className="border-t border-line px-3 py-1.5 font-serif text-[13px] italic text-rule">
          {error}
        </p>
      ) : null}
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
