import { NextResponse } from "next/server";
import { elevenLabsConfigured, transcribeWithElevenLabs } from "@/lib/elevenlabs";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  await requireUser();
  return NextResponse.json({
    provider: elevenLabsConfigured() ? "elevenlabs" : "browser",
  });
}

export async function POST(req: Request) {
  await requireUser();
  if (!elevenLabsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ElevenLabs is not configured." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No recording received." },
      { status: 400 },
    );
  }

  const language = String(form.get("language") ?? "").trim();
  const topic = String(form.get("topic") ?? "").trim();
  const bytes = await file.arrayBuffer();
  const result = await transcribeWithElevenLabs({
    bytes,
    filename: file.name || "note.wav",
    mimeType: file.type || "audio/wav",
    language: language || undefined,
    keyterms: topic ? [topic] : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    language: result.language,
  });
}
