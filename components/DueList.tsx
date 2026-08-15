"use client";

import { useState } from "react";
import { ClozeDrill } from "@/components/overlays/ClozeDrill";

export type DueTopic = {
  id: string;
  title: string;
  paper: string;
  folderName: string;
  keywords: string[];
  notes: string;
  notesSectionId: string | null;
};

export function DueList({ groups }: { groups: { folder: string; notes: DueTopic[] }[] }) {
  const [drill, setDrill] = useState<DueTopic | null>(null);

  if (groups.length === 0) {
    return (
      <p className="mt-4 font-serif text-[15.5px] italic leading-[1.72] text-ink-2">
        Nothing due. Write a note that uses its keywords, then come back.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <section key={group.folder}>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-brass">
              {group.folder}
            </p>
            <ul className="mt-1 space-y-2">
              {group.notes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-start justify-between gap-3 border border-line bg-panel px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-serif text-[15.5px] leading-[1.72] text-ink">
                      {note.title}
                    </p>
                    <p className="font-mono text-[11px] text-ink-3">
                      {note.paper}
                      {note.keywords.length > 0
                        ? ` · ${note.keywords.join(" · ")}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrill(note)}
                    className="shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-rule hover:underline"
                  >
                    Drill
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {drill ? (
        <ClozeDrill
          noteId={drill.id}
          title={drill.title}
          prose={drill.notes}
          keywords={drill.keywords}
          onClose={() => setDrill(null)}
        />
      ) : null}
    </>
  );
}
