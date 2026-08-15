"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, SparklesIcon, WandSparkles, CheckCheck } from "lucide-react";
import { runAssist, type AssistResult } from "@/app/actions/assist";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type {
  AssistMode,
  AssistOperation,
  AssistPayload,
  ProofIssue,
} from "@/lib/proseAssist";

type InputAnchor = {
  kind: "input";
  el: HTMLInputElement | HTMLTextAreaElement;
  start: number;
  end: number;
  valueSnapshot: string;
};

type EditableAnchor = {
  kind: "editable";
  host: HTMLElement;
  range: Range;
  before: string;
  after: string;
};

type Anchor = InputAnchor | EditableAnchor;

type CaptureState = {
  anchor: Anchor;
  selection: string;
  before: string;
  after: string;
  mode: AssistMode;
  topic?: string;
  position: { x: number; y: number };
};

type ActiveState =
  | { status: "menu"; capture: CaptureState }
  | { status: "loading"; capture: CaptureState; operation: AssistOperation }
  | {
      status: "result";
      capture: CaptureState;
      operation: AssistOperation;
      result: AssistResult;
    }
  | {
      status: "applied";
      capture: CaptureState;
      operation: AssistOperation;
      undo: () => void;
    };

const AssistContext = createContext<{
  topic?: string;
} | null>(null);

export function AssistTopicProvider({
  topic,
  children,
}: {
  topic?: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ topic }), [topic]);
  return (
    <AssistContext.Provider value={value}>{children}</AssistContext.Provider>
  );
}

function useTopic() {
  return useContext(AssistContext)?.topic;
}

export function AssistArea({
  mode,
  className,
  children,
}: {
  mode: AssistMode;
  className?: string;
  children: ReactNode;
}) {
  const topic = useTopic();
  const rootRef = useRef<HTMLDivElement>(null);
  const [capture, setCapture] = useState<CaptureState | null>(null);
  const [active, setActive] = useState<ActiveState | null>(null);
  const [touchPill, setTouchPill] = useState<{
    capture: CaptureState;
  } | null>(null);

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-no-assist]")) {
        setCapture(null);
        return;
      }

      let anchor: Anchor | null = null;
      let selection = "";
      let before = "";
      let after = "";

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const el = target;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        if (start === end) {
          setCapture(null);
          return;
        }
        selection = el.value.slice(start, end);
        before = el.value.slice(Math.max(0, start - 400), start);
        after = el.value.slice(end, end + 400);
        anchor = {
          kind: "input",
          el,
          start,
          end,
          valueSnapshot: el.value,
        };
      } else {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setCapture(null);
          return;
        }
        const range = sel.getRangeAt(0).cloneRange();
        selection = sel.toString();
        const host = findEditableHost(range.startContainer);
        if (!host) {
          setCapture(null);
          return;
        }
        const hostText = host.innerText ?? "";
        const selText = selection;
        const idx = hostText.indexOf(selText);
        if (idx >= 0) {
          before = hostText.slice(Math.max(0, idx - 400), idx);
          after = hostText.slice(idx + selText.length, idx + selText.length + 400);
        }
        anchor = { kind: "editable", host, range, before, after };
      }

      if (!anchor || selection.trim().length === 0) {
        setCapture(null);
        return;
      }

      setCapture({
        anchor,
        selection,
        before,
        after,
        mode,
        topic,
        position: { x: event.clientX, y: event.clientY },
      });
      setActive(null);
    },
    [mode, topic],
  );

  const run = useCallback(
    async (operation: AssistOperation) => {
      if (!capture) return;
      setActive({ status: "loading", capture, operation });
      const result = await runAssist({
        operation,
        mode: capture.mode,
        selection: capture.selection,
        before: capture.before,
        after: capture.after,
        topic: capture.topic,
      });
      setActive({ status: "result", capture, operation, result });
    },
    [capture],
  );

  const close = useCallback(() => {
    setActive(null);
    setCapture(null);
    setTouchPill(null);
  }, []);

  // Touch equivalent for right-click: watch selection changes and, if there's
  // a non-empty selection inside this AssistArea on a touch device, offer a
  // small "Assist" pill above the selection. Tapping it opens the same menu
  // the desktop context menu shows.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    if (!isCoarse) return;

    function trySnapshot() {
      const root = rootRef.current;
      if (!root) {
        setTouchPill(null);
        return;
      }
      const active = document.activeElement;
      let localCapture: CaptureState | null = null;
      let point: { x: number; y: number } | null = null;

      if (
        (active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement) &&
        root.contains(active) &&
        !active.closest("[data-no-assist]")
      ) {
        const el = active;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        if (start === end) {
          setTouchPill(null);
          return;
        }
        const selection = el.value.slice(start, end);
        const before = el.value.slice(Math.max(0, start - 400), start);
        const after = el.value.slice(end, end + 400);
        const rect = el.getBoundingClientRect();
        point = { x: rect.left + rect.width / 2, y: rect.top };
        localCapture = {
          anchor: {
            kind: "input",
            el,
            start,
            end,
            valueSnapshot: el.value,
          },
          selection,
          before,
          after,
          mode,
          topic,
          position: point,
        };
      } else {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setTouchPill(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const anchorNode =
          range.startContainer instanceof Element
            ? range.startContainer
            : range.startContainer.parentElement;
        if (!anchorNode || !root.contains(anchorNode)) {
          setTouchPill(null);
          return;
        }
        if (anchorNode.closest("[data-no-assist]")) {
          setTouchPill(null);
          return;
        }
        const host = findEditableHost(range.startContainer);
        if (!host) {
          setTouchPill(null);
          return;
        }
        const selection = sel.toString();
        if (selection.trim().length === 0) {
          setTouchPill(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        point = { x: rect.left + rect.width / 2, y: rect.top };
        const hostText = host.innerText ?? "";
        const idx = hostText.indexOf(selection);
        let before = "";
        let after = "";
        if (idx >= 0) {
          before = hostText.slice(Math.max(0, idx - 400), idx);
          after = hostText.slice(idx + selection.length, idx + selection.length + 400);
        }
        localCapture = {
          anchor: { kind: "editable", host, range: range.cloneRange(), before, after },
          selection,
          before,
          after,
          mode,
          topic,
          position: point,
        };
      }

      if (localCapture) setTouchPill({ capture: localCapture });
      else setTouchPill(null);
    }

    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(trySnapshot);
    };
    document.addEventListener("selectionchange", schedule);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", schedule);
    };
  }, [mode, topic]);

  return (
    <div ref={rootRef} className={className} onContextMenuCapture={onContextMenu}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>{children}</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={!capture}
            onSelect={() => void run("spell")}
          >
            <CheckCheck size={13} strokeWidth={1.75} className="text-ink-3" />
            Fix spelling
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!capture}
            onSelect={() => void run("rewrite")}
          >
            <WandSparkles size={13} strokeWidth={1.75} className="text-ink-3" />
            Rewrite
          </ContextMenuItem>
          <ContextMenuSeparator className="my-1 h-px bg-line" />
          <ContextMenuItem
            disabled={!capture}
            onSelect={() => void run("proofread")}
          >
            <SparklesIcon size={13} strokeWidth={1.75} className="text-ink-3" />
            Proofread
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {touchPill && !active ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setCapture(touchPill.capture);
            setActive({ status: "menu", capture: touchPill.capture });
            setTouchPill(null);
          }}
          className="fixed z-40 -translate-x-1/2 -translate-y-full border border-line bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-rule shadow-[0_8px_24px_rgba(22,29,38,0.14)]"
          style={{
            left: Math.min(
              Math.max(touchPill.capture.position.x, 60),
              (typeof window !== "undefined" ? window.innerWidth : 0) - 60,
            ),
            top: Math.max(touchPill.capture.position.y - 8, 40),
          }}
        >
          Assist
        </button>
      ) : null}

      {active ? <SuggestionCard state={active} onRun={run} onClose={close} /> : null}
    </div>
  );
}

function SuggestionCard({
  state,
  onRun,
  onClose,
}: {
  state: ActiveState;
  onRun: (op: AssistOperation) => void;
  onClose: () => void;
}) {
  const { capture } = state;
  const { position } = capture;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onDocClick(event: MouseEvent) {
      if (!cardRef.current) return;
      if (!cardRef.current.contains(event.target as Node)) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [onClose]);

  const title =
    state.status === "menu"
      ? "Writing tools"
      : state.status === "loading" || state.status === "result"
        ? state.operation === "spell"
          ? "Fix spelling"
          : state.operation === "rewrite"
            ? "Rewrite"
            : "Proofread"
        : "Applied";

  const [applied, setApplied] = useState<{ undo: () => void } | null>(null);

  useEffect(() => {
    if (!applied) return;
    const timer = window.setTimeout(() => setApplied(null), 6000);
    return () => window.clearTimeout(timer);
  }, [applied]);

  function apply(next: string) {
    const undo = applyReplacement(capture.anchor, next);
    if (undo) setApplied({ undo });
    else onClose();
  }

  const desktopStyle: React.CSSProperties = isMobile
    ? {}
    : {
        left: Math.min(
          Math.max(position.x, 12),
          (typeof window !== "undefined" ? window.innerWidth : 400) - 360,
        ),
        top: Math.min(
          position.y + 12,
          (typeof window !== "undefined" ? window.innerHeight : 800) - 220,
        ),
      };

  const shellClass = isMobile
    ? "fixed inset-x-0 bottom-0 z-50 w-full border-t border-line bg-paper p-4 pb-[calc(1rem+var(--sab,0px))] font-sans text-[14px] text-ink shadow-[0_-8px_24px_rgba(22,29,38,0.14)]"
    : "fixed z-50 w-[340px] border border-line bg-paper p-3 font-sans text-[13px] text-ink shadow-[0_8px_24px_rgba(22,29,38,0.14)]";

  return (
    <div ref={cardRef} role="dialog" className={shellClass} style={desktopStyle}>
      {isMobile ? (
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-line"
        />
      ) : null}
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
        >
          {isMobile ? "Close" : "Esc"}
        </button>
      </div>

      <p className="mb-2 line-clamp-3 border-l-2 border-line pl-2 font-serif text-[13px] italic leading-snug text-ink-2">
        {capture.selection}
      </p>

      {state.status === "menu" ? (
        <MenuActions onRun={onRun} onClose={onClose} />
      ) : null}

      {state.status === "loading" ? (
        <div className="flex items-center gap-2 py-2 text-ink-3">
          <Loader2 size={14} className="animate-spin" strokeWidth={1.75} />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
            Thinking…
          </span>
        </div>
      ) : null}

      {state.status === "result" && !state.result.ok ? (
        <div className="py-1">
          <p className="font-serif text-[13px] italic text-rule">
            {state.result.error}
          </p>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "result" && state.result.ok && !applied ? (
        <ResultBody payload={state.result.payload} apply={apply} close={onClose} />
      ) : null}

      {applied ? (
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ok">
            ✓ Applied
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                applied.undo();
                setApplied(null);
                onClose();
              }}
              className="font-mono text-[11px] uppercase text-rule hover:underline"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuActions({
  onRun,
  onClose,
}: {
  onRun: (op: AssistOperation) => void;
  onClose: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-3">
      <MenuButton icon={<CheckCheck size={14} strokeWidth={1.75} />} onClick={() => onRun("spell")}>
        Fix spelling
      </MenuButton>
      <MenuButton icon={<WandSparkles size={14} strokeWidth={1.75} />} onClick={() => onRun("rewrite")}>
        Rewrite
      </MenuButton>
      <MenuButton icon={<SparklesIcon size={14} strokeWidth={1.75} />} onClick={() => onRun("proofread")}>
        Proofread
      </MenuButton>
      <div className="mt-2 flex justify-end sm:col-span-3">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-2 border border-line bg-paper px-3 text-left font-mono text-[12px] uppercase tracking-[0.05em] text-ink hover:border-rule hover:text-rule"
    >
      <span className="text-ink-3">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function ResultBody({
  payload,
  apply,
  close,
}: {
  payload: AssistPayload;
  apply: (text: string) => void;
  close: () => void;
}) {
  if (payload.op === "spell") {
    if (!payload.changed) {
      return (
        <Empty message="No spelling changes needed." onClose={close} />
      );
    }
    return (
      <Diff
        suggestion={payload.corrected}
        applyLabel="Apply"
        onApply={() => apply(payload.corrected)}
        onDismiss={close}
      />
    );
  }
  if (payload.op === "rewrite") {
    if (!payload.changed) {
      return (
        <Empty
          message={payload.note ?? "Nothing worth changing."}
          onClose={close}
        />
      );
    }
    return (
      <Diff
        suggestion={payload.rewritten}
        note={payload.note}
        applyLabel="Replace"
        onApply={() => apply(payload.rewritten)}
        onDismiss={close}
      />
    );
  }
  return <ProofList issues={payload.issues} summary={payload.summary} onClose={close} apply={apply} />;
}

function Diff({
  suggestion,
  note,
  applyLabel,
  onApply,
  onDismiss,
}: {
  suggestion: string;
  note?: string | null;
  applyLabel: string;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <div>
      <p className="font-serif text-[13.5px] leading-snug text-ink">
        {suggestion}
      </p>
      {note ? (
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
          {note}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={onApply}
          className="font-mono text-[11px] uppercase text-rule hover:underline"
        >
          {applyLabel}
        </button>
      </div>
    </div>
  );
}

function Empty({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div>
      <p className="font-serif text-[13px] italic text-ink-2">{message}</p>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ProofList({
  issues,
  summary,
  onClose,
  apply,
}: {
  issues: ProofIssue[];
  summary: string | null;
  onClose: () => void;
  apply: (text: string) => void;
}) {
  if (issues.length === 0) {
    return <Empty message={summary ?? "Reads clean."} onClose={onClose} />;
  }
  return (
    <div>
      {summary ? (
        <p className="mb-2 font-serif text-[12.5px] italic text-ink-2">
          {summary}
        </p>
      ) : null}
      <ul className="space-y-2">
        {issues.map((issue, index) => (
          <li key={index} className="border-l-2 border-line pl-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
              {labelForKind(issue.kind)}
              {issue.severity === "suggestion" ? " · suggestion" : ""}
            </p>
            {issue.span ? (
              <p className="font-serif text-[12.5px] text-ink">
                <span className="italic text-ink-2">“{issue.span}”</span>
              </p>
            ) : null}
            <p className="font-serif text-[13px] leading-snug text-ink">
              {issue.problem}
            </p>
            {issue.suggestion ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-serif text-[12.5px] text-ink-2">
                  → {issue.suggestion}
                </p>
                {issue.span ? (
                  <button
                    type="button"
                    onClick={() =>
                      issue.suggestion &&
                      apply(replaceInSpan(issue.span, issue.suggestion))
                    }
                    className="shrink-0 font-mono text-[10.5px] uppercase text-rule hover:underline"
                  >
                    Apply
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[11px] uppercase text-ink-3 hover:text-rule"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function replaceInSpan(_span: string, suggestion: string) {
  return suggestion;
}

function labelForKind(kind: ProofIssue["kind"]) {
  switch (kind) {
    case "spelling":
      return "Spelling";
    case "grammar":
      return "Grammar";
    case "clarity":
      return "Clarity";
    case "ambiguity":
      return "Ambiguity";
    case "missing_concept":
      return "Missing concept";
    case "missing_thinker":
      return "Missing thinker";
    case "missing_example":
      return "Missing example";
  }
}

function findEditableHost(node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.isContentEditable) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function applyReplacement(anchor: Anchor, next: string): (() => void) | null {
  if (anchor.kind === "input") {
    const { el, start, end, valueSnapshot } = anchor;
    let from = start;
    let to = end;
    if (el.value !== valueSnapshot) {
      const original = valueSnapshot.slice(start, end);
      const idx = el.value.indexOf(original);
      if (idx < 0) return null;
      from = idx;
      to = idx + original.length;
    }
    el.focus();
    el.setSelectionRange(from, to);
    const inserted = document.execCommand("insertText", false, next);
    if (!inserted) {
      const before = el.value;
      el.setRangeText(next, from, to, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      flashElement(el);
      return () => {
        el.focus();
        el.value = before;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
    }
    flashElement(el);
    return () => {
      el.focus();
      document.execCommand("undo");
    };
  }

  const { host, range } = anchor;
  const sel = window.getSelection();
  if (!sel) return null;
  host.focus();
  sel.removeAllRanges();
  sel.addRange(range);
  const inserted = document.execCommand("insertText", false, next);
  host.dispatchEvent(new Event("input", { bubbles: true }));
  flashElement(host);
  if (!inserted) return null;
  return () => {
    host.focus();
    document.execCommand("undo");
  };
}

function flashElement(el: HTMLElement) {
  el.setAttribute("data-assist-flash-host", "true");
  window.setTimeout(() => {
    el.removeAttribute("data-assist-flash-host");
  }, 1600);
}
