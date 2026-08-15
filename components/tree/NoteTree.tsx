"use client";

import { useEffect, useState } from "react";
import { FolderRow } from "@/components/tree/FolderRow";
import type { TreeFolder } from "@/lib/tree-types";

export function NoteTree({
  folders,
  activeSectionId,
  onNewTopic,
}: {
  folders: TreeFolder[];
  activeSectionId: string | null;
  onNewTopic: (folderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(() =>
    defaultExpanded(folders, activeSectionId),
  );

  useEffect(() => {
    setExpanded((current) => {
      const next = new Set(current);
      for (const id of lineageForSection(folders, activeSectionId)) {
        next.add(id);
      }
      return next;
    });
  }, [activeSectionId, folders]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (folders.length === 0) {
    return (
      <p className="px-3 py-2 font-serif text-[13px] italic text-ink-2">
        New topic to plant the first folder.
      </p>
    );
  }

  return (
    <ul className="px-1 pb-4">
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          activeSectionId={activeSectionId}
          onNewTopic={onNewTopic}
        />
      ))}
    </ul>
  );
}

function defaultExpanded(
  folders: TreeFolder[],
  activeSectionId: string | null,
): Set<string> {
  const ids = new Set<string>();
  function walk(folder: TreeFolder) {
    ids.add(folder.id);
    folder.children.forEach(walk);
  }
  folders.forEach(walk);
  for (const id of lineageForSection(folders, activeSectionId)) {
    ids.add(id);
  }
  return ids;
}

function lineageForSection(
  folders: TreeFolder[],
  activeSectionId: string | null,
): string[] {
  if (!activeSectionId) return [];
  const trail: string[] = [];

  function walk(folder: TreeFolder, ancestors: string[]): boolean {
    const here = [...ancestors, folder.id];
    for (const note of folder.notes) {
      if (note.sections.some((section) => section.id === activeSectionId)) {
        trail.push(...here, note.id);
        return true;
      }
    }
    return folder.children.some((child) => walk(child, here));
  }

  folders.some((folder) => walk(folder, []));
  return trail;
}
