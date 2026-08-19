const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const MAX_BYTES = 6 * 1024 * 1024;

export function elevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export async function createScribeToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "ElevenLabs is not configured." };
  }
  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: { "xi-api-key": key },
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    token?: string;
    detail?: { message?: string } | string;
  } | null;
  if (!response.ok || !payload?.token) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : payload?.detail?.message;
    return {
      ok: false,
      error: detail || "Could not start live dictation.",
    };
  }
  return { ok: true, token: payload.token };
}

export async function transcribeWithElevenLabs(input: {
  bytes: ArrayBuffer;
  filename: string;
  mimeType: string;
  language?: string;
  keyterms?: string[];
}): Promise<
  | { ok: true; text: string; language: string | null }
  | { ok: false; error: string }
> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "ElevenLabs is not configured." };
  }
  if (input.bytes.byteLength === 0) {
    return { ok: false, error: "The recording was empty." };
  }
  if (input.bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: "That recording is too long. Stop sooner." };
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([input.bytes], { type: input.mimeType || "application/octet-stream" }),
    input.filename,
  );
  form.append("model_id", "scribe_v2");
  form.append("tag_audio_events", "false");
  form.append("num_speakers", "1");
  if (input.language) {
    form.append("language_code", input.language);
  }
  const keyterms = (input.keyterms ?? [])
    .map((term) => term.trim().slice(0, 49))
    .filter(Boolean);
  if (keyterms.length > 0) {
    form.append("keyterms", JSON.stringify(keyterms));
  }

  const response = await fetch(STT_URL, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as
    | { text?: string; language_code?: string; detail?: { message?: string } | string }
    | null;

  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : payload?.detail?.message;
    return {
      ok: false,
      error: detail || `ElevenLabs returned ${response.status}.`,
    };
  }

  const text = payload?.text?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) {
    return { ok: false, error: "No speech found in the recording." };
  }

  return {
    ok: true,
    text,
    language: payload?.language_code ?? null,
  };
}
