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
| **Normalisation** | Checks every entity for 1NF / 2NF / 3NF (missing key, repeating groups, multi-valued fields, partial and transitive dependencies, stored calculations), explains each problem, and restructures the model on request: new entities, moved attributes, foreign keys and relationships, with a before / after ERD. Dismiss false alarms, split by hand for dependencies only you know, undo with Ctrl+Z. Includes a practice table |
| **Control** | RAID log with risk scoring, decision log, change requests with impact analysis, glossary |
| **Traceability** | RTM, objective coverage matrix, trace graph and an impact explorer (what changes if this requirement changes?) |

### Diagrams
Generated from your data, always in sync: system context, as-is and to-be architecture
landscapes, layered architecture, BPMN-style process flows, UML activity, use case, sequence,
communication, state machine, ERD, class, data flow (screen → API → database), decision flow,
stakeholder map, traceability graph, value vs effort, scope mind map, release roadmap,
delivery schedule (Gantt from the estimate). Each diagram has a short **How to read it** key.

**UML notation** follows standard practice for business analysts:
- *Use case* — system boundary, actors outside (primary left, secondary right), plain association
  lines, «include» (base → included) and «extend» (extension → base), actor generalisation with a
  hollow triangle.
- *Class* — singular class names, typed attributes with PK / FK, operations, associations without
  navigability arrows, multiplicity at both ends (1, 0..1, *, 1..*), aggregation (hollow diamond),
  composition (filled diamond) and generalisation (hollow triangle).
- *Sequence* — actor and system lifelines, synchronous calls with activation bars, dashed returns,
  self messages for internal work, asynchronous notifications, and alternative / exception flows
  as `alt` fragments at the step they branch from.
- *Activity* — initial and final nodes, actions, decisions with [guards], fork / join bars for
  parallel work, accept-event and time-event actions, and swimlane partitions.
- *State machine* — transitions labelled `event [guard] / action`.

**Big models stay readable.** Traceability is also drawn one graph per objective, and the data model
one diagram per area (set an entity's *Area*, or the app groups linked entities for you). Links to
other areas show as small stub boxes. Documents switch to these split diagrams automatically when a
model is too big for one page, so every item is drawn somewhere.

**Focus view.** Pick any objective, requirement, story, test, use case, rule, API, entity and more, and
see everything linked to it 1–4 links away. Click a box to refocus, double-click to edit it. Every editor
has a **Show links** button that opens it.

**Viewer.** Fit to width, zoom, *Find a box* (highlights matches), click any box to open the item behind
it, and an optional **Tidy layout** (ELK engine: square-cornered lines, fewer crossings) that is also
used in exported documents. Word exports put wide diagrams on landscape pages at print resolution;
HTML exports keep diagrams as sharp, zoomable SVG.

Plus:
- **Diagram studio** — any Mermaid diagram with live preview and 17 BA templates
  (flowchart, swimlanes, sequence, class, ERD, state, activity, journey, mind map, Gantt,
  timeline, quadrant, pie, C4 context, fishbone, org chart, use case).
- **Whiteboard** — drag-and-drop flowcharts and low-fidelity wireframes with connectors,
  pan/zoom, and SVG/PNG/JSON export.

### Documents (21)
Project Charter · Business Case · Strategy Analysis · Stakeholder Analysis & Engagement Plan ·
Elicitation Report & Minutes · BRD · SRS (ISO/IEC/IEEE 29148 structure) · Use Case
Specifications · Product Backlog · Process Documentation · Data Dictionary · API & Interface
Specification · Traceability Matrix · UAT Plan & Results · RAID & Decision Log · Change
Request Log · Release & Transition Plan · Cost & Schedule Estimate · **Data Mapping
Specification** · **Solution Architecture Overview** · Glossary.

Each exports to **Word (.doc)**, **PDF** (print), **HTML** or **Markdown**, with diagrams embedded.

### Technical exports
OpenAPI 3.0 YAML · **Postman collection** · PostgreSQL DDL · JSON Schema · RTM CSV · every register as CSV ·
a complete ZIP pack · the project file (JSON) for backup and sharing.
Requirements, stories, stakeholders, RAID, tests, questions and glossary can be imported from CSV.

## Technical BA toolkit
- **SQL workbench** — runs real SQLite in the browser on tables built from your data model and
  filled with realistic sample data that respects keys and foreign keys. Example queries are
  generated from your own entities (SELECT, WHERE, ORDER BY, INNER / LEFT JOIN, GROUP BY, HAVING,
  plus data-quality checks). Import CSV, export results, save queries against requirements.
- **Screens & data mapping** — every screen field mapped to where it is stored (Entity.attribute),
  with checks for unmapped fields, missing attributes, type and required mismatches, plus a data flow
  diagram from screen to API to database and a Data Mapping Specification. Integrations get
  system-to-system field mapping too.
- **API specifications** — resource entity, version, idempotency (safe to retry) and failure handling
  (timeouts, retries, duplicates, what the user sees), standard status codes, generated JSON and XML
  examples, quality checks, OpenAPI and Postman exports.
- **Architecture** — components by layer (presentation, business logic, integration, data,
  external), as-is vs to-be landscapes with manual hand-offs highlighted, and a Solution
  Architecture Overview.
- **Testing** — test levels (SIT, UAT, regression…) and a defect log with steps to reproduce,
  expected vs actual, severity and priority, linked to tests and requirements.
- **AI-aware analysis** — business rules record who decides (system, AI with human approval, person)
  and there is an AI-governance NFR template.
- **Requirement suggestions** — besides the blocking quality checks, the editor suggests questions
  worth asking (unhappy paths, failed notifications, which fields can change).

## Interview practice
37 common Business Analyst and Technical BA interview questions in nine areas (scenarios,
requirements, stakeholders, Agile, UML, data & SQL, APIs, testing, AI). Answer first, then compare
with an answer outline, see the common mistake to avoid, and jump to the screen where you practise
that skill. A two-minute timer, notes and confidence ratings are kept on your device.

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
241 checks of the maths and rules: NPV, ROI, IRR, payback, PERT, confidence ranges, working-day
dates (weekends, holidays, leap years, month and year ends), risk / RICE / WSJF scores, ID numbering,
splitting big diagrams (nothing lost, no part too big), normalising to 3NF, UML notation rules, SQL sample data, API and data-mapping checks, architecture views, the focus view, every requirement-quality rule, and that every built-in NFR template passes the quality checks.

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

**In the browser:** serve the folder and open `http://localhost:8080/tests/browser.html`. It draws every
diagram: example, empty and stress x1 / x3 projects, print theme, studio templates, tidy layout and focus views, and fails any that
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
js/gen/normalise.js   1NF / 2NF / 3NF checks and model restructuring
js/gen/sqldata.js     SQLite schema, sample data and example queries for the SQL workbench
js/practice-bank.js   interview practice questions
tests/                automated tests (see below)
```

Adding a new artefact type is usually just a new entry in `COLLECTIONS` in `js/model.js`:
the list, editor, search, filters and CSV export come for free.
