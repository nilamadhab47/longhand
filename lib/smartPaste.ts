import { QuestionKind, QuotationSource } from "@prisma/client";
import { callForcedTool, hashBytes, type ImagePayload } from "@/lib/ai/haiku";

export type RoutedQuotation = {
  text: string;
  attributedTo: string;
  year: number | null;
  sourceType: QuotationSource;
};

export type RoutedQuestion = {
  kind: QuestionKind;
  stem: string;
  options: string[];
  answerIndex: number | null;
};

export type RouteResult = {
  keywords: string[];
  quotations: RoutedQuotation[];
  questions: RoutedQuestion[];
  prose: string;
  suggestedTopic: string | null;
  tier: "local" | "haiku" | "capped";
};

const EMPTY: Omit<RouteResult, "tier"> = {
  keywords: [],
  quotations: [],
  questions: [],
  prose: "",
  suggestedTopic: null,
};

export function routeLocal(text: string): RouteResult | null {
  const questions = parseQuestionBlocks(text);
  if (questions) {
    return { ...EMPTY, questions, tier: "local" };
  }
  const quotations = parseAttributedQuotes(text);
  if (quotations) {
    return { ...EMPTY, quotations, tier: "local" };
  }
  const keywords = parseKeywordList(text);
  if (keywords) {
    return { ...EMPTY, keywords, tier: "local" };
  }
  return null;
}

export function parseQuestionBlocks(text: string): RoutedQuestion[] | null {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks = normalized
    .split(/(?=^(?:Q\s*\d+|\d{1,2})[.)]\s+)/im)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  const questions: RoutedQuestion[] = [];
  for (const chunk of chunks) {
    const parsed = parseOneQuestion(chunk);
    if (parsed) questions.push(parsed);
  }
  return questions.length > 0 ? questions : null;
}

function parseOneQuestion(chunk: string): RoutedQuestion | null {
  const lines = chunk
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 3) return null;

  const first = lines[0] ?? "";
  const stem = first.replace(/^(?:Q\s*\d+|\d{1,2})[.)]\s*/i, "").trim();
  const options: string[] = [];
  let answerIndex: number | null = null;

  for (const line of lines.slice(1)) {
    const option = line.match(/^(?:\(?([a-d])\)|[a-d][.)])\s+(.+)$/i);
    if (option && option[1] && option[2]) {
      options.push(option[2].trim());
      continue;
    }
    const answer = line.match(
      /^(?:ans(?:wer)?)\s*[:.)]\s*\(?([a-d])\)?\.?$/i,
    );
    if (answer && answer[1]) {
      answerIndex = answer[1].toLowerCase().charCodeAt(0) - 97;
    }
  }

  if (stem.length < 8 || options.length < 2) return null;
  if (
    answerIndex !== null &&
    (answerIndex < 0 || answerIndex >= options.length)
  ) {
    answerIndex = null;
  }
  return {
    kind: QuestionKind.MCQ,
    stem,
    options,
    answerIndex,
  };
}

export function parseAttributedQuotes(text: string): RoutedQuotation[] | null {
  const quotes: RoutedQuotation[] = [];
  const pattern =
    /[“"]([^”"]{8,})[”"]\s*[—–-]\s*([^,\n(]+)(?:\s*,\s*(\d{4})|\s*\((\d{4})\))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const body = match[1]?.trim() ?? "";
    const name = match[2]?.trim() ?? "";
    const yearRaw = match[3] ?? match[4];
    if (body.length === 0 || name.length === 0) continue;
    quotes.push({
      text: body,
      attributedTo: name,
      year: yearRaw ? Number(yearRaw) : null,
      sourceType: QuotationSource.SCHOLAR,
    });
  }
  return quotes.length > 0 ? quotes : null;
}

export function parseKeywordList(text: string): string[] | null {
  const items = text
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length < 2 || items.length > 40) return null;
  const valid = items.every((item) => {
    const words = item.split(/\s+/).filter(Boolean);
    return (
      words.length > 0 &&
      words.length <= 5 &&
      item.length <= 60 &&
      !/[.?!]$/.test(item)
    );
  });
  return valid ? items : null;
}

const ROUTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "keywords",
    "quotations",
    "questions",
    "prose",
    "suggestedTopic",
  ],
  properties: {
    keywords: { type: "array", items: { type: "string" } },
    quotations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "attributedTo", "year", "sourceType"],
        properties: {
          text: { type: "string" },
          attributedTo: { type: "string" },
          year: { type: ["integer", "null"] },
          sourceType: {
            type: "string",
            enum: [
              "SCHOLAR",
              "JUDGMENT",
              "COMMITTEE_REPORT",
              "CONSTITUENT_ASSEMBLY",
              "ARTICLE_TEXT",
              "OTHER",
            ],
          },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "stem", "options", "answerIndex"],
        properties: {
          kind: {
            type: "string",
            enum: ["MCQ", "PRELIMS_STATEMENT", "MAINS_DESCRIPTIVE"],
          },
          stem: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answerIndex: { type: ["integer", "null"] },
        },
      },
    },
    prose: { type: "string" },
    suggestedTopic: { type: ["string", "null"] },
  },
} as const;

const SYSTEM = `You extract study material. You never invent keywords, quotations, scholars, years, questions, or answers.
Return only what is present in the source.
prose is leftover body text copied verbatim — never a summary you wrote.
answerIndex is null unless the source explicitly states the answer. Never guess.
suggestedTopic is an existing title from the provided list, or a short new path like polity/fr/article 19.`;

export async function routePasted(input: {
  text: string;
  image?: ImagePayload;
  topicTitles: string[];
}): Promise<RouteResult | { error: string }> {
  if (!input.image) {
    const local = routeLocal(input.text);
    if (local) return local;
  }

  const titles = input.topicTitles.slice(0, 60).join("\n");
  const cacheKey = hashBytes(
    `route_pasted_content\n${input.image?.data ?? input.text}\n${titles}`,
  );

  const result = await callForcedTool<Omit<RouteResult, "tier">>({
    cacheKey,
    toolName: "route_pasted_content",
    description: "Sort pasted study material into files. Extract only.",
    schema: ROUTE_SCHEMA,
    system: SYSTEM,
    userText: input.image
      ? `Existing topics:\n${titles || "(none)"}\n\nExtract from this image. Extra caption:\n${input.text}`
      : `Existing topics:\n${titles || "(none)"}\n\nPasted text:\n${input.text}`,
    image: input.image,
  });

  if (!result.ok && result.reason === "capped") {
    return {
      ...EMPTY,
      prose: input.text,
      tier: "capped",
    };
  }
  if (!result.ok) {
    return { error: result.error };
  }

  return normalizeRoute({ ...result.data, tier: "haiku" });
}

function normalizeRoute(raw: RouteResult): RouteResult {
  return {
    tier: raw.tier,
    keywords: raw.keywords.map((item) => item.trim()).filter(Boolean),
    quotations: raw.quotations
      .map((quotation) => ({
        ...quotation,
        text: quotation.text.trim(),
        attributedTo: quotation.attributedTo.trim(),
      }))
      .filter((quotation) => quotation.text && quotation.attributedTo),
    questions: raw.questions
      .map((question) => ({
        ...question,
        stem: question.stem.trim(),
        options: question.options.map((option) => option.trim()).filter(Boolean),
        answerIndex:
          question.answerIndex !== null &&
          question.answerIndex >= 0 &&
          question.answerIndex < question.options.length
            ? question.answerIndex
            : null,
      }))
      .filter((question) => question.stem.length >= 8),
    prose: raw.prose.trim(),
    suggestedTopic: raw.suggestedTopic?.trim() || null,
  };
}
