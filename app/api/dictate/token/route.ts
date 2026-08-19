import { NextResponse } from "next/server";
import { createScribeToken, elevenLabsConfigured } from "@/lib/elevenlabs";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  await requireUser();
  if (!elevenLabsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ElevenLabs is not configured." },
      { status: 503 },
    );
  }
  const result = await createScribeToken();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, token: result.token });
}
