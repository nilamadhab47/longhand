"use server";

import { putNoteImage, r2Configured } from "@/lib/r2";
import { requireUser } from "@/lib/session";

export type UploadNoteImageResult =
  | { ok: true; url: string }
  | { ok: false; fallback: true; error?: string };

export async function uploadNoteImage(
  formData: FormData,
): Promise<UploadNoteImageResult> {
  const { userId } = await requireUser();
  if (!r2Configured()) {
    return { ok: false, fallback: true };
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, fallback: true, error: "Nothing to upload." };
  }
  if (file.size > 400_000) {
    return { ok: false, fallback: true, error: "That image is too large." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const url = await putNoteImage({ userId, bytes });
    return { ok: true, url };
  } catch (cause) {
    return {
      ok: false,
      fallback: true,
      error:
        cause instanceof Error
          ? cause.message
          : "Cloudflare could not store that image.",
    };
  }
}
