"use client";

import {
  createContext,
  useContext,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { appendNotePoints, routePaste } from "@/app/actions/paste";
import { PasteGuard } from "@/components/overlays/PasteGuard";
import { PasteReview } from "@/components/overlays/PasteReview";
import type { RouteResult } from "@/lib/smartPaste";

type PasteApi = {
  pending: boolean;
  routeText: (text: string) => void;
};

const PasteContext = createContext<PasteApi | null>(null);

export function usePasteRouter() {
  return useContext(PasteContext);
}

export function SmartPasteHost({
  sectionId,
  children,
}: {
  sectionId: string;
  children: ReactNode;
}) {
  const [review, setReview] = useState<RouteResult | null>(null);
  const [guard, setGuard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(text: string) {
    setPending(true);
    setError(null);
    const result = await routePaste({ text });
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setReview(result);
  }

  const api: PasteApi = {
    pending,
    routeText: (text) => {
      void run(text);
    },
  };

  return (
    <PasteContext.Provider value={api}>
      {pending ? (
        <p className="mb-3 font-mono text-[11px] text-ink-3">Routing…</p>
      ) : null}
      {error ? (
        <p className="mb-3 font-serif text-[13px] italic text-rule">{error}</p>
      ) : null}
      {children}
      {review ? (
        <PasteReview
          sectionId={sectionId}
          result={review}
          onClose={() => setReview(null)}
          onCompressProse={(prose) => {
            setReview(null);
            setGuard(prose);
          }}
        />
      ) : null}
      {guard !== null ? (
        <PasteGuard
          characterCount={guard.length}
          onDiscard={() => setGuard(null)}
          onSubmit={(bullets) => {
            void appendNotePoints(sectionId, bullets);
            setGuard(null);
          }}
        />
      ) : null}
    </PasteContext.Provider>
  );
}

export function interceptRoutedPaste(
  event: ClipboardEvent,
  api: PasteApi | null,
  shouldRouteText: (text: string) => boolean,
) {
  if (!api) return;
  const file = [...event.clipboardData.files].find((item) =>
    item.type.startsWith("image/"),
  );
  if (file) {
    event.preventDefault();
    return;
  }
  const text = event.clipboardData.getData("text/plain");
  if (text && shouldRouteText(text)) {
    event.preventDefault();
    api.routeText(text);
  }
}
