# CURSOR_PROMPT.md — Build Spec

> Drop this at the repo root. Reference it with `@CURSOR_PROMPT.md` in every
> Cursor composer session. Build **one phase at a time** and stop at each
> checkpoint for review — do not run ahead to later phases.

---

## 0. Role

You are a principal full-stack engineer building a production PWA solo. You
optimise for shipping a working vertical slice over completeness. You do not
add abstractions until there are two concrete callers. You keep each change
under ~400 lines so it can be reviewed in one sitting.

When a requirement in this document conflicts with a convention you'd normally
follow, **this document wins** — the constraints here are the product, not
implementation detail.

---

## 1. Product thesis — read this before writing any code

An active-recall note system for UPSC Civil Services aspirants (primary user is
a single serious candidate targeting 2027, Anthropology optional).

Generic note apps fail exam aspirants because they enable **digital hoarding**:
students paste enormous blocks of text they never read again. Retention comes
from compression and retrieval, not from collection.

Therefore, three rules govern every feature decision:

1. **The user writes their own prose. Always.** AI audits, extracts, and
   routes. AI never writes the student's notes or their answers.
2. **Structure is enforced by the schema, not by discipline.** Every topic has
   exactly four files. They cannot be deleted. Empty ones are visibly marked.
3. **Pasting is allowed, but paste can never land in `notes`.** Pasted material
   is raw input to be sorted into keywords/quotations/questions. Body prose
   from a paste is surfaced for manual compression, never auto-filed.

If you find yourself building something that lets the user acquire text without
writing it, you have misunderstood the product. Stop and flag it.

---

## 2. Stack — locked, do not substitute

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | |
| Styling | Tailwind CSS | Design tokens as CSS vars in `globals.css` |
| DB | PostgreSQL (Neon or Supabase) | |
| ORM | Prisma | |
| Auth | Email + password | HttpOnly session cookie. No Clerk. |
| AI | Anthropic SDK, `claude-haiku-4-5` | Haiku only. See §7. |
| Icons | `lucide-react` | |
| Client | **PWA only** | No React Native. TWA wrap via Bubblewrap later. |
| Deploy | Vercel | |

**No React Native.** Android is served by an installable PWA. This is a settled
decision; do not propose Expo.

---

## 3. Design system

The visual language is **Indian statute text** — Bare Acts with marginal notes,
and the ruled margin of an exam answer booklet. Institutional paper, not a dark
IDE. Do not make this look like a developer tool.

### Tokens (`globals.css`)

```css
:root {
  --paper:  #EDEFE9;
  --panel:  #E2E5DC;
  --sunk:   #D8DCD1;
  --ink:    #161D26;
  --ink-2:  #4C5665;
  --ink-3:  #7C8695;
  --rule:   #A32F2A;
  --brass:  #7A6A2F;
  --line:   #C9CFC1;
  --ok:     #3F6B4A;
}
```

### Type

- **UI chrome:** IBM Plex Sans Condensed (400/500/600)
- **Note prose, quotations, question stems:** IBM Plex Serif (400/500, italic for marginalia)
- **Paths, keywords, metadata, counters:** IBM Plex Mono (400/500)

Load via `next/font/google`. The Plex family is chosen for its institutional,
documentary register — do not swap it for Inter, Geist, or a geometric sans.

### Signature element

A **2px `--rule` vertical line** down the left of the content area, with a
132px marginalia column to its left carrying the current file's identity and
purpose in italic serif. This is the one bold move — keep everything else
quiet. Do not add gradients, glassmorphism, shadows beyond modal elevation, or
decorative illustration.

### Density

Tight. `13–14px` UI text, `15.5px` serif prose at `1.72` line-height, `3px`
vertical row padding in the tree. This is a tool for daily heavy use, not a
marketing page.

### Quality floor

Responsive to 360px (sidebar collapses to a drawer under 720px), visible
keyboard focus rings in `--rule`, `prefers-reduced-motion` respected, all
interactive elements reachable by keyboard.

---

## Phases

Build **one phase at a time**. Stop at each checkpoint.

| Phase | Status | What |
|---|---|---|
| 1 Skeleton | done | Next.js, Prisma, email/password, seed |
| 2 Organization | done | Tree, ⌘K scaffold, tokens, Plex |
| 3 Four panes | done | Editors, persistence, margin rail, paste guard |
| 4 Recall | done | Cloze, SM-2, dashboard, TTS, PWA |
| 5 AI | done | Smart paste router, Trinity auditor, **prose assist** |
| 6 Later | only when asked | Syllabus/PYQ vectors, Bubblewrap TWA |

**Current phase: 5 complete — wait for review.** Do not begin Phase 6 until told to.

---

## Phase 5 addition — prose assist (§6.9)

Schedule this **inside Phase 5**, after the paste router, before the Trinity auditor. Same model, same cost controls, same rule: the student wrote the text first.

This is not a note-writer. Spell-fix corrects orthography. Proofcheck reports problems. Rewrite is opt-in on a **selection the user already typed**, and nothing is committed without an accept.

### Where it runs

- **Notes** textarea, **quotation** text, **question stems** the user wrote.
- **Keywords / terms:** auto spell-check as a chip is added, plus a fix action on a flagged chip.
- **Never** on the mains answer box. That is the student's own attempt. Do not proof, rewrite, or spell-replace it.

### Selection menu (left-click)

Select text, then **left-click** the selection. A quiet paper menu appears (no right-click, no browser context menu):

1. **Spell fix** — replace the selection with orthography-only corrections. Meaning unchanged.
2. **Proofcheck** — list issues in the margin (grammar, unclear compression, missing names). Does **not** rewrite. The user edits.
3. **Rewrite** — optional. Propose a tighter version of *that selection only*. Show before/after. **Accept** replaces the selection; **Keep mine** discards the proposal. Never auto-commit. Never invent facts, scholars, or citations.

Keyboard: the same three actions must be reachable when the selection is active (e.g. a small toolbar, focusable).

### Auto spell on terms

When a keyword is added:

- Run a local spell check first (no API).
- If it looks misspelled, keep the chip but mark it (hollow `--rule` underline, not a toast).
- A **Fix** control on the chip applies the local suggestion, or Haiku only if the local dictionary has no suggestion.
- Adding `DPSP`, `Article 19`, scholar names, and other already-uppercase / mixed exam tokens must not be "corrected" into English words.

### AI rules for this feature

- Haiku 4.5 only. Forced `tool_choice`. Record spend in `ApiSpend`. Honour the $3.00 cap.
- Tools: `spell_fix`, `proofcheck`, `rewrite_selection`. Each returns structured fields, never freeform notes.
- `rewrite_selection` may only return a compression of the supplied span. If it cannot tighten without adding material, return the original and a `noop` reason.
- Proofcheck returns `{ issues: { span, problem }[] }` — problems named, replacements not supplied.
- Dedup via hash of `(action + selected text)` in `PasteRouteCache` or a sibling table if the shape differs. Do not add a table until there are two callers; reuse the cache if the payload fits.

### Files (when Phase 5 reaches this slice)

```
lib/proseAssist.ts
components/overlays/SelectionMenu.tsx
components/overlays/RewriteReview.tsx
```

### Checkpoint (add to Phase 5)

- Selecting a sentence in notes and left-clicking offers Spell fix / Proofcheck / Rewrite.
- Rewrite Accept replaces only the selection; Keep mine leaves the file untouched.
- A misspelled keyword shows a fix mark; `DPSP` is left alone.
- Proofcheck on a notes paragraph reports issues and writes nothing into `content`.
- Mains answer textarea has no selection menu.

---

## Do not

- Auto-rewrite on blur, idle, or save.
- Rewrite an empty file, a paste, or a quotation into existence.
- Put a model answer into questions.
- Use the browser's native spellcheck UI as the only surface for terms — chips need an explicit Fix, because native underlines are easy to ignore and hard to tap on 360px.

