const TYPOS: Record<string, string> = {
  holisim: "holism",
  holismm: "holism",
  ethnograpy: "ethnography",
  ethnograhy: "ethnography",
  relativisim: "relativism",
  comparitive: "comparative",
  observaton: "observation",
  particpant: "participant",
  kinshp: "kinship",
  anthroplogy: "anthropology",
};

export function isExamToken(term: string) {
  const trimmed = term.trim();
  if (trimmed.length === 0) return true;
  if (/[0-9]/.test(trimmed)) return true;
  if (/^article\b/i.test(trimmed)) return true;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(trimmed)) return true;
  return false;
}

export function localSpellSuggestion(term: string): string | null {
  if (isExamToken(term)) return null;
  const key = term.trim().toLowerCase();
  return TYPOS[key] ?? null;
}

export function looksMisspelled(term: string) {
  if (isExamToken(term)) return false;
  if (localSpellSuggestion(term)) return true;
  const word = term.trim();
  if (!/^[a-z]+$/.test(word) || word.length < 6) return false;
  return /[^aeiou]{4,}/i.test(word);
}
