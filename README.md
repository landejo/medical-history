# Jason's Medical History

A private, personal medical-records tracker: a scrollable timeline of every visit, test, scan and procedure, grouped into episodes (one health event and everything connected to it), with plain-English summaries, color-tagged findings, lab trends, a share/export tool, and an in-app conversation with Claude about what it all means.

**Privacy model.** This repository holds only the app code and a fictional demo dataset. Real records live in a separate **private** repository (`medical-history-data`). The hosted app on GitHub Pages contains no health data; it reads the private repository through the GitHub API with a fine-grained token you enter once per device, stored only in that browser.

## Running locally

```bash
npm install
npm run dev
```

The dev server reads records from `./private` when that folder has records (it is the private data repo, cloned inside this one and git-ignored), otherwise from `./demo-data`. The "Add record" form writes straight into that folder and rebuilds `index.json`.

```bash
npm test          # unit tests (vitest)
npm run lint
npm run build     # production build in dist/ (ships demo-data as a public demo)
npm run index     # rebuild private/index.json after editing records by hand
npm run demo      # regenerate the fictional demo dataset
```

## Hosted app

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. On first visit the app asks for the data repository and a token; "Browse the demo instead" shows the fictional dataset.

Token: GitHub → Settings → Developer settings → Fine-grained tokens → limit to `medical-history-data` with **Contents: Read and write** (read-only works for viewing; write is needed to add records from the app).

## Data layout (same in `private/` and `demo-data/`)

```
profile.json              name, DOB, conditions, medications, allergies, care team, screenings
episodes/<id>.json        a parent event: title, dates, status, summary
records/<id>.json         one visit / test / scan / procedure / vaccine / medication / document
attachments/<record-id>/  images (x-ray, MRI, photos), PDFs, markdown reports
inbox/                    raw downloads waiting to be processed by Claude Code (git-ignored)
originals/                full-resolution DICOM/TIFF/video, kept on this Mac only (git-ignored)
index.json                generated: everything merged, the only file the app fetches on load
```

Record ids are `YYYY-MM-DD-short-slug`. Findings carry a sentiment: `negative` (concern), `watch` (keep an eye on), `positive` (good news) or `neutral`. See `src/types/index.ts` for the full schema and `CLAUDE.md` for the ingestion workflow.

## Asking Claude

Settings → paste an Anthropic API key (kept in the browser). The chat sends your profile and records as context with each question; usage is billed to your API account. Answers are explanations, not medical advice.

## Adding records

- **Quick manual entry:** Add record in the app.
- **PDFs, portal exports, scans:** drop them in `private/inbox/` and ask Claude Code to process them. It reads the document, writes the synopsis and findings, files the record under the right episode, moves the originals into `attachments/`, rebuilds the index and commits.
- **Patient portals:** ask Claude Code to pull new records with the browser; it will download them into the inbox for you to approve, then process them.
