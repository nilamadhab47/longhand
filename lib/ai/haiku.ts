import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { canCallApi, recordSpend } from "@/lib/ai/spend";

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export type ImagePayload = {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  data: string;
};

export type ToolCallOk<T> = {
  ok: true;
  data: T;
  cached: boolean;
  usd: number;
};

export type ToolCallFail =
  | { ok: false; reason: "capped" }
  | { ok: false; reason: "error"; error: string };

export function hashBytes(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function callForcedTool<T>(input: {
  cacheKey: string;
  toolName: string;
  description: string;
  schema: Record<string, unknown>;
  system: string;
  userText: string;
  image?: ImagePayload;
}): Promise<ToolCallOk<T> | ToolCallFail> {
  const cached = await prisma.pasteRouteCache.findUnique({
    where: { hash: input.cacheKey },
  });
  if (cached) {
    return { ok: true, data: cached.result as T, cached: true, usd: 0 };
  }

  if (!(await canCallApi())) {
    return { ok: false, reason: "capped" };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, reason: "error", error: "ANTHROPIC_API_KEY is not set." };
  }

  const client = new Anthropic({ apiKey: key });
  const userContent: Anthropic.MessageCreateParams["messages"][number]["content"] =
    input.image
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.image.mediaType,
              data: input.image.data,
            },
          },
          { type: "text", text: input.userText },
        ]
      : input.userText;

  try {
    const message = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      system: input.system,
      tool_choice: { type: "tool", name: input.toolName },
      tools: [
        {
          name: input.toolName,
          description: input.description,
          input_schema: input.schema as Anthropic.Tool.InputSchema,
        },
      ],
      messages: [{ role: "user", content: userContent }],
    });

    const usd = await recordSpend(
      message.usage.input_tokens,
      message.usage.output_tokens,
    );

    const block = message.content.find((item) => item.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return { ok: false, reason: "error", error: "The model returned no tool." };
    }

    const data = block.input as T;
    await prisma.pasteRouteCache.create({
      data: { hash: input.cacheKey, result: data as object },
    });
    return { ok: true, data, cached: false, usd };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The model call failed.";
    return { ok: false, reason: "error", error: message };
  }
}
