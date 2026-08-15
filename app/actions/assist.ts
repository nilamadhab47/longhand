"use server";

import {
  assistProofread,
  assistRewrite,
  assistSpell,
  type AssistMode,
  type AssistOperation,
  type AssistPayload,
} from "@/lib/proseAssist";
import { requireUser } from "@/lib/session";

export type AssistInput = {
  operation: AssistOperation;
  mode: AssistMode;
  selection: string;
  before?: string;
  after?: string;
  topic?: string;
};

export type AssistResult =
  | { ok: true; payload: AssistPayload }
  | { ok: false; error: string };

export async function runAssist(input: AssistInput): Promise<AssistResult> {
  await requireUser();
  const selection = input.selection.trim();
  if (selection.length === 0) {
    return { ok: false, error: "Select some text first." };
  }
  if (selection.length > 2000) {
    return { ok: false, error: "Selection is too long. Pick a shorter span." };
  }

  const shared = {
    selection,
    before: input.before?.slice(-400),
    after: input.after?.slice(0, 400),
    topic: input.topic?.slice(0, 200),
    mode: input.mode,
  };

  if (input.operation === "spell") {
    const result = await assistSpell(shared);
    if (!result.ok && result.reason === "capped") {
      return { ok: false, error: "Monthly API cap reached." };
    }
    if (!result.ok) return { ok: false, error: result.error };
    return {
      ok: true,
      payload: {
        op: "spell",
        corrected: result.data.corrected,
        changed: result.data.changed,
      },
    };
  }

  if (input.operation === "rewrite") {
    const result = await assistRewrite(shared);
    if (!result.ok && result.reason === "capped") {
      return { ok: false, error: "Monthly API cap reached." };
    }
    if (!result.ok) return { ok: false, error: result.error };
    return {
      ok: true,
      payload: {
        op: "rewrite",
        rewritten: result.data.rewritten,
        changed: result.data.changed,
        note: result.data.note,
      },
    };
  }

  const result = await assistProofread(shared);
  if (!result.ok && result.reason === "capped") {
    return { ok: false, error: "Monthly API cap reached." };
  }
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    payload: {
      op: "proofread",
      issues: result.data.issues,
      summary: result.data.summary,
    },
  };
}
