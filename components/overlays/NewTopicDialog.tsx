"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createTopic } from "@/app/actions/scaffold";
import { guideEvent } from "@/lib/onboarding";
import type { TreeFolder } from "@/lib/tree-types";

export function flattenFolders(
  folders: TreeFolder[],
  prefix = "",
): { id: string; label: string }[] {
  const rows: { id: string; label: string }[] = [];
  for (const folder of folders) {
    const label = prefix ? `${prefix} / ${folder.name}` : folder.name;
    rows.push({ id: folder.id, label });
    rows.push(...flattenFolders(folder.children, label));
  }
  return rows;
}

export function NewTopicDialog({
  folders,
  folderId,
  onClose,
}: {
  folders: TreeFolder[];
  folderId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const options = useMemo(() => flattenFolders(folders), [folders]);
  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(
    folderId ?? options[0]?.id ?? "",
  );
  const [newFolder, setNewFolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsFolderName = options.length === 0 || selectedFolder === "";

  useEffect(() => {
    guideEvent("new-topic-dialog-opened");
    if (options.length > 0 && (folderId ?? options[0]?.id ?? "") !== "") {
      setTimeout(() => guideEvent("folder-filled"), 100);
    }
    const focusId = window.setTimeout(() => titleRef.current?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("keydown", onKey);
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTopic({
        title,
        folderId: needsFolderName ? undefined : selectedFolder,
        folderName: needsFolderName ? newFolder : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      if (result.sectionId) {
        router.push(`/n/${result.sectionId}`);
      }
      router.refresh();
      guideEvent("topic-created");
    });
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center bg-ink/25 pt-[18vh]"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-[min(420px,calc(100%-2rem))] border border-line bg-paper p-3 shadow-[0_8px_24px_rgba(22,29,38,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-topic-title"
      >
        <p
          id="new-topic-title"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-rule"
        >
          new topic
        </p>
        <p className="mt-1 font-serif text-[13px] italic text-ink-2">
          Four files are created with it — keywords, quotations, notes, questions.
        </p>

        {options.length > 0 ? (
          <label className="mt-3 block" data-guide="folder-select">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              Folder
            </span>
            <select
              value={selectedFolder}
              onChange={(event) => {
                setSelectedFolder(event.target.value);
                guideEvent("folder-filled");
              }}
              className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink"
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
              <option value="">New folder…</option>
            </select>
          </label>
        ) : null}

        {needsFolderName ? (
          <label className="mt-3 block" data-guide="folder-input">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
              New folder
            </span>
            <input
              value={newFolder}
              onChange={(event) => {
                setNewFolder(event.target.value);
                setError(null);
                if (event.target.value.trim().length > 0) {
                  guideEvent("folder-filled");
                }
              }}
              placeholder="Library"
              className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-mono text-[13px] text-ink placeholder:text-ink-3"
            />
          </label>
        ) : null}

        <label className="mt-3 block" data-guide="title-input">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">
            Title
          </span>
          <input
            ref={titleRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
              if (event.target.value.trim().length > 0) {
                guideEvent("title-filled");
              }
            }}
            placeholder="First page"
            className="mt-1 w-full border border-line bg-panel px-2 py-1.5 font-serif text-[15.5px] text-ink placeholder:text-ink-3"
          />
        </label>

        {error ? (
          <p className="mt-2 font-serif text-[13px] italic text-rule" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-guide="create-btn"
            disabled={pending}
            className="border border-rule bg-paper px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-rule disabled:opacity-40"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
