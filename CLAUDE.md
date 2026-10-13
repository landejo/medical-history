# Jason's Medical History — working notes for Claude Code

Vite + React + TypeScript app. Code and fictional demo data are public (this repo); real records live in `./private/`, a clone of the private `landejo/medical-history-data` repository (git-ignored here). Never copy anything from `private/` into this repository, demo data, tests, or commits here.

## Commands
- `npm run dev` (reads `private/` if it has records, else `demo-data/`), `npm test`, `npm run lint`, `npm run build`
- `npm run index` rebuilds `private/index.json` and validates every record; run it after any change under `private/`.

## Processing new records (the inbox workflow)
When asked to process `private/inbox/` (or files the user points at):
1. Read each document (PDF, image, portal export). For scans, note what the image shows; don't invent findings that aren't in the report.
2. Decide: is this part of an existing episode (`private/episodes/`), a new episode (several related records expected), or standalone?
3. Write `private/records/<YYYY-MM-DD>-<slug>.json` following `src/types/index.ts` (`MedRecord`):
   - `synopsis`: 2–4 plain-English sentences a non-clinician understands, first person-neutral, calm. Say what was done, what was found, what happens next.
   - `findings`: the notable results with `sentiment` — `negative` for concerns, `watch` for borderline/needs follow-up, `positive` for good news, `neutral` for plans/logistics. Quote numbers.
   - `values`: structured lab values with `unit`, `range`, `low`/`high`, `flag`.
   - `report`: the clinician's report text as Markdown when it's short; otherwise move the original into `attachments/<id>/` and set `reportFile`.
   - `attachments`: every image/PDF moved into `attachments/<id>/`, with `kind` and a short `label`.
   - `followUp`, `tags`, `source.portal`, `source.importedOn` (today).
4. Update `private/profile.json` when a record changes medications, conditions, allergies, care team or screening dates.
5. Put web-sized copies in `attachments/<id>/` (JPEG ≤2000px via `sips`, PDFs as-is). Move the full-resolution originals (DICOM, TIFF, video) to `private/originals/`, which is git-ignored and stays on this Mac (GitHub rejects files over 100 MB). Run `npm run index`, commit inside `private/` (stage by explicit path), and push to `medical-history-data` so the hosted app sees it.
6. When only the month or year of an event is known, set `datePrecision` (`month`/`year`) instead of inventing a day. Mark events taken only from Jason's own summary with a `source.portal` starting "Self-reported".
7. Skip anything that isn't Jason's (the inbox once held his wife's sleep study) and flag it.

## Pulling from patient portals
Use the Chrome extension (user's logged-in sessions) or the built-in browser. Downloads require explicit permission each time; save them into `private/inbox/`, then run the workflow above. Never enter credentials.

## Conventions
- Dates are `YYYY-MM-DD`; UI shows "4 Mar 2024".
- Design: warm paper neutrals, terracotta accent, Fraunces/Source Sans 3/JetBrains Mono; severity shown as ink-on-tint tags with a left rule, never saturated fills. No gradients, glass or illustrations.
- Keep the demo dataset fictional and clearly labelled (`demo-data/DEMO` marker file).
