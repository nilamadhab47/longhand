"use client";

import {
  createContext,
  useContext,
  useState,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { ImagePlus } from "lucide-react";
import { appendNotePoints, routePaste } from "@/app/actions/paste";
import { PasteGuard } from "@/components/overlays/PasteGuard";
import { PasteReview } from "@/components/overlays/PasteReview";
import type { ImagePayload } from "@/lib/ai/haiku";
import type { RouteResult } from "@/lib/smartPaste";

type PasteApi = {
  pending: boolean;
  routeText: (text: string) => void;
  routeImage: (image: ImagePayload) => void;
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

  async function run(text: string, image?: ImagePayload) {
    setPending(true);
    setError(null);
    const result = await routePaste({ text, image });
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
    routeImage: (image) => {
      void run("", image);
    },
  };

  return (
    <PasteContext.Provider value={api}>
      <div className="mb-3 flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1 text-ink-3 hover:text-rule">
          <ImagePlus size={14} strokeWidth={1.75} />
          <span className="sr-only">Upload image to route</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void fileToImage(file).then((image) => run("", image));
            }}
          />
        </label>
        {pending ? (
          <span className="font-mono text-[11px] text-ink-3">Routing…</span>
        ) : null}
        {error ? (
          <span className="font-serif text-[13px] italic text-rule">
            {error}
          </span>
        ) : null}
      </div>
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
    void fileToImage(file).then((image) => api.routeImage(image));
    return;
  }
  const text = event.clipboardData.getData("text/plain");
  if (text && shouldRouteText(text)) {
    event.preventDefault();
    api.routeText(text);
  }
}

export async function fileToImage(file: File): Promise<ImagePayload> {
  const data = await readAsBase64(file);
  const mediaType = (
    file.type === "image/png" ||
    file.type === "image/webp" ||
    file.type === "image/gif"
      ? file.type
      : "image/jpeg"
  ) as ImagePayload["mediaType"];
  return { mediaType, data };
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
