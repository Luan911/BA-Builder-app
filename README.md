# AutoSpec Studio

A rule-based business analysis studio. You enter project information step by step,
following the SDLC phases in order, and AutoSpec:

- **checks everything** with 50+ deterministic rules (requirement quality, traceability,
  MoSCoW, RACI, RAID, data model, process flow and phase-gate rules),
- **tells each person what to do next** — client, delivery team and business analyst,
- **writes the documents** — Project Charter, BRD, SRS, User Stories with Gherkin,
  Traceability Matrix (+ CSV), Solution Design & Data Spec, Test Plan, RAID & Decision
  Log, Deployment & Handover Plan, Phase Gate Report,
- **draws the diagrams** — process flow (swimlanes), sequence, ERD, architecture,
  use cases, SDLC lifecycle and release roadmap — each with a plain-English description,
- **reads documents and diagram descriptions aloud** (browser speech, no server),
- **exports** branded PDFs, a full documentation pack PDF and a ZIP of everything.

There is **no AI**. The same input always produces the same output.

## Run it locally

The app is plain HTML, CSS and JavaScript modules — no build step. Browsers only load
JavaScript modules over `http://`, so serve the folder with any static server, then open
the address it prints:

```bash
npx serve .
```

or, with Python installed:

```bash
python -m http.server 8080
```

## Host it on GitHub Pages

1. Create a new repository on GitHub and upload the contents of this folder
   (`index.html` must be at the top level).
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and
   `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<your-user>.github.io/<repository>/`.

The `.nojekyll` file tells GitHub Pages to serve the files exactly as they are.

## What a static site can and cannot do

- Everything runs in the visitor's browser. Projects are saved in that browser's local
  storage; use **Export → Project file** to back up, move or share a project.
- The diagram, PDF and ZIP libraries (Mermaid, jsPDF, JSZip) load from the jsDelivr CDN
  the first time they are used, so those features need an internet connection.
- Updates show up on the next page load: a small service worker (`sw.js`) always checks
  for newer files instead of waiting for GitHub Pages' 10-minute cache. It also lets the app
  open offline after the first visit.
- Several people editing the same project at the same time would need a server and
  database; that is not part of a static site.
- **Code import** reads source files as text and recognises structure (endpoints, tables,
  classes, dependencies, configuration names) with patterns for ~15 languages. It never
  runs or changes the code, and it cannot know business intent — review the results with
  the development team. Files that may hold secrets (`.env`, private keys) are skipped.
- **Notes import** recognises standard phrasing ("As a … I want … so that …", "shall",
  "must", Given/When/Then, "Decision:", "Risk:", questions). Every suggestion is confirmed
  by a person before it is added.

## Project structure

```
index.html              App entry point
sw.js                   Service worker: fresh updates + offline support
assets/app.css          Design system (light + dark themes, responsive)
js/main.js              Layout, navigation and routing
js/store.js             Project + settings state, autosave, undo
js/model.js             Data model, defaults and helpers
js/sdlc.js              SDLC phases, PLC stages, entry/exit criteria, checklists
js/rules.js             Rules engine (all quality checks and phase gates)
js/generators/docs.js   Document templates
js/generators/diagrams.js  Diagram builders and spoken descriptions
js/markdown.js          Markdown parser used by the viewer, PDF and Read Aloud
js/export.js            Mermaid rendering, PDF (jsPDF) and ZIP (JSZip) export
js/speech.js            Read Aloud (Web Speech API)
js/importers/           Notes, code and CSV importers
js/ui/                  DOM helpers, form engine, editor schema
js/views/               One file per screen
js/sample.js            Example project
tests/                  Node tests for the rules, generators and importers
```

## Adding or changing a rule

Rules live in `js/rules.js`. Each rule states its phase, severity (`error` blocks the
phase gate, `warning`, `info`), who must act (`client`, `dev`, `ba`), why it matters, and
a `check(project)` function that returns the problems it found. New rules appear
automatically on the dashboard, the Quality check page, the phase gates and the Phase Gate
report.

## Tests

```bash
node tests/smoke.mjs
node tests/importers.mjs
```
