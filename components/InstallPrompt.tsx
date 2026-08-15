"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Share } from "lucide-react";

const DISMISS_KEY = "longhand.install.dismissedAt";
const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// The beforeinstallprompt event is not yet part of the standard lib types.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari-specific
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function recentlyDismissed() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < DISMISS_WINDOW_MS;
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    // On iOS Safari the native prompt event never fires; instead surface a
    // small "Add to Home Screen" hint after a short delay so it doesn't
    // interrupt the first paint.
    if (isIos()) {
      const t = window.setTimeout(() => {
        if (!isStandalone() && !recentlyDismissed()) {
          setIosHint(true);
          setHidden(false);
        }
      }, 4000);
      return () => window.clearTimeout(t);
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setHidden(false);
    }
    function onInstalled() {
      setPromptEvent(null);
      setIosHint(false);
      setHidden(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
    setPromptEvent(null);
    setIosHint(false);
  }

  async function install() {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "dismissed") dismiss();
    } catch {
      // Some browsers throw if the user closes the sheet — treat as dismissal.
      dismiss();
    } finally {
      setPromptEvent(null);
      setHidden(true);
    }
  }

  if (hidden) return null;

  if (iosHint) {
    return (
      <aside
        role="dialog"
        aria-label="Install longhand"
        className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[520px] border-t border-line bg-paper px-4 pb-[calc(1rem+var(--sab,0px))] pt-3 shadow-[0_-8px_24px_rgba(22,29,38,0.14)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-rule">
                Install longhand
              </p>
              <p className="mt-1 font-serif text-[13.5px] leading-snug text-ink">
                Tap <span className="inline-flex items-center align-middle text-ink-2"><Share size={13} strokeWidth={1.75} /></span> Share, then{" "}
                <span className="font-mono text-[12px] text-ink-2">Add to Home Screen</span>.
                Opens like a real app, works offline.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Not now"
            onClick={dismiss}
            className="shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
          >
            Not now
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="dialog"
      aria-label="Install longhand"
      className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[520px] border-t border-line bg-paper px-4 pb-[calc(1rem+var(--sab,0px))] pt-3 shadow-[0_-8px_24px_rgba(22,29,38,0.14)] sm:bottom-4 sm:left-auto sm:right-4 sm:mx-0 sm:max-w-[360px] sm:border sm:pb-3"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-rule">
            Install longhand
          </p>
          <p className="mt-1 font-serif text-[13.5px] leading-snug text-ink">
            A faster, app-like experience with offline access.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={dismiss}
          className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 hover:text-rule"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={() => void install()}
          className="border border-rule bg-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper"
        >
          Install
        </button>
      </div>
    </aside>
  );
}
