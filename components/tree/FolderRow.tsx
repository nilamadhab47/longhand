"use client";

import { ChevronRight, Folder, FolderOpen, Plus } from "lucide-react";
import { moveFolder } from "@/app/actions/tree";
import { IndentGuides, MoveButtons } from "@/components/tree/RowChrome";
import { TopicRow } from "@/components/tree/TopicRow";
import type { TreeFolder } from "@/lib/tree-types";

export function FolderRow({
  folder,
  depth,
  expanded,
  toggle,
  activeSectionId,
  onNewTopic,
}: {
  folder: TreeFolder;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  activeSectionId: string | null;
  onNewTopic: (folderId: string) => void;
}) {
  const open = expanded.has(folder.id);
  const Icon = open ? FolderOpen : Folder;

  return (
    <li>
      <div
        className="group relative flex items-center py-[3px] pr-1"
        style={{ paddingLeft: depth * 15 }}
      >
        <IndentGuides depth={depth} />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => toggle(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          <ChevronRight
            size={12}
            strokeWidth={1.75}
            className={`shrink-0 text-ink-3 ${open ? "rotate-90" : ""}`}
          />
          <Icon size={14} strokeWidth={1.5} className="shrink-0 text-brass" />
          <span className="truncate font-sans text-[13px] text-ink">
            {folder.name}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Add topic in ${folder.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onNewTopic(folder.id);
          }}
          className="p-0.5 text-ink-3 hover:text-rule"
        >
          <Plus size={12} strokeWidth={1.75} />
        </button>
        <MoveButtons
          onUp={() => moveFolder(folder.id, "up")}
          onDown={() => moveFolder(folder.id, "down")}
        />
      </div>
      {open ? (
        <ul>
          {folder.children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              activeSectionId={activeSectionId}
              onNewTopic={onNewTopic}
            />
          ))}
          {folder.notes.map((note) => (
            <TopicRow
              key={note.id}
              note={note}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              activeSectionId={activeSectionId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
