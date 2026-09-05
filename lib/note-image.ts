"use client";

import { uploadNoteImage } from "@/app/actions/images";

const MAX_EDGE = 1280;
const MAX_BYTES = 350_000;
const START_QUALITY = 0.72;
const MIN_QUALITY = 0.4;

export async function attachNoteImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image.");
  }
  const jpeg = await fileToNoteJpeg(file);
  const form = new FormData();
  form.append("file", jpeg);
  const uploaded = await uploadNoteImage(form);
  const src = uploaded.ok ? uploaded.url : await blobToDataUrl(jpeg);
  return noteImageMarkup(src);
}

export function noteImageMarkup(src: string) {
  const safe = src.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<p><img src="${safe}" alt=""></p>`;
}

async function fileToNoteJpeg(file: File): Promise<File> {
  const source = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    source.close();
    throw new Error("Could not read that image.");
  }
  ctx.drawImage(source.element, 0, 0, width, height);
  source.close();

  let quality = START_QUALITY;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.08;
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > MAX_BYTES) {
    throw new Error("That image is still too large after shrinking.");
  }
  return new File([blob], "note.jpg", { type: "image/jpeg" });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not read that image."));
      },
      "image/jpeg",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

type LoadedImage = {
  element: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        element: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> path for types some browsers won't decode.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    return {
      element: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => undefined,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
