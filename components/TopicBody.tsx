"use client";

import { useEffect, type ReactNode } from "react";
import { AssistArea, AssistTopicProvider } from "@/components/AssistArea";
import { SmartPasteHost } from "@/components/SmartPasteHost";
import { guideEvent } from "@/lib/onboarding";
import type { AssistMode } from "@/lib/proseAssist";

const SECTION_EVENT: Record<string, string> = {
  notes: "navigated-to-notes",
  keywords: "navigated-to-keywords",
  quotations: "navigated-to-quotations",
  questions: "navigated-to-questions",
};

export function TopicBody({
  sectionId,
  topic,
  mode,
  sectionKind,
  children,
}: {
  sectionId: string;
  topic: string;
  mode: AssistMode;
  sectionKind?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const eventName = SECTION_EVENT[sectionKind ?? mode] ?? "navigated-to-section";
    guideEvent(eventName);
  }, [sectionId, mode, sectionKind]);

  return (
    <SmartPasteHost sectionId={sectionId}>
      <AssistTopicProvider topic={topic}>
        <AssistArea mode={mode}>{children}</AssistArea>
      </AssistTopicProvider>
    </SmartPasteHost>
  );
}
