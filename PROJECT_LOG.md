# Project log — Jason's Medical History

## 2026-10-13 — Initial build

Built the app from scratch: Vite + React + TypeScript, no UI framework. Timeline with sticky month/year gutter, episode clusters with inline sub-timeline, record detail panel (synopsis → findings → results → report → images with lightbox), filters/search, Trends (SVG lab charts), Profile, Share (self-contained HTML export), Add record, Settings, and the Ask Claude drawer (Anthropic SDK in-browser, user's own key). Fictional demo dataset of 35 records / 3 episodes. Unit tests for timeline grouping, filters, trends, share builder and router.

Design decisions came from a research pass (Linear, Function Health, Oura, Whoop, Apple Health Records; Mobbin blocked automated access): Fraunces + Source Sans 3 + JetBrains Mono, warm paper palette, terracotta accent, ink-on-tint severity tags.

Hosting: public app repo on GitHub Pages, private data repo read through the GitHub API with a per-device token (user's choice). Local dev reads `./private` (clone of the data repo, git-ignored).

### System State Summary
- **Active tools:** Node 26, npm, Vite 8, Vitest 5, oxlint, gh CLI (account `landejo`), built-in browser for visual checks.
- **Workspace paths:** `src/` (app), `scripts/build-index.mjs` + `scripts/make-demo-data.mjs`, `demo-data/`, `private/` (separate git repo → `landejo/medical-history-data`), `.github/workflows/deploy.yml`, `.claude/launch.json` (dev server on port 5174).
- **Open dependencies / next steps:** process the user's real records from `private/inbox/`; user creates a fine-grained GitHub token and an Anthropic API key and enters them in the hosted app; first Pages deploy must succeed (workflow runs on push to `main`); consider a DOMPurify pass on rendered Markdown if third-party documents are ever imported verbatim.

## 2026-10-13 — First real records imported

Processed 33 inbox items into 60 records and 6 episodes (metabolic health, knees, left hip 2023, left shoulder 2021, right shoulder 2023, right wrist 2009) plus a populated profile. Added `datePrecision` / `startedPrecision` so year- or month-only events aren't given invented days. Web-sized attachments (18 MB) are in the data repo; full-resolution originals (849 MB incl. DICOM, TIFF and a 305 MB surgery video) stay in git-ignored `private/originals/`. Fixed the data repo's index workflow so timestamp-only rebuilds don't commit.

Left out and flagged to Jason: Tracey Lande's sleep study (left in inbox), a blank records-release form, a generic pre-op instruction sheet, payment receipt/account screenshots (kept in originals).

### System State Summary
- **Active tools:** Node 26, Vite 8, Vitest 5, gh CLI (`landejo`), poppler (pdftotext/pdftoppm, newly installed via Homebrew), macOS `sips`/`textutil`, built-in browser.
- **Workspace paths:** `private/records/`, `private/episodes/`, `private/attachments/`, `private/profile.json`, `private/originals/` (local only), `private/.github/workflows/index.yml`; app: `src/types/index.ts`, `src/lib/format.ts`.
- **Open items:** page 3 of the Sep 2026 ultrasound report is missing; no record yet of the CAC scan, colonoscopy, shingles or Tdap vaccines, the 2023 pre-op labs/EKG, or the Jul 2024 Stanford right-knee visit note; Dr. Farac's first name differs between Jason's summary (Nicholas) and the clinic notes (Randall A.).
