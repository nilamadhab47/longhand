export type ClozePart =
  | { kind: "text"; value: string }
  | { kind: "blank"; value: string };

export function escapeKeyword(keyword: string) {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildCloze(prose: string, keywords: string[]): ClozePart[] {
  const terms = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0 || prose.length === 0) {
    return prose.length === 0 ? [] : [{ kind: "text", value: prose }];
  }

  const pattern = terms.map(escapeKeyword).join("|");
  const splitter = new RegExp(`(${pattern})`, "gi");
  const pieces = prose.split(splitter);

  const parts: ClozePart[] = [];
  for (const [index, piece] of pieces.entries()) {
    if (piece.length === 0) continue;
    parts.push({
      kind: index % 2 === 1 ? "blank" : "text",
      value: piece,
    });
  }
  return parts;
}

export function blankCount(parts: ClozePart[]) {
  return parts.filter((part) => part.kind === "blank").length;
}

export function answersMatch(typed: string, expected: string) {
  return typed.trim().toLowerCase() === expected.trim().toLowerCase();
}
