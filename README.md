# BA Builder

A complete workspace for **Technical Business Analysts** — from strategy and elicitation,
through requirements and solution modelling, to diagrams, documentation and technical
specifications. Plain HTML, CSS and JavaScript: no build step, no server, no account.

## Write an SRS step by step

Click **+ New SRS** (top of the sidebar) and follow 10 guided steps:

1. Introduction — system name, purpose, who signs off
2. Problem & scope — problem, vision, in scope / out of scope, constraints
3. Business objectives — measurable targets
4. Users & stakeholders — user types, external systems, approvers
5. Functional requirements — "The system shall…", checked for quality as you type, with Given/When/Then
6. Quality requirements (NFRs) — one-click templates for performance, availability, security, privacy and more
7. Use cases *(optional)*
8. Data & interfaces *(optional)*
9. Business rules & assumptions *(optional)*
10. Review & export — completeness checklist, live preview, download as Word, PDF or Markdown

Each step explains what to write, gives an example, and turns green when it is complete.
If a step is not green yet, a **To finish this step** box at the top lists exactly what is
missing (for example “NFR-004: Not traced to an objective”); click a line to open and fix it.
You can leave at any time and continue later from **SRS wizard** in the sidebar.

## Look
A single dark theme: black background, green for primary actions and progress, red for
accents and warnings. Diagrams use the same colours on screen; Word and HTML exports use a
light version so they print cleanly on white paper.

## What it covers

| Area | Tools |
| --- | --- |
| **Strategy** | Project charter (problem, vision, scope), SMART objectives, SWOT, PESTLE, gap analysis (as-is → to-be), business case with NPV / ROI / IRR / payback / discounted payback |
| **Cost & time** | Team day rates, three-point (PERT) work estimates, cost with contingency, 50/80/90/95% confidence range, phase schedule on a working-day calendar (weekends, public holidays), finish date vs target, sprint forecast from velocity, one click to feed the business case |
| **Stakeholders** | Register, power/interest grid, editable RACI matrix, personas & actors, elicitation sessions (interviews, workshops, observation…) with actions, open questions |
| **Requirements** | Business / stakeholder / functional / non-functional / data / interface / transition requirements with a live quality checker (ambiguous words, missing "shall", untestable NFRs, missing acceptance criteria, untraced items) |
| **Agile** | User stories with Given/When/Then, drag-and-drop backlog board, MoSCoW · RICE · WSJF prioritisation, value-vs-effort chart, releases |
| **Analysis models** | Fully dressed use cases, business rules, decision tables (with missing-combination check), UAT test cases |
| **Solution design** | Swimlane process models (as-is / to-be, pain points), logical data model, state machines, API endpoints, integrations |
| **Control** | RAID log with risk scoring, decision log, change requests with impact analysis, glossary |
| **Traceability** | RTM, objective coverage matrix, trace graph and an impact explorer (what changes if this requirement changes?) |

### Diagrams
Generated from your data, always in sync: system context, BPMN-style process flows,
use case, sequence (from use case flows), state machine, ERD, class, decision flow,
stakeholder map, traceability graph, value vs effort, scope mind map, release roadmap,
delivery schedule (Gantt from the estimate). Very large projects get condensed versions of the
trace graph, ERD and class diagram so the page never freezes; the matrix and documents keep every item.

Plus:
- **Diagram studio** — any Mermaid diagram with live preview and 17 BA templates
  (flowchart, swimlanes, sequence, class, ERD, state, activity, journey, mind map, Gantt,
  timeline, quadrant, pie, C4 context, fishbone, org chart, use case).
- **Whiteboard** — drag-and-drop flowcharts and low-fidelity wireframes with connectors,
  pan/zoom, and SVG/PNG/JSON export.

### Documents (19)
Project Charter · Business Case · Strategy Analysis · Stakeholder Analysis & Engagement Plan ·
Elicitation Report & Minutes · BRD · SRS (ISO/IEC/IEEE 29148 structure) · Use Case
Specifications · Product Backlog · Process Documentation · Data Dictionary · API & Interface
Specification · Traceability Matrix · UAT Plan & Results · RAID & Decision Log · Change
Request Log · Release & Transition Plan · Cost & Schedule Estimate · Glossary.

Each exports to **Word (.doc)**, **PDF** (print), **HTML** or **Markdown**, with diagrams embedded.

### Technical exports
OpenAPI 3.0 YAML · PostgreSQL DDL · JSON Schema · RTM CSV · every register as CSV ·
a complete ZIP pack · the project file (JSON) for backup and sharing.
Requirements, stories, stakeholders, RAID, tests, questions and glossary can be imported from CSV.

## Run it

Browsers only load JavaScript modules over `http://`, so serve the folder:

```bash
python -m http.server 8080
```

or

```bash
npx serve .
```

Then open http://localhost:8080. An example project (a fictional bank's digital loan
origination) loads on first run so every screen has content; add your own projects under
**Projects & export**.

### GitHub Pages
Settings → Pages → *Deploy from a branch* → `main` / `(root)`. The `.nojekyll` file makes
Pages serve the files as they are.

## Notes
- Data lives in your browser's local storage. Export the project file to back it up or
  move it to another machine.
- Diagrams use [Mermaid](https://mermaid.js.org) and the ZIP export uses JSZip, both loaded
  from the jsDelivr CDN on first use (internet needed for those features).
- Undo with **Ctrl+Z**.

## Tests

```bash
node tests/unit.mjs
```
147 checks of the maths and rules: NPV, ROI, IRR, payback, PERT, confidence ranges, working-day
dates (weekends, holidays, leap years, month and year ends), risk / RICE / WSJF scores, ID numbering,
every requirement-quality rule, and that every built-in NFR template passes the quality checks.

```bash
node tests/smoke.mjs
```
Builds every document, diagram and export for the example project and an empty one.

```bash
node tests/stress.mjs
```
A generated project of 2 000–6 600 items full of awkward text (quotes, pipes, `#`, `;`, brackets,
emoji, Chinese, very long names) must build every document, diagram and export with no
`undefined` / `NaN`, in seconds.

**In the browser:** serve the folder and open `http://localhost:8080/tests/browser.html`. It draws all
137 diagrams (example, empty, stress x1 and x3 projects, print theme, studio templates) and fails any that
error, come out empty or take longer than 10 seconds.

## Project structure

```
index.html            entry point
css/app.css           dark theme tokens, responsive layout, print styles
js/app.js             shell, navigation, router
js/model.js           data model: every artefact is a schema-described collection
js/store.js           projects, local storage, undo
js/sample.js          example project
js/ui.js              DOM helpers, modals, schema-driven forms
js/markdown.js        Markdown → HTML for documents
js/mermaid.js         Mermaid loader, SVG/PNG export
js/gen/docs.js        document templates
js/gen/diagrams.js    diagram generators
js/gen/exports.js     CSV, OpenAPI, SQL, JSON Schema, RTM
js/views/             one file per screen
js/estimate.js        cost & time maths: PERT, working-day calendar, schedule
js/templates.js       NFR templates used by the SRS wizard
tests/                automated tests (see below)
```

Adding a new artefact type is usually just a new entry in `COLLECTIONS` in `js/model.js`:
the list, editor, search, filters and CSV export come for free.
