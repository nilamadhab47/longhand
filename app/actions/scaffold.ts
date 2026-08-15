"use server";

import { revalidatePath } from "next/cache";
import {
  createTopicInFolder,
  createTopicPath,
  type ScaffoldResult,
} from "@/lib/scaffold";
import { requireUser } from "@/lib/session";

export async function scaffoldPath(path: string): Promise<ScaffoldResult> {
  const { userId } = await requireUser();
  const result = await createTopicPath(userId, path);
  if (result.ok) {
    revalidatePath("/", "layout");
  }
  return result;
}

export async function createTopic(input: {
  title: string;
  folderId?: string;
  folderName?: string;
}): Promise<ScaffoldResult> {
  const { userId } = await requireUser();
  const title = input.title.trim();
  if (title.length === 0) {
    return { ok: false, error: "Give the topic a name." };
  }

  const result = input.folderId
    ? await createTopicInFolder(userId, input.folderId, title)
    : await createTopicPath(
        userId,
        `${(input.folderName ?? "").trim()}/${title}`,
      );

  if (result.ok) {
    revalidatePath("/", "layout");
  }
  return result;
}
