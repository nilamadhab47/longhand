"use client";

import { useCallback, useEffect, useState } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      void caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith("longhand-")) void caches.delete(key);
        }
      });
      return;
    }

    let cancelled = false;

    const trackWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const check = () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(worker);
        }
      };
      check();
      worker.addEventListener("statechange", check);
    };

    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        trackWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => trackWaiting(reg.installing));
        // Poll for updates once an hour when the tab is alive.
        const interval = window.setInterval(() => void reg.update(), 60 * 60 * 1000);
        window.addEventListener("focus", () => void reg.update());
        return () => window.clearInterval(interval);
      })
      .catch(() => {
        // Registration failures are silent — the app must still work.
      });

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    waiting.postMessage({ type: "SKIP_WAITING" });
    // The `controllerchange` listener above will reload once the new worker
    // takes control, so we don't force a reload here.
  }, [waiting]);

  return (
    <>
      {waiting ? (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-[60] flex items-center gap-3 border border-line bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink shadow-[0_8px_24px_rgba(22,29,38,0.14)]"
        >
          <span>New version available</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="text-rule hover:underline"
          >
            Reload
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setWaiting(null)}
            className="text-ink-3 hover:text-rule"
          >
            ×
          </button>
        </div>
      ) : null}
      {offline ? (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-[60] border border-line bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 shadow-[0_8px_24px_rgba(22,29,38,0.14)]"
        >
          Offline · reconnect to save
        </div>
      ) : null}
    </>
  );
}
