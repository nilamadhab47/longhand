export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return Boolean(speechRecognitionCtor());
}

export function speechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const root = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return root.SpeechRecognition ?? root.webkitSpeechRecognition ?? null;
}

export type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type BrowserSpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export function splitSpokenNotes(transcript: string): string[] {
  const text = transcript.replace(/\s+/g, " ").trim();
  return text ? [text] : [];
}

export function splitSpokenKeywords(transcript: string): string[] {
  const text = transcript.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const parts = text
    .split(/,|;|\n|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
  if (parts.length > 1) return uniqueTerms(parts);
  if (text.length <= 48) return [text];
  return uniqueTerms(parts.length > 0 ? parts : [text]);
}

function uniqueTerms(terms: string[]) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const term of terms) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(term);
  }
  return next;
}

export function describeSpeechError(code: string) {
  switch (code) {
    case "not-allowed":
      return "Microphone permission was denied.";
    case "no-speech":
      return "No speech heard. Try again.";
    case "audio-capture":
      return "No microphone found.";
    case "network":
      return "Dictation needs a network connection in this browser.";
    case "aborted":
      return null;
    default:
      return "Dictation stopped. Try again.";
  }
}
