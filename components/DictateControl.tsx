"use client";

import { useEffect, useRef, useState } from "react";
import {
  CommitStrategy,
  RealtimeEvents,
  Scribe,
  type RealtimeConnection,
} from "@elevenlabs/client";
import { Mic, Square } from "lucide-react";
import { DictateReview } from "@/components/overlays/DictateReview";
import {
  describeSpeechError,
  isSpeechRecognitionSupported,
  speechRecognitionCtor,
  type BrowserSpeechRecognition,
} from "@/lib/speech";

type Provider = "elevenlabs" | "browser";

const MAX_SECONDS = 180;
const SILENCE_MS = 4000;
const EMPTY_MS = 10000;

export function DictateControl({
  target,
  topic,
  onApply,
}: {
  target: "notes" | "keywords";
  topic?: string;
  onApply: (items: string[]) => void;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const scribeRef = useRef<RealtimeConnection | null>(null);
  const wantListenRef = useRef(false);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const topicRef = useRef(topic);
  const heardRef = useRef(false);
  const stoppingRef = useRef(false);
  const elapsedTimer = useRef<number | null>(null);
  const silenceTimer = useRef<number | null>(null);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);

  topicRef.current = topic;

  useEffect(() => {
    setSupported(
      isSpeechRecognitionSupported() || Boolean(navigator.mediaDevices?.getUserMedia),
    );
    void fetch("/api/dictate")
      .then((response) => response.json())
      .then((data: { provider?: Provider }) => {
        setProvider(data.provider === "elevenlabs" ? "elevenlabs" : "browser");
      })
      .catch(() => setProvider("browser"));
    return () => {
      stopRecognition(true);
      closeScribe();
      clearTimers();
    };
  }, []);

  function clearTimers() {
    if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    elapsedTimer.current = null;
    silenceTimer.current = null;
    setElapsed(0);
  }

  function startElapsed() {
    if (elapsedTimer.current) window.clearInterval(elapsedTimer.current);
    const started = Date.now();
    elapsedTimer.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - started) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) {
        void stopAndReview();
      }
    }, 250);
    armSilence(EMPTY_MS);
  }

  function armSilence(ms: number) {
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current);
    silenceTimer.current = window.setTimeout(() => {
      void stopAndReview();
    }, ms);
  }

  function heardSpeech() {
    heardRef.current = true;
    setActive(true);
    armSilence(SILENCE_MS);
  }

  function spokenNow() {
    return `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, " ").trim();
  }

  function appendCommitted(piece: string) {
    if (!piece) return;
    heardSpeech();
    const next = `${finalRef.current} ${piece}`.replace(/\s+/g, " ").trim();
    finalRef.current = next;
    setFinalText(next);
  }

  function setPartial(piece: string) {
    interimRef.current = piece;
    setInterim(piece);
    if (piece) heardSpeech();
    else setActive(false);
  }

  function stopRecognition(abort = false) {
    wantListenRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      if (abort) recognition.abort();
      else recognition.stop();
    } catch {
      // Already stopped.
    }
  }

  function closeScribe() {
    const connection = scribeRef.current;
    scribeRef.current = null;
    if (!connection) return;
    try {
      connection.close();
    } catch {
      // Already closed.
    }
  }

  function start() {
    setError(null);
    stoppingRef.current = false;
    heardRef.current = false;
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterim("");
    setActive(false);
    if (provider === "elevenlabs") {
      void startScribe();
      return;
    }
    startBrowser();
  }

  async function startScribe() {
    const tokenResponse = await fetch("/api/dictate/token", { method: "POST" });
    const tokenData = (await tokenResponse.json()) as {
      ok?: boolean;
      token?: string;
      error?: string;
    };
    if (!tokenData.ok || !tokenData.token) {
      setError(tokenData.error || "Could not start live dictation.");
      return;
    }

    const keyterms = topicRef.current ? [topicRef.current.slice(0, 20)] : undefined;

    try {
      const connection = Scribe.connect({
        token: tokenData.token,
        modelId: "scribe_v2_realtime",
        languageCode: "en",
        secondaryLanguages: ["hi", "mr"],
        commitStrategy: CommitStrategy.VAD,
        vadSilenceThresholdSecs: 0.8,
        filterBackgroundAudio: true,
        keyterms,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
        setPartial(readTranscript(data));
      });
      connection.on(RealtimeEvents.FINAL_TRANSCRIPT, (data) => {
        setPartial(readTranscript(data));
      });
      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
        appendCommitted(readTranscript(data));
        setPartial("");
      });
      connection.on(RealtimeEvents.ERROR, (data) => {
        const message =
          typeof data === "object" && data && "message" in data
            ? String((data as { message?: string }).message)
            : "Live dictation failed.";
        setError(message);
      });
      connection.on(RealtimeEvents.AUTH_ERROR, () => {
        setError("Dictation auth failed. Check the ElevenLabs key.");
      });

      scribeRef.current = connection;
      startElapsed();
      setListening(true);
    } catch {
      setError("Could not open the microphone for live dictation.");
    }
  }

  function startBrowser() {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      setError("Add an ElevenLabs API key for live dictation.");
      return;
    }

    stopRecognition(true);
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      let interimText = "";
      let added = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) added += piece;
        else interimText += piece;
      }
      if (added) appendCommitted(added);
      setPartial(interimText.trim());
    };

    recognition.onerror = (event) => {
      const message = describeSpeechError(event.error);
      if (message) setError(message);
      if (event.error === "not-allowed" || event.error === "audio-capture") {
        wantListenRef.current = false;
        setListening(false);
        clearTimers();
      }
    };

    recognition.onend = () => {
      if (!wantListenRef.current) {
        setListening(false);
        recognitionRef.current = null;
        return;
      }
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    wantListenRef.current = true;
    try {
      recognition.start();
      startElapsed();
      setListening(true);
    } catch {
      setError("Could not start the microphone.");
      wantListenRef.current = false;
    }
  }

  async function stopAndReview() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    if (scribeRef.current) {
      try {
        scribeRef.current.commit();
      } catch {
        // Manual commit is optional under VAD.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      closeScribe();
    } else {
      stopRecognition(false);
    }
    setListening(false);
    setActive(false);
    clearTimers();
    const spoken = spokenNow();
    setPartial("");
    if (!spoken) {
      setError("Nothing captured. Speak a full sentence.");
      stoppingRef.current = false;
      return;
    }
    setReview(spoken);
    stoppingRef.current = false;
  }

  const live = spokenNow();
  const ready = provider !== null && supported && !listening;

  return (
    <div>
      {listening ? (
        <div
          className="dictate-live border border-rule/35 bg-panel px-3 py-2.5"
          data-active={active ? "true" : "false"}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-rule opacity-40 dictate-dot-ring" />
                <span className="relative h-2 w-2 rounded-full bg-rule" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-rule">
                Listening {formatClock(elapsed)}
              </p>
              <div className="dictate-bars" aria-hidden>
                <span className="dictate-bar" />
                <span className="dictate-bar" />
                <span className="dictate-bar" />
                <span className="dictate-bar" />
                <span className="dictate-bar" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void stopAndReview()}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-2 hover:text-rule"
            >
              <Square size={12} strokeWidth={1.75} />
              Stop
            </button>
          </div>
          <p
            className="mt-2 min-h-[1.7em] font-serif text-[15.5px] leading-[1.72] text-ink"
            aria-live="polite"
          >
            {live || (
              <span className="italic text-ink-3">
                Speak. It stops after a short pause.
              </span>
            )}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={!ready}
          className="inline-flex items-center gap-1.5 border border-line bg-panel px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2 transition-colors duration-200 hover:border-rule hover:text-rule disabled:opacity-40"
        >
          <Mic size={13} strokeWidth={1.75} />
          Speak
        </button>
      )}
      {provider === "browser" ? (
        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
          Browser dictation — add ELEVENLABS_API_KEY for Scribe
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 font-serif text-[13px] italic text-rule" role="status">
          {error}
        </p>
      ) : null}
      {review ? (
        <DictateReview
          target={target}
          transcript={review}
          topic={topic}
          onClose={() => setReview(null)}
          onApply={(items) => {
            onApply(items);
            setReview(null);
            finalRef.current = "";
            interimRef.current = "";
            setFinalText("");
            setInterim("");
          }}
        />
      ) : null}
    </div>
  );
}

function readTranscript(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const record = data as { transcript?: string; text?: string };
  return (record.transcript ?? record.text ?? "").trim();
}

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
