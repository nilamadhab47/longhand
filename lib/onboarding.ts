export const GUIDE_STORAGE_KEY = "longhand.guide";

export type GuidePhase = "hidden" | "welcome" | "active" | "complete";

export type GuideProgress = {
  phase: GuidePhase;
  stepIndex: number;
};

export type GuideSlide = {
  title: string;
  body: string;
  bullets?: string[];
};

export const GUIDE_SLIDES: GuideSlide[] = [
  {
    title: "Topics",
    body: "Everything starts with a Topic. A topic is one subject you want to study — like \"Article 19\" or \"Photosynthesis\".",
    bullets: [
      "Click \"New topic\" in the sidebar to create one",
      "Give it a folder (like a shelf) and a title",
      "Each topic gets four files: Notes, Keywords, Quotations, Questions",
    ],
  },
  {
    title: "Notes",
    body: "Notes are your own ideas, written in your own words. Short points work best — one idea per line.",
    bullets: [
      "Open the \"notes\" file under any topic",
      "Click the + button to add a point",
      "You can also use \"Speak\" to dictate instead of typing",
    ],
  },
  {
    title: "Keywords",
    body: "Keywords are the important terms you need to remember for a topic.",
    bullets: [
      "Open the \"keywords\" file under any topic",
      "Type a word or phrase and press Enter",
      "They help you recall key concepts at a glance",
    ],
  },
  {
    title: "Quotations",
    body: "Quotations store exact words someone said — with attribution.",
    bullets: [
      "Open the \"quotations\" file under any topic",
      "Type the quote, who said it, and save",
      "Great for essays, answers, and revision",
    ],
  },
  {
    title: "Questions",
    body: "Questions are things you want to test yourself on later. The harder the question, the better you'll learn.",
    bullets: [
      "Open the \"questions\" file under any topic",
      "Write the stem (the question itself)",
      "Add options for MCQ, or leave it descriptive",
    ],
  },
  {
    title: "Search",
    body: "Search finds anything you've written across all your topics instantly.",
    bullets: [
      "Click \"Search notes\" in the sidebar or press ⌘K",
      "Type any word — it searches notes, keywords, quotations",
      "Jump directly to the result",
    ],
  },
  {
    title: "Speak",
    body: "Instead of typing, you can talk. Your voice becomes text.",
    bullets: [
      "Open any Notes file and click \"Speak\"",
      "Talk naturally — it transcribes for you",
      "Great when you're tired of typing",
    ],
  },
  {
    title: "Review",
    body: "Review tests if you still remember what you wrote. Notes appear here when they're due — spaced repetition helps you retain more.",
    bullets: [
      "Click \"Review\" in the sidebar",
      "Answer the questions that come up",
      "The app schedules reviews automatically",
    ],
  },
  {
    title: "Assist",
    body: "Assist uses AI to help you write better notes, generate questions, or expand your ideas.",
    bullets: [
      "Available inside Notes — look for the Assist panel",
      "Ask it to explain, summarize, or quiz you",
      "It works with what you've already written",
    ],
  },
];

export const EMPTY_PROGRESS: GuideProgress = {
  phase: "hidden",
  stepIndex: 0,
};

export function readGuideProgress(): GuideProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!raw) return { phase: "welcome", stepIndex: 0 };
    const parsed = JSON.parse(raw) as Partial<GuideProgress>;
    return {
      phase: (parsed.phase as GuidePhase) ?? "welcome",
      stepIndex:
        typeof parsed.stepIndex === "number"
          ? Math.min(parsed.stepIndex, GUIDE_SLIDES.length - 1)
          : 0,
    };
  } catch {
    return { phase: "welcome", stepIndex: 0 };
  }
}

export function writeGuideProgress(progress: GuideProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(progress));
}
