import { SectionKind } from "@prisma/client";
import type { TreeFolder, TreeNote } from "@/lib/tree-types";

export const GUIDE_STORAGE_KEY = "longhand.guide";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GuideStepId =
  | "click-new-topic"
  | "fill-folder"
  | "fill-title"
  | "click-create"
  | "open-notes"
  | "write-note"
  | "open-keywords"
  | "add-keyword"
  | "open-quotations"
  | "fill-quotation-text"
  | "fill-quotation-author"
  | "save-quotation"
  | "open-questions"
  | "fill-question"
  | "save-question"
  | "try-search"
  | "try-speak"
  | "try-review"
  | "complete";

export type GuidePhase = "hidden" | "welcome" | "active" | "complete";

export type GuideProgress = {
  phase: GuidePhase;
  stepIndex: number;
  skipped: GuideStepId[];
  done: GuideStepId[];
};

export type GuideStep = {
  id: GuideStepId;
  title: string;
  description: string;
  target: string;
  action: "click" | "navigate" | "input" | "observe";
  waitFor?: string;
  navigateTo?: string;
  fallbackTarget?: string;
};

// ─── Steps ──────────────────────────────────────────────────────────────────

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "click-new-topic",
    title: "Create your first Topic",
    description:
      "A Topic organizes everything about one subject — notes, keywords, quotations, and questions. Click \"New topic\" to start.",
    target: "[data-guide='new-topic']",
    action: "click",
    waitFor: "new-topic-dialog-opened",
  },
  {
    id: "fill-folder",
    title: "Name your folder",
    description:
      "A folder groups related topics together. Type a folder name like \"Library\" or \"History\". Think of it as a shelf for your topics.",
    target: "[data-guide='folder-input']",
    action: "observe",
    waitFor: "folder-filled",
    fallbackTarget: "[data-guide='folder-select']",
  },
  {
    id: "fill-title",
    title: "Give it a title",
    description:
      "The title is the name of this specific topic — like \"Article 19\" or \"Photosynthesis\". Type something you want to study.",
    target: "[data-guide='title-input']",
    action: "observe",
    waitFor: "title-filled",
  },
  {
    id: "click-create",
    title: "Click Create",
    description:
      "Once you have a folder and title, click Create. This makes your topic with four empty files ready to fill.",
    target: "[data-guide='create-btn']",
    action: "click",
    waitFor: "topic-created",
  },
  {
    id: "open-notes",
    title: "Open the Notes file",
    description:
      "Your topic now has four files in the sidebar: Keywords, Quotations, Notes, and Questions. Click \"notes\" to open it — that's where you write your own ideas.",
    target: "[data-guide='notes-file']",
    action: "click",
    waitFor: "navigated-to-notes",
    fallbackTarget: "[data-guide='files']",
  },
  {
    id: "write-note",
    title: "Add your first note",
    description:
      "A note is one short idea in your own words. Click the + button below to add a point, then type something short.",
    target: "[data-guide='add-note']",
    action: "click",
    waitFor: "note-added",
  },
  {
    id: "open-keywords",
    title: "Open Keywords",
    description:
      "Keywords are the important terms you need to remember. Click \"keywords\" in the sidebar under your topic.",
    target: "[data-guide='keywords-file']",
    action: "click",
    waitFor: "navigated-to-keywords",
    fallbackTarget: "[data-guide='files']",
  },
  {
    id: "add-keyword",
    title: "Type a keyword",
    description:
      "Type a word or short phrase that's important for this topic, then press Enter. For example: \"fundamental rights\" or \"chloroplast\".",
    target: "[data-guide='keyword-input']",
    action: "input",
    waitFor: "keyword-added",
  },
  {
    id: "open-quotations",
    title: "Open Quotations",
    description:
      "Quotations store exact words someone else said — with their name. Click \"quotations\" in the sidebar.",
    target: "[data-guide='quotations-file']",
    action: "click",
    waitFor: "navigated-to-quotations",
    fallbackTarget: "[data-guide='files']",
  },
  {
    id: "fill-quotation-text",
    title: "Type the quotation",
    description:
      "In the text area below, type the exact words someone said. For example: \"The soul of India lives in its villages.\"",
    target: "[data-guide='quotation-text']",
    action: "observe",
    waitFor: "quotation-text-filled",
  },
  {
    id: "fill-quotation-author",
    title: "Who said it?",
    description:
      "Type the name of the person who said it in the \"Attributed to\" field. Then click \"Save quotation\".",
    target: "[data-guide='quotation-author']",
    action: "observe",
    waitFor: "quotation-added",
  },
  {
    id: "save-quotation",
    title: "Save the quotation",
    description:
      "Click \"Save quotation\" to keep it. It will appear under this topic whenever you need it.",
    target: "[data-guide='save-quotation']",
    action: "click",
    waitFor: "quotation-added",
  },
  {
    id: "open-questions",
    title: "Open Questions",
    description:
      "Questions are things you want to test yourself on later. Click \"questions\" in the sidebar.",
    target: "[data-guide='questions-file']",
    action: "click",
    waitFor: "navigated-to-questions",
    fallbackTarget: "[data-guide='files']",
  },
  {
    id: "fill-question",
    title: "Write a question",
    description:
      "Type a question you'd struggle to answer in the \"Stem\" field. The harder the question, the more useful it is for learning.",
    target: "[data-guide='question-stem']",
    action: "observe",
    waitFor: "question-stem-filled",
  },
  {
    id: "save-question",
    title: "Save the question",
    description:
      "Fill in the options if it's MCQ, or leave it as descriptive. Then click \"Keep this question\" to save it.",
    target: "[data-guide='save-question']",
    action: "click",
    waitFor: "question-added",
  },
  {
    id: "try-search",
    title: "Search your notes",
    description:
      "Search finds anything you've written across all topics. Click \"Search notes\" or press ⌘K (Ctrl+K on Windows).",
    target: "[data-guide='search']",
    action: "click",
    waitFor: "search-opened",
  },
  {
    id: "try-speak",
    title: "Try speaking a note",
    description:
      "Instead of typing, you can talk. Go to Notes and click \"Speak\" — your voice becomes text. Skip this if you prefer typing.",
    target: "[data-guide='speak']",
    action: "observe",
    waitFor: "speak-used",
  },
  {
    id: "try-review",
    title: "Review your notes",
    description:
      "Review tests if you still remember what you wrote. Click \"Review\" in the sidebar. Notes appear here when they're due.",
    target: "[data-guide='review']",
    action: "click",
    waitFor: "navigated-to-review",
  },
  {
    id: "complete",
    title: "You're all set!",
    description:
      "You now know how to use Longhand. Write notes, add keywords, save quotations, create questions, and review when due. Click \"Guide\" in the sidebar any time to see this again.",
    target: "[data-guide='guide']",
    action: "observe",
    waitFor: "dismissed",
  },
];

// ─── Persistence ────────────────────────────────────────────────────────────

export const EMPTY_PROGRESS: GuideProgress = {
  phase: "hidden",
  stepIndex: 0,
  skipped: [],
  done: [],
};

export function readGuideProgress(): GuideProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROGRESS, phase: "welcome" };
    const parsed = JSON.parse(raw) as Partial<GuideProgress>;
    return {
      phase: (parsed.phase as GuidePhase) ?? "welcome",
      stepIndex:
        typeof parsed.stepIndex === "number"
          ? Math.min(parsed.stepIndex, GUIDE_STEPS.length - 1)
          : 0,
      skipped: Array.isArray(parsed.skipped) ? parsed.skipped : [],
      done: Array.isArray(parsed.done) ? parsed.done : [],
    };
  } catch {
    return { ...EMPTY_PROGRESS, phase: "welcome" };
  }
}

export function writeGuideProgress(progress: GuideProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(progress));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function flattenNotes(folders: TreeFolder[]): TreeNote[] {
  const notes: TreeNote[] = [];
  function walk(list: TreeFolder[]) {
    for (const folder of list) {
      notes.push(...folder.notes);
      walk(folder.children);
    }
  }
  walk(folders);
  return notes;
}

export function firstNotesSectionId(folders: TreeFolder[]): string | null {
  for (const note of flattenNotes(folders)) {
    const section = note.sections.find((s) => s.kind === SectionKind.NOTES);
    if (section) return section.id;
  }
  return null;
}

export function findTargetEl(selector: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return el;
}

export function guideEvent(name: string) {
  window.dispatchEvent(new CustomEvent("longhand:guide", { detail: name }));
}
