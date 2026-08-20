"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, Plus, Square, Trash2, Volume2 } from "lucide-react";
import { saveNotes } from "@/app/actions/sections";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { DictateControl } from "@/components/DictateControl";
import { ClozeDrill } from "@/components/overlays/ClozeDrill";
import { PasteGuard } from "@/components/overlays/PasteGuard";
import { NotesEditor } from "@/components/panes/NotesEditor";
import { escapeText, stripHtml, toEditorHtml } from "@/lib/html";
import {
  emptyPoint,
  notesWordCount,
  parseNotePoints,
  pointsPlainText,
  serializeNotePoints,
  type NotePoint,
} from "@/lib/note-points";

export function NotesPane({
  sectionId,
  noteId,
  title,
  content,
  keywords,
}: {
  sectionId: string;
  noteId: string;
  title: string;
  content: string;
  keywords: string[];
}) {
  const [points, setPoints] = useState(() => parseNotePoints(content));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [guardCount, setGuardCount] = useState<number | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const serialized = serializeNotePoints(points);
  const serializedRef = useRef(serialized);
  serializedRef.current = serialized;

  // Track the last content the server confirmed so we can distinguish a
  // real remote change (e.g. topic switch, edit on another device) from
  // the server just echoing what we already sent.
  const lastConfirmedRef = useRef(content);
  const skipNextSave = useRef(true);
  const savedFlashTimer = useRef<number | null>(null);

  const plain = pointsPlainText(points);
  const words = notesWordCount(serialized);

  useEffect(() => {
    // Ignore server echoes of our own writes; only reset when the content
    // actually differs from the last version we committed. This keeps the
    // cursor and editing state stable during autosave.
    if (content === lastConfirmedRef.current) return;
    if (content === serializedRef.current) {
      lastConfirmedRef.current = content;
      return;
    }
    lastConfirmedRef.current = content;
    setPoints(parseNotePoints(content));
    skipNextSave.current = true;
  }, [content]);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (serialized === lastConfirmedRef.current) {
      // Nothing to save.
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const result = await saveNotes(sectionId, serialized, { silent: true });
      if (result.ok) {
        lastConfirmedRef.current = serialized;
        setSaveState("saved");
        if (savedFlashTimer.current) window.clearTimeout(savedFlashTimer.current);
        savedFlashTimer.current = window.setTimeout(() => setSaveState("idle"), 1200);
      } else {
        setSaveState("error");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [sectionId, serialized]);

  // Flush on unmount / navigation.
  useEffect(() => {
    return () => {
      if (savedFlashTimer.current) window.clearTimeout(savedFlashTimer.current);
      if (serializedRef.current !== lastConfirmedRef.current) {
        void saveNotes(sectionId, serializedRef.current, { silent: true });
      }
    };
  }, [sectionId]);

  // Warn on tab close if there's an unsaved change in-flight.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (serializedRef.current !== lastConfirmedRef.current) {
        event.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggleRead() {
    if (!("speechSynthesis" in window) || plain.length === 0) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function updatePoint(id: string, html: string) {
    setPoints((current) =>
      current.map((point) => (point.id === id ? { ...point, html } : point)),
    );
  }

  function addPoint() {
    const point = emptyPoint();
    setPoints((current) => [...current, point]);
    setEditingId(point.id);
    trackEvent(EVENTS.NOTE_ADDED);
  }

  function deletePoint(id: string) {
    setPoints((current) => current.filter((point) => point.id !== id));
    setEditingId((current) => (current === id ? null : current));
  }

  function doneEditing(id: string) {
    setPoints((current) =>
      current.filter(
        (point) => point.id !== id || stripHtml(point.html).length > 0,
      ),
    );
    setEditingId(null);
  }

  function addFromPaste(bullets: string[]) {
    const extras: NotePoint[] = bullets.map((bullet) => ({
      id: emptyPoint().id,
      html: `<p>${escapeText(bullet)}</p>`,
    }));
    setPoints((current) => [...current, ...extras]);
    setEditingId(null);
  }

  function addFromDictation(items: string[]) {
    const text = items
      .map((item) => item.trim())
      .filter(Boolean)
      .join(" ");
    if (!text) return;
    addFromPaste([text]);
  }

  return (
    <div>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1">
          <IconButton
            label={speaking ? "Stop reading" : "Read aloud"}
            disabled={plain.length === 0}
            onClick={toggleRead}
          >
            {speaking ? (
              <Square size={14} strokeWidth={1.75} />
            ) : (
              <Volume2 size={14} strokeWidth={1.75} />
            )}
          </IconButton>
          <button
            type="button"
            onClick={() => setDrillOpen(true)}
            className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:underline"
          >
            Recall
          </button>
        </div>
        <div className="mt-2">
          <DictateControl
            target="notes"
            topic={title}
            onApply={addFromDictation}
          />
        </div>
      </div>
      {points.length === 0 ? (
        <p className="mb-3 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
          Add a point. The next unrelated idea gets its own line.
        </p>
      ) : null}
      <ul className="space-y-3">
        {points.map((point, index) => {
          const editing = editingId === point.id;
          const text = stripHtml(point.html);
          return (
            <li key={point.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-rule"
              />
              <div className="min-w-0 flex-1">
                {editing ? (
                  <NotesEditor
                    html={point.html}
                    label={`Point ${index + 1}`}
                    autoFocus
                    onChange={(html) => updatePoint(point.id, html)}
                    onPasteTooLong={setGuardCount}
                  />
                ) : (
                  <div
                    data-notes-editor
                    className="font-serif text-[15.5px] leading-[1.72] text-ink"
                    dangerouslySetInnerHTML={{
                      __html:
                        text.length > 0
                          ? toEditorHtml(point.html)
                          : '<em class="text-ink-3">Empty</em>',
                    }}
                  />
                )}
              </div>
              <div className="mt-0.5 flex shrink-0 items-center">
                {editing ? (
                  <IconButton
                    label="Done"
                    onClick={() => doneEditing(point.id)}
                    tone="rule"
                  >
                    <Check size={14} strokeWidth={1.75} />
                  </IconButton>
                ) : (
                  <IconButton
                    label="Edit"
                    onClick={() => setEditingId(point.id)}
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </IconButton>
                )}
                <IconButton
                  label="Delete"
                  onClick={() => deletePoint(point.id)}
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2">
        <IconButton label="Add point" onClick={addPoint} tone="rule">
          <Plus size={14} strokeWidth={1.75} />
        </IconButton>
      </div>
      <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[11px] text-ink-3">
        {saveState !== "idle" ? (
          <>
            <SaveIndicator state={saveState} />
            <span aria-hidden>·</span>
          </>
        ) : null}
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>
      {guardCount !== null ? (
        <PasteGuard
          characterCount={guardCount}
          onDiscard={() => setGuardCount(null)}
          onSubmit={(bullets) => {
            skipNextSave.current = false;
            addFromPaste(bullets);
            setGuardCount(null);
          }}
        />
      ) : null}
      {drillOpen ? (
        <ClozeDrill
          noteId={noteId}
          title={title}
          prose={plain}
          keywords={keywords}
          onClose={() => setDrillOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SaveIndicator({ state }: { state: "saving" | "saved" | "error" }) {
  if (state === "saving") return <span className="text-ink-3">saving…</span>;
  if (state === "saved") return <span className="text-ok">saved</span>;
  return <span className="text-rule">save failed</span>;
}

function IconButton({
  label,
  onClick,
  children,
  disabled = false,
  tone = "muted",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: "muted" | "rule";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`p-1 disabled:opacity-40 ${
        tone === "rule"
          ? "text-rule hover:text-rule"
          : "text-ink-3 hover:text-rule"
      }`}
    >
      {children}
    </button>
  );
}
