# longhand · future work

This file holds the deliberate deferrals — things we've reasoned about and chosen
not to build yet. It is the counterpart to the shipped Phase 6 work: what stayed
out and why, and how to bring it in later without a rewrite.

Nothing here is unfinished Phase 6. It is a design record for later phases.

---

## Sync & multi-device (Phase 6.3)

Longhand's current persistence model is single-source-of-truth Postgres via
Prisma server actions. Every save is a request to the server. This works, but it
assumes an online desktop-class network.

Target model: **offline-first, eventually consistent, per-point CRDT-ish**.

### Data-model prerequisites (already in place)

- Notes are stored as an ordered list of `NotePoint { id, html }` inside
  `NoteSection.content` (JSON). Each point has a stable `id` (uuid).
- `NoteSection.updatedAt`, `Note.updatedAt` are maintained by Prisma.

### Client changes

- Introduce an IndexedDB-backed mutation queue keyed by
  `{ entity, entityId, opId, at }`. Every server action goes through
  `enqueueMutation()`; only the queue talks to the network.
- The service worker (see `public/sw.js`) becomes the sync worker: on
  `online`, drain the queue with exponential backoff. On failure, keep the
  op and surface it in the settings page.
- Reads: on load, hydrate the UI from IndexedDB first; then fetch canonical
  data and merge (see conflict policy below).

### Server changes

- Server actions accept an optional `clientOpId` and `baseUpdatedAt`. Reject
  stale writes with `409 Conflict` and echo the current server value.
- Add a `Mutation` table for auditing/replay:
  `{ id, userId, entity, entityId, op, payload, appliedAt }`.

### Conflict policy

- **Points inside a note**: merge by `id`. If both sides changed the same
  point, take the one with the later `updatedAt` and keep the loser as a
  duplicate point marked `conflict:true` for the user to reconcile.
- **Metadata (title, folder, review schedule)**: server authority, last-writer-wins.
- **Deletions**: soft-delete for 30 days (`deletedAt`) so a device that was
  offline during a delete can undo.

### UX

- A "syncing" pip in the sidebar, matching the save-state pip.
- Never block typing on the queue.

---

## Authentication for multi-device (Phase 6.3 supporting)

Current: email + password → JWT in `httpOnly` cookie (`lib/session.ts`).
This is fine for one device; multi-device is fine too, but there's no way
to see or revoke sessions.

Planned:

- Persist sessions in a `Session` table with `{ id, userId, device, createdAt, lastSeenAt }`.
  Cookie carries the session id, not a self-contained JWT.
- Settings page lists active devices with revoke.
- Add passkey login (`@simplewebauthn/browser` + `@simplewebauthn/server`) as a
  second factor / passwordless option. The existing password flow keeps working.
- Structure the auth layer so an OAuth provider (Apple / Google) can be added
  as an additional `provider` row on the user without changing the session code.

Do **not** add passkeys / OAuth just because they exist. Only when users ask.

---

## Export (Phase 6.4)

Design the export layer around a single internal representation:

```
Note → BlockDoc[]      // headings, paragraphs, lists, code, quotes
```

Rendered by:

- `renderMarkdown(doc)` → `.md`
- `renderPdf(doc)` → server-side via `@react-pdf/renderer` or headless Chrome
- `renderHtml(doc)` → shareable static export

Scope for the first cut: markdown per-note and per-folder. Everything else
plugs into the same `BlockDoc`.

Do not couple export to any exam or curriculum. A folder of ordinary notes
should export identically to a folder of syllabus-tagged notes.

---

## AI cost & observability (Phase 6.5)

We already have `ApiSpend` (monthly usd) and `PasteRouteCache` (SHA-256 dedupe).
Add:

- `ApiCall { id, userId, action, model, inputTokens, outputTokens, usd, latencyMs, cached, ok, at }`.
- `/settings/usage` page: month-to-date spend, per-action counts, average
  latency, cache hit rate. Reads only, no writes.
- User setting `requireAiConfirmation: boolean` in a `UserSettings` table.
  `lib/ai/haiku.callForcedTool` reads it and, if true, requires an
  explicit signed confirmation token passed from the client before proceeding.
- Kill switch: `AI_KILL_SWITCH` env var that short-circuits every AI call
  to `{ ok: false, reason: "capped" }`. Verified in dev by unplugging the
  key.

The observability page should never call the AI. It reads only from
`ApiSpend` and `ApiCall`.

---

## Curriculum / Learning Map (Phase 6.6)

The core value is a **generic hierarchical tag tree**, not "UPSC syllabus".

### Data model

```prisma
model Curriculum {
  id        String   @id @default(cuid())
  userId    String   // owner; global curricula have a special "system" owner
  name      String   // "UPSC 2025", "OS Fall 24", "USMLE Step 1"
  createdAt DateTime @default(now())
  nodes     CurriculumNode[]
}

model CurriculumNode {
  id            String   @id @default(cuid())
  curriculumId  String
  parentId      String?
  path          String   // materialized: "history/vedic/aryan-culture"
  slug          String
  title         String
  position      Int
  depth         Int
  createdAt     DateTime @default(now())

  parent   CurriculumNode?  @relation("NodeTree", fields: [parentId], references: [id], onDelete: Cascade)
  children CurriculumNode[] @relation("NodeTree")
  links    NoteCurriculumLink[]

  @@unique([curriculumId, path])
  @@index([curriculumId, parentId])
}

model NoteCurriculumLink {
  noteId String
  nodeId String
  addedBy String  // "user" | "suggestion"
  addedAt DateTime @default(now())

  note Note @relation(fields: [noteId], references: [id], onDelete: Cascade)
  node CurriculumNode @relation(fields: [nodeId], references: [id], onDelete: Cascade)

  @@id([noteId, nodeId])
  @@index([nodeId])
}
```

### Import format

Curricula import from a portable JSON:

```json
{
  "name": "UPSC 2025",
  "version": 1,
  "nodes": [
    { "path": "history/ancient", "title": "Ancient History" },
    { "path": "history/ancient/vedic", "title": "Vedic Era" },
    { "path": "history/ancient/vedic/aryan-land", "title": "Native Land of the Aryans" }
  ]
}
```

The UPSC syllabus PDF ships as `data/curricula/upsc-2025.json` after a
one-time extraction script (`scripts/import-curriculum.ts`). The app has
no hardcoded knowledge of UPSC — it just imports a JSON.

### Linking UX

- On the note page, a small "Add to curriculum" chip. Opens a searchable
  tree picker (reuse `GlobalSearch` layout).
- Suggestions: run once when the user opens the picker or explicitly asks.
  Cheap fuzzy match on the note title against curriculum node titles, no AI.
  If a match's score exceeds threshold, pre-select it.
- Multiple links per note are allowed.

### Coverage (later, not Phase 6)

Once linking is stable, a coverage view: for each curriculum node, count
linked notes and last review date. Buckets: covered / partial / none / stale.
Do not build this until enough users have curricula linked to make the
buckets meaningful.

---

## Semantic search + related notes (Future D)

The `Note.embedding vector(1536)` column already exists (`prisma/schema.prisma`).
Nothing writes to it today.

### Save-time pipeline

```
saveNotes()
   ↓  (debounced 500ms, already in place)
persist content
   ↓  (background, non-blocking)
enqueue "embed:noteId" job
   ↓
worker: fetch note text → embedding API → write vector
```

- The embedding job must never block the save response.
- Use a background job runner (either `pg-boss` or a simple polled row).
- Skip re-embedding if the note text hash matches the last-embedded hash.

### Query-time UX

- After a normal `/api/search?q=` returns lexical results, kick off a
  `/api/search/semantic?q=` in parallel with a small delay (300–500ms).
  Render its results in a distinct "Related" section below lexical hits.
- On an open note, a right-margin "related notes" rail (nearest-neighbour
  by cosine) refreshes when the note is saved.

Never block typing on this. Never call an embedding API per keystroke.

---

## Full-text search at scale (Future E)

Today `/api/search` uses Postgres `ILIKE` on `note.title`, `noteSection.content`,
keyword arrays, quotation text and question stems. This is adequate up to
a few thousand notes per user.

Migration plan when we cross that scale:

1. Add `NoteSearch { noteId, tsv tsvector, updatedAt }` with a GIN index on `tsv`.
2. Populate `tsv` from `setweight(to_tsvector(note.title), 'A') || setweight(to_tsvector(plain(note.content)), 'B') || setweight(to_tsvector(array_to_string(keywords, ' ')), 'C')`.
3. Refresh `tsv` on save (trigger or explicit update in `saveNotes`).
4. Query with `websearch_to_tsquery('english', q)` and `ts_rank_cd`.
5. Keep the current suggestion route as-is (prefix-tokens is cheap).

Do not migrate before the scale demands it — the current route is only 30
LOC and easy to swap.

---

## Editor as a proper transaction model (nice-to-have)

`NotesEditor` is a `contentEditable` div driven by `document.execCommand`.
This gets us free native undo/redo, which is why AI edits hook through
`execCommand("insertText")` — Ctrl+Z works.

A future migration to Tiptap / ProseMirror would give:

- structured document instead of HTML serialization
- collaborative editing primitives (yjs)
- richer command history (per-transaction meta)
- typed schema (bullet lists, code blocks, tables, callouts)

Do not migrate until we hit a concrete need (collab, code blocks with
syntax highlighting, or per-block permissions). The current editor is
small, fast, and known to work.

---

## Study workflows (Future — deliberately not in Phase 6)

The UPSC-specific ideas from earlier chats — PYQ ingest, mains answer
workshop, exam-day timer, coverage dashboards — are all valid, all deferred.
They belong on top of the curriculum layer once notes reliably link to nodes.

The universal analog is: **any curriculum can grow a "practice" module.**
A CS course has homeworks; a med school course has flashcards; UPSC has
PYQs and mains answers. When we build the first practice type, build the
interface generically:

```
Practice { id, curriculumNodeId, kind, prompt, answerSchema, dueAt }
```

so it works for exam prep as much as it works for a book club rereading
their notes.

---

## Non-goals

Explicitly out of scope for the foreseeable future:

- Real-time collaboration (Google-Docs-style multi-cursor).
- Public sharing / publishing.
- Rich media (audio / video) embedded in notes.
- Plugin marketplace.
- Native mobile shell beyond the PWA.

If a user asks for one of these, revisit — but don't build them on spec.
