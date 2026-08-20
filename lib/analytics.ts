import posthog from "posthog-js";

export function identifyUser(userId: string, email?: string) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, email ? { email } : undefined);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

// Core events to track
export const EVENTS = {
  TOPIC_CREATED: "topic_created",
  NOTE_ADDED: "note_added",
  KEYWORD_ADDED: "keyword_added",
  QUOTATION_ADDED: "quotation_added",
  QUESTION_ADDED: "question_added",
  REVIEW_STARTED: "review_started",
  REVIEW_COMPLETED: "review_completed",
  SEARCH_USED: "search_used",
  SPEAK_USED: "speak_used",
  ASSIST_USED: "assist_used",
  GUIDE_STARTED: "guide_started",
  GUIDE_COMPLETED: "guide_completed",
  GUIDE_SKIPPED: "guide_skipped",
} as const;
