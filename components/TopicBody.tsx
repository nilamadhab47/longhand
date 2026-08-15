"use client";

import { type ReactNode } from "react";
import { AssistArea, AssistTopicProvider } from "@/components/AssistArea";
import { SmartPasteHost } from "@/components/SmartPasteHost";
import type { AssistMode } from "@/lib/proseAssist";

export function TopicBody({
  sectionId,
  topic,
  mode,
  children,
}: {
  sectionId: string;
  topic: string;
  mode: AssistMode;
  children: ReactNode;
}) {
  return (
    <SmartPasteHost sectionId={sectionId}>
      <AssistTopicProvider topic={topic}>
        <AssistArea mode={mode}>{children}</AssistArea>
      </AssistTopicProvider>
    </SmartPasteHost>
  );
}
