"use client";

import Link from "next/link";
import {
  BookText,
  ChevronRight,
  FileText,
  HelpCircle,
  Quote,
  Tags,
} from "lucide-react";
import { moveNote } from "@/app/actions/tree";
import { IndentGuides, MoveButtons } from "@/components/tree/RowChrome";
import type { TreeNote, TreeSection } from "@/lib/tree-types";
import { SectionKind } from "@prisma/client";

const SECTION_META: Record<
  SectionKind,
  { label: string; icon: typeof Tags }
> = {
  KEYWORDS: { label: "keywords", icon: Tags },
  QUOTATIONS: { label: "quotations", icon: Quote },
  NOTES: { label: "notes", icon: FileText },
  QUESTIONS: { label: "questions", icon: HelpCircle },
};

export function TopicRow({
  note,
  depth,
  expanded,
  toggle,
  activeSectionId,
}: {
  note: TreeNote;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  activeSectionId: string | null;
}) {
  const open = expanded.has(note.id);

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
          onClick={() => toggle(note.id)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          <ChevronRight
            size={12}
            strokeWidth={1.75}
            className={`shrink-0 text-ink-3 ${open ? "rotate-90" : ""}`}
          />
          <BookText size={14} strokeWidth={1.5} className="shrink-0 text-ink-3" />
          <span className="truncate font-sans text-[13px] text-ink">
            {note.title}
          </span>
          {note.due ? (
            <span
              aria-label="Due for review"
              className="ml-1 inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-rule"
            />
          ) : null}
        </button>
        <MoveButtons
          onUp={() => moveNote(note.id, "up")}
          onDown={() => moveNote(note.id, "down")}
        />
      </div>
      {open ? (
        <ul data-guide="files">
          {note.sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              depth={depth + 1}
              active={section.id === activeSectionId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SectionRow({
  section,
  depth,
  active,
}: {
  section: TreeSection;
  depth: number;
  active: boolean;
}) {
  const meta = SECTION_META[section.kind];
  const Icon = meta.icon;

  return (
    <li>
      <div
        className={`relative flex items-center py-[3px] pr-2 ${active ? "bg-sunk" : ""}`}
        style={{ paddingLeft: depth * 15 }}
      >
        <IndentGuides depth={depth} />
        <Link
          href={`/n/${section.id}`}
          aria-current={active ? "page" : undefined}
          data-guide={
            section.kind === SectionKind.NOTES
              ? "notes-file"
              : section.kind === SectionKind.KEYWORDS
                ? "keywords-file"
                : section.kind === SectionKind.QUOTATIONS
                  ? "quotations-file"
                  : section.kind === SectionKind.QUESTIONS
                    ? "questions-file"
                    : undefined
          }
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          <span className="w-3 shrink-0" aria-hidden />
          <Icon size={14} strokeWidth={1.5} className="shrink-0 text-ink-3" />
          <span className="truncate font-mono text-[12px] lowercase text-ink-2">
            {meta.label}
          </span>
          {section.empty ? (
            <span
              aria-label="Empty"
              className="ml-1 inline-block h-[5px] w-[5px] shrink-0 rounded-full border border-ink-3"
            />
          ) : null}
        </Link>
      </div>
    </li>
  );
}
