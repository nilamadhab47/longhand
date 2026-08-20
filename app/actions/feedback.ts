"use server";

import { FeedbackKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type FeedbackState = { ok: true } | { ok: false; error: string };

const KINDS = new Set<string>(Object.values(FeedbackKind));

export async function sendFeedback(
  _prev: FeedbackState | undefined,
  formData: FormData,
): Promise<FeedbackState> {
  const { userId } = await requireUser();
  const kind = String(formData.get("kind") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const doing = String(formData.get("doing") ?? "").trim();

  if (!KINDS.has(kind)) {
    return { ok: false, error: "Pick what this is — an issue, an idea, or other." };
  }
  if (body.length < 8) {
    return { ok: false, error: "Write a little more so we can act on it." };
  }
  if (body.length > 4000) {
    return { ok: false, error: "Keep it under 4000 characters." };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.feedback.count({
    where: { userId, createdAt: { gte: hourAgo } },
  });
  if (recent >= 5) {
    return { ok: false, error: "That's enough for now. Try again in an hour." };
  }

  await prisma.feedback.create({
    data: {
      userId,
      kind: kind as FeedbackKind,
      body,
      doing: doing.length > 0 ? doing.slice(0, 240) : null,
    },
  });

  revalidatePath("/support");
  revalidatePath("/inbox");
  return { ok: true };
}

export async function markFeedbackRead(id: string) {
  await requireUser();
  await prisma.feedback.update({
    where: { id },
    data: { readAt: new Date() },
  });
  revalidatePath("/inbox");
}
