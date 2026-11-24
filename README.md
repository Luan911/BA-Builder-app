# BA Builder

A complete workspace for **Technical Business Analysts** — from strategy and elicitation,
through requirements and solution modelling, to diagrams, documentation and technical
specifications. Plain HTML, CSS and JavaScript: no build step, no server, no account.

## Built for daily work
- **Simple mode** (the default) shows only the screens a software BA uses every day — brief,
  stakeholders, elicitation, stories or requirements, rules, UAT, traceability, processes, data,
  screens & mapping, APIs, SQL, RAID, decisions, changes, diagrams and documents. **Show all tools**
  (bottom of the sidebar) reveals strategy, estimating, architecture, learning and the rest.
- Choose **user stories or requirements** in the Project brief; Simple mode then shows only that one.
- **Shorter forms:** optional fields sit under "More details".
- **Paste a list** on most registers: paste bullet points from meeting notes or chat and each line
  becomes an open question, requirement, story, glossary term ("Term: definition"), RAID item
  ("Risk: …"), rule, stakeholder ("Name - Role"), user type, test case, change or decision.
- **Starter blocks:** ready-made requirements or stories with acceptance criteria (sign-in & roles,
  audit trail, notifications, search/filter/export, file upload), common user roles, and common RAID
  items — all written to pass the quality checks.
- **Type once, reuse:** create a screen from an entity (every attribute mapped), standard REST
  endpoints from an entity, and draft UAT tests from acceptance criteria.
- **Project templates:** save a project's reusable parts (roles, stakeholders, glossary, NFRs,
  assumptions, BA plan) and start new projects from them.
- **Edit status and priority straight in the tables**, and press **Ctrl + K** to jump to any screen,
  document or item by name or ID.

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

### Documents
**Five core deliverables:** Discovery & Scope Brief · Functional & Backlog Specification · Data &
Integration Specification · UAT & Traceability Pack · RAID & Change Log. Each starts with document
control, numbers its sections, and leaves out anything that is still empty.

**Build a document:** tick any of 30 sections (problem & scope, objectives, stakeholders, stories,
requirements, NFRs, rules, processes, screens, data model, dictionary, mapping, APIs, integrations,
permissions, tests, RTM, defects, RAID, decisions, changes, glossary, approval…) and export one
combined document — e.g. a sign-off pack.

**Word (.docx)** files are real Word documents: a cover page with your logo and organisation, a
clickable contents list, headings in Word's navigation pane, numbered lists, tables with repeating
header rows, page numbers, and wide diagrams and wide tables on landscape pages. Set the logo, brand
colour, footer note (e.g. "Confidential"), cover page and contents under **Projects & export →
Document branding**.

**Copy rich text** pastes headings, tables and diagrams cleanly into Word, Confluence, Google Docs
or Outlook.

**More documents (22)**
Project Charter · Business Case · Strategy Analysis · Stakeholder Analysis & Engagement Plan ·
Elicitation Report & Minutes · BRD · SRS (ISO/IEC/IEEE 29148 structure) · Use Case
Specifications · Product Backlog · Process Documentation · Data Dictionary · API & Interface
Specification · Traceability Matrix · UAT Plan & Results · RAID & Decision Log · Change
Request Log · Release & Transition Plan · Cost & Schedule Estimate · **Data Mapping
Specification** · **Solution Architecture Overview** · **Business Analysis Plan & Performance** · Glossary.

Each exports to **Word (.docx)**, **PDF** (print), **HTML** or **Markdown**, with diagrams embedded.

### Technical exports
OpenAPI 3.0 YAML · **Postman collection** · PostgreSQL DDL · JSON Schema · RTM CSV · every register as CSV ·
a complete ZIP pack · the project file (JSON) for backup and sharing.
Requirements, stories, stakeholders, RAID, tests, questions and glossary can be imported from CSV.

### Jira round trip
- **Export to Jira** (on the stories and requirements pages, or Projects & export) makes a CSV for
  Jira's CSV importer: one Epic per epic name, Stories linked to their epic (Issue Id / Parent), the
  acceptance criteria in the description, priority (Must → High, Should → Medium, Could → Low,
  Won't → Lowest), story points, status, and a `babid_US-001` label.
- **Update from Jira** reads a Jira CSV export and, after showing what will change, brings back issue
  keys, status, priority and story points. Items are matched by the `babid_` label, then the Jira key,
  then the summary. Stories and bugs created in Jira are added. Undo works as usual.

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

## BA Masterclass
A complete course in business analysis inside the app (**Learn → BA Masterclass**): 13 modules and
21 lessons following the BABOK® Guide v3 knowledge areas — foundations and the core concept model,
planning & monitoring, elicitation & collaboration, strategy analysis, requirements analysis & design
definition, requirements life cycle management, solution evaluation — plus BPMN and UML modelling,
Agile BA (Scrum 2020, INVEST, Given/When/Then), technical BA (architecture, APIs, integration, data,
normalisation, SQL, security and POPIA), testing & quality (SIT/UAT, defects, usability heuristics),
process improvement (SIPOC, DMAIC, value streams) and career & certification. Every lesson has key
ideas, how to apply them, links to practise in the app, a self-check quiz and its sources. Progress is
saved, and the whole course downloads as one document.

Sources include IIBA (BABOK® Guide, core concept model, Agile Extension, certifications), the PMI Guide
to Business Analysis, IREB CPRE, ISO/IEC/IEEE 29148, BCS (POPIT, CATWOE), the 2020 Scrum Guide, the
Agile Business Consortium (MoSCoW), Agile Alliance (INVEST), BPMN, Nielsen Norman Group, ASQ,
Strategyzer, South Africa's Information Regulator (POPIA), and the Techcanvass, TechVedas, Passionate BA
and Tech Bytes with Leena video series. Content is summarised in original wording with links to each
source. BABOK® is a registered trademark of IIBA.

**Technique library** — all 50 BABOK® techniques, what each is for, and where to practise it. Every
technique is supported: besides the tools above, the app has a Business Model Canvas, business
capability map, root cause analysis (5 Whys and fishbone), vendor / option assessment with weighted
scoring, roles & permissions matrix (functions and CRUD), balanced-scorecard objectives with benefits
tracking, functional decomposition, concept model, reviews & sign-offs, lessons learned and a
business analysis plan.

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

## Works offline
- Every library ships with the app in `vendor/` (Mermaid for diagrams, the ELK tidy layout, and
  sql.js for the SQL workbench — all MIT licensed), so nothing is loaded from the internet.
- Opened from a web address (e.g. GitHub Pages), BA Builder saves itself on the device the first
  time (a service worker, `sw.js`) and then opens and works with no connection. It can also be
  installed as an app from the browser's address bar. When a new version is published, a notice
  offers **Reload now** — nothing changes under you mid-task.
- Run locally (`localhost`), every file is already on your computer, so no internet is needed either.
- After changing any app file, run `node tools/offline-list.mjs` so the offline copy is refreshed
  (the unit tests fail if you forget).

## Backups
Your work is stored in this browser only, so BA Builder helps you keep a copy:
- **Back up everything** (Projects & export → Backups & offline) downloads one `.json` file with
  every project, your templates and branding. **Restore from a backup** shows exactly which projects
  will be replaced, added or kept (and warns if this browser has newer work) before doing it.
- **Backup reminder:** a notice appears when something has changed and the last backup is older
  than your chosen interval (every day / week / month, or never). "Remind me tomorrow" snoozes it.
- **Restore points:** saved automatically in the browser once a day while you work, and before you
  delete a project or restore a backup. Go back to any of them in one click (your current work is
  saved as a restore point first). The newest 12 are kept.
- Backing up also asks the browser to protect BA Builder's storage from automatic clean-up.

## Notes
- Undo with **Ctrl+Z**.

## Tests

```bash
node tests/unit.mjs
```
354 checks of the maths and rules: NPV, ROI, IRR, payback, PERT, confidence ranges, working-day
dates (weekends, holidays, leap years, month and year ends), risk / RICE / WSJF scores, ID numbering,
splitting big diagrams (nothing lost, no part too big), normalising to 3NF, Simple mode, paste-to-add, starter blocks, derived screens / endpoints / tests, templates, core documents and the document builder, well-formed Word (.docx) files (cover, contents, landscape pages, branding), the ZIP writer, the Jira CSV export and import round trip, offline readiness (bundled libraries, no CDN, an up-to-date offline file list), backup files, restore plans and backup reminders, UML notation rules, SQL sample data, API and data-mapping checks, architecture views, the focus view, every requirement-quality rule, and that every built-in NFR template passes the quality checks.

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

```bash
node tests/syntax.mjs
```
Strict syntax check of every script as an ES module (plain `node --check` can miss errors in `.js` files).

**End to end:** serve the folder and open `http://localhost:8080/tests/e2e.html`. It drives the real app
like a user — every screen, every document and diagram, add / edit / duplicate / delete in every
register, the SRS wizard, undo, normalisation, SQL, estimates, vendors, the canvas, permissions, focus
view, masterclass, practice and every export — and fails on any error. Your own projects are backed up
first and restored afterwards.

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
js/masterclass.js     BA Masterclass lessons, quizzes, sources and the 50-technique library
tests/                automated tests (see below)
```

Adding a new artefact type is usually just a new entry in `COLLECTIONS` in `js/model.js`:
the list, editor, search, filters and CSV export come for free.
