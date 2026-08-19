import { callForcedTool, hashBytes } from "@/lib/ai/haiku";

export type AssistOperation = "spell" | "rewrite" | "proofread";
export type DictateTarget = "notes" | "keywords";
export type AssistMode = "notes" | "prose" | "academic";

export type ProofSeverity = "issue" | "suggestion";
export type ProofIssue = {
  kind:
    | "spelling"
    | "grammar"
    | "clarity"
    | "missing_concept"
    | "missing_thinker"
    | "missing_example"
    | "ambiguity";
  severity: ProofSeverity;
  span: string;
  problem: string;
  suggestion: string | null;
};

export type AssistPayload =
  | { op: "spell"; corrected: string; changed: boolean }
  | {
      op: "rewrite";
      rewritten: string;
      changed: boolean;
      note: string | null;
    }
  | { op: "proofread"; issues: ProofIssue[]; summary: string | null };

const SPELL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["corrected", "changed"],
  properties: {
    corrected: { type: "string" },
    changed: { type: "boolean" },
  },
} as const;

const REWRITE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rewritten", "changed", "note"],
  properties: {
    rewritten: { type: "string" },
    changed: { type: "boolean" },
    note: { type: ["string", "null"] },
  },
} as const;

const PROOF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issues", "summary"],
  properties: {
    summary: { type: ["string", "null"] },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "severity", "span", "problem", "suggestion"],
        properties: {
          kind: {
            type: "string",
            enum: [
              "spelling",
              "grammar",
              "clarity",
              "missing_concept",
              "missing_thinker",
              "missing_example",
              "ambiguity",
            ],
          },
          severity: { type: "string", enum: ["issue", "suggestion"] },
          span: { type: "string" },
          problem: { type: "string" },
          suggestion: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

function contextBlock(input: {
  selection: string;
  before?: string;
  after?: string;
  topic?: string;
  mode: AssistMode;
}) {
  const parts = [
    `MODE: ${input.mode}`,
    input.topic ? `DOCUMENT_TOPIC: ${input.topic}` : null,
    input.before ? `BEFORE_TEXT:\n${input.before}` : null,
    input.after ? `AFTER_TEXT:\n${input.after}` : null,
    `SELECTED_TEXT:\n${input.selection}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

const SHARED_INTENT = `You are a fast inline writing assistant embedded next to a right-click menu.
The user selected a span of text and asked for one specific operation.
Never invent citations, thinkers, cases, or facts that are not present in the provided context.
When MODE is "notes" the user is intentionally writing compressed study notes: fragments,
missing articles, and short phrases are deliberate and MUST be preserved.
Do not ask clarification questions. If context is enough, act. If not, return a minimal no-op.`;

export async function assistSpell(input: {
  selection: string;
  before?: string;
  after?: string;
  topic?: string;
  mode: AssistMode;
}) {
  return callForcedTool<{ corrected: string; changed: boolean }>({
    cacheKey: hashBytes(`assist_spell\n${input.mode}\n${input.selection}`),
    toolName: "spell_fix",
    description:
      "Fix orthography and obvious typos only. Preserve punctuation, hyphenation, and abbreviations.",
    schema: SPELL_SCHEMA,
    system: `${SHARED_INTENT}
OPERATION: FIX_SPELLING.
Rules:
- Correct only misspelled words and obvious typos.
- Do not rephrase, restructure, add words, or expand abbreviations.
- Preserve the user's punctuation, dashes, and capitalisation.
- If nothing is misspelled, return the input verbatim with changed=false.`,
    userText: contextBlock(input),
  });
}

export async function assistRewrite(input: {
  selection: string;
  before?: string;
  after?: string;
  topic?: string;
  mode: AssistMode;
}) {
  return callForcedTool<{
    rewritten: string;
    changed: boolean;
    note: string | null;
  }>({
    cacheKey: hashBytes(`assist_rewrite\n${input.mode}\n${input.selection}`),
    toolName: "rewrite_selection",
    description:
      "Rewrite the selected span for clarity while preserving the user's meaning and style register.",
    schema: REWRITE_SCHEMA,
    system: `${SHARED_INTENT}
OPERATION: REWRITE.
Rules:
- Improve clarity, grammar, and flow while preserving meaning.
- If MODE is "notes": keep it as a concise study note. Do NOT convert fragments into full paragraphs.
  You may join with commas or an em dash, fix obvious grammar, and disambiguate a term only if the
  surrounding context makes the meaning unambiguous.
- If MODE is "prose" or "academic": produce a clean sentence or short passage.
- Do not add facts, thinkers, cases, or citations that are not in the context.
- If the selection is already clear, return it verbatim with changed=false and a short note explaining why.
- "note" is a one-line explanation of what you changed (or why you didn't).`,
    userText: contextBlock(input),
  });
}

const DICTATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "changed"],
  properties: {
    items: {
      type: "array",
      items: { type: "string" },
    },
    changed: { type: "boolean" },
  },
} as const;

export async function assistDictateRefine(input: {
  transcript: string;
  target: DictateTarget;
  topic?: string;
}) {
  return callForcedTool<{ items: string[]; changed: boolean }>({
    cacheKey: hashBytes(
      `assist_dictate\n${input.target}\n${input.topic ?? ""}\n${input.transcript}`,
    ),
    toolName: "refine_dictation",
    description:
      "Clean a spoken transcript. Keep the speaker's meaning. Do not invent content.",
    schema: DICTATE_SCHEMA,
    system: `${SHARED_INTENT}
OPERATION: REFINE_DICTATION.
The user spoke these words. They are the author. You only tidy the transcript.
Rules:
- Remove filler (um, uh, like, you know), false starts, and repeated stutters.
- Add punctuation and light grammar so the text is readable.
- Do not add facts, names, cases, thinkers, or ideas that were not spoken.
- Do not expand a short spoken note into an essay.
- If TARGET is "notes": return exactly one item — the whole take as a single study note. Do not split into bullets or separate points. Fragments are correct.
- If TARGET is "keywords": return short term chips the speaker named. Split lists. Keep proper nouns. Do not invent extra terms.
- If the transcript is already clean, return it as items with changed=false.
- items must never be empty if the transcript has words.`,
    userText: [
      `TARGET: ${input.target}`,
      input.topic ? `DOCUMENT_TOPIC: ${input.topic}` : null,
      `TRANSCRIPT:\n${input.transcript}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  });
}

export async function assistProofread(input: {
  selection: string;
  before?: string;
  after?: string;
  topic?: string;
  mode: AssistMode;
}) {
  return callForcedTool<{ issues: ProofIssue[]; summary: string | null }>({
    cacheKey: hashBytes(`assist_proof\n${input.mode}\n${input.selection}`),
    toolName: "proofread_selection",
    description:
      "List meaningful issues in the selected span. Distinguish real problems from intentional note compression.",
    schema: PROOF_SCHEMA,
    system: `${SHARED_INTENT}
OPERATION: PROOFREAD.
Return a small list of issues. Each issue has:
- kind: spelling | grammar | clarity | missing_concept | missing_thinker | missing_example | ambiguity
- severity: "issue" for definite problems, "suggestion" for enrichment ideas.
- span: the exact substring from the selection (or "" if the issue is about something missing).
- problem: one short sentence explaining the problem.
- suggestion: optional short suggested fix or addition. Never invent a specific thinker or case name.

Rules:
- If MODE is "notes", do NOT flag fragments, missing articles, or telegraphic phrasing.
  Only flag actual ambiguity, contradictions, or missing conceptual anchors.
- If the DOCUMENT_TOPIC already establishes the referent (e.g. "Article 19"), do not ask
  "which freedom?" — treat it as resolved.
- Prefer at most 3 items. Return an empty array if the selection is fine.
- summary: one short sentence overview, or null.`,
    userText: contextBlock(input),
  });
}
