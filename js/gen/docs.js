// Document generators: industry-standard BA deliverables as Markdown, filled from project data.
import { byId, nameOf, storyText, riskScore, riskLevel, businessCase, lintRequirement, today, rice, wsjf } from '../model.js';
import * as D from './diagrams.js';
import { rtmRows, sqlDdl } from './exports.js';
import { estimate } from '../estimate.js';
import { analyseModel } from './normalise.js';

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
export const table = (head, rows) => (rows.length ? [`| ${head.map(cell).join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n') : '_None recorded._');
const list = (a, empty = '_None recorded._') => (a && a.length ? a.map((x) => `- ${x}`).join('\n') : empty);
const ol = (a, empty = '_None recorded._') => (a && a.length ? a.map((x, i) => `${i + 1}. ${x}`).join('\n') : empty);
const or = (v, f = '_To be confirmed._') => (String(v ?? '').trim() ? v : f);
const mmd = (code) => `\`\`\`mermaid\n${code}\n\`\`\``;
/** One diagram, or a heading + diagram per part when a big model is split. */
const many = (list, label) => (list.length === 1 && !list[0].title ? mmd(list[0].code) : `_Split into ${list.length} diagrams so each stays readable._\n\n${list.map((d) => `#### ${label}: ${d.title}\n${mmd(d.code)}${d.note ? `\n\n_${d.note}_` : ''}`).join('\n\n')}`);
const money = (p, n) => `${p.businessCase.currency || ''} ${Math.round(n).toLocaleString()}`.trim();
const reqsOf = (p, types) => p.requirements.filter((r) => types.includes(r.type) && r.status !== 'Rejected');
const sh = (p, id) => nameOf(p.stakeholders, id);
const codesOf = (list, ids) => (ids || []).map((id) => byId(list, id)?.code).filter(Boolean).join(', ');

function header(p, title, purpose) {
  return [
    `# ${title}`,
    `**${or(p.meta.name, 'Untitled project')}**${p.meta.client ? ` · ${p.meta.client}` : ''}`,
    '',
    table(['Project code', 'Version', 'Date', 'Prepared by', 'Sponsor', 'Status'], [[p.meta.code, p.meta.version, today(), p.meta.analyst, p.meta.sponsor, 'Draft for review']]),
    '',
    purpose ? `## 1. Purpose\n${purpose}` : '',
  ].join('\n');
}
const signoff = (p) => `## Approval\n${table(['Name', 'Role', 'Signature', 'Date'], p.stakeholders.filter((s) => s.approver).map((s) => [s.name, s.role, '', '']))}`;
const reqTable = (p, reqs) => table(['ID', 'Requirement', 'Priority', 'Status', 'Source', 'Traces to'], reqs.map((r) => [r.code, `**${r.title}** — ${r.statement}`, r.priority, r.status, sh(p, r.source), [codesOf(p.objectives, r.objectiveIds), codesOf(p.requirements, r.parentIds)].filter(Boolean).join(', ')]));
const acceptance = (r) => (r.acceptance || []).length ? (r.acceptance || []).map((a, i) => `- **Scenario ${i + 1}:** Given ${a.given}, when ${a.when}, then ${a.then}.`).join('\n') : '_No acceptance criteria yet._';

// ---------------------------------------------------------------------------
const DOCS = {
  charter: { title: 'Project Charter / Vision & Scope', audience: 'Sponsor, steering committee', build: (p) => [
    header(p, 'Project Charter — Vision & Scope', 'Authorises the initiative and sets its vision, objectives, scope and governance.'),
    `## 2. Background and problem\n${or(p.charter.problem)}`,
    `## 3. Vision\n${or(p.charter.vision)}`,
    `## 4. Business objectives\n${table(['ID', 'Objective', 'KPI', 'Baseline', 'Target', 'By'], p.objectives.map((o) => [o.code, o.title, o.kpi, o.baseline, o.target, o.due]))}`,
    `## 5. Scope\n### In scope\n${list(p.charter.scopeIn)}\n\n### Out of scope\n${list(p.charter.scopeOut)}`,
    mmd(D.mindmap(p)),
    `## 6. Success criteria\n${list(p.charter.successCriteria)}`,
    `## 7. Budget, timeline and constraints\n- **Budget:** ${or(p.charter.budget)}\n- **Target date:** ${or(p.charter.deadline)}\n- **Methodology:** ${or(p.meta.methodology)}\n\n${list(p.charter.constraints, '_No constraints recorded._')}`,
    `## 8. Key stakeholders\n${table(['Name', 'Role', 'RACI'], p.stakeholders.filter((s) => s.power === 'High').map((s) => [s.name, s.role, s.raci]))}`,
    `## 9. Top risks\n${table(['ID', 'Risk', 'Score', 'Owner'], p.raid.filter((r) => r.type === 'Risk').sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 5).map((r) => [r.code, r.description, `${riskScore(r)} (${riskLevel(r)})`, sh(p, r.owner)]))}`,
    signoff(p),
  ] },

  businesscase: { title: 'Business Case', audience: 'Sponsor, finance', build: (p) => {
    const bc = businessCase(p);
    return [
      header(p, 'Business Case', 'Justifies the investment by comparing options, costs, benefits and risks.'),
      `## 2. Problem / opportunity\n${or(p.charter.problem)}`,
      `## 3. Options considered\n${or(p.businessCase.options).split('\n').map((l) => (l.trim() ? `- ${l.replace(/^[-*]\s*/, '')}` : '')).join('\n')}`,
      `## 4. Financial summary\n${table(['Measure', 'Value'], [['Total cost', money(p, bc.totalCost)], ['Total benefit', money(p, bc.totalBen)], [`Net present value @ ${(bc.rate * 100).toFixed(1)}%`, money(p, bc.npv)], ['Return on investment', `${bc.roi.toFixed(1)}%`], ['Internal rate of return', bc.irr === null ? 'n/a' : `${(bc.irr * 100).toFixed(1)}%`], ['Payback', bc.paybackExact === null ? 'Not within horizon' : `${bc.paybackExact.toFixed(1)} years`], ['Discounted payback', bc.discountedPayback === null ? 'Not within horizon' : `${bc.discountedPayback.toFixed(1)} years`]])}`,
      `## 5. Cash flow\n${table(['Year', 'Costs', 'Benefits', 'Net', 'Discount factor', 'Present value', 'Cumulative'], bc.rows.map((r) => [r.year, money(p, r.cost), money(p, r.ben), money(p, r.net), r.df.toFixed(3), money(p, r.pv), money(p, r.cum)]))}`,
      `## 6. Cost and benefit items\n${table(['Type', 'Year', 'Item', 'Category', 'Amount', 'Assumptions'], p.financials.map((f) => [f.kind, f.year, f.item, f.category, money(p, +f.amount || 0), f.notes]))}`,
      `## 7. Alignment to objectives\n${table(['ID', 'Objective', 'Target'], p.objectives.map((o) => [o.code, o.title, o.target]))}`,
      `## 8. Risks\n${table(['ID', 'Risk', 'Score', 'Mitigation'], p.raid.filter((r) => r.type === 'Risk').map((r) => [r.code, r.description, `${riskScore(r)} ${riskLevel(r)}`, r.response]))}`,
      `## 9. Recommendation\n${or(p.businessCase.recommendation)}`,
      signoff(p),
    ];
  } },

  strategy: { title: 'Strategy Analysis (SWOT, PESTLE, Gap)', audience: 'Sponsor, BA team', build: (p) => {
    const sw = (c) => list(p.swot.filter((x) => x.category === c).map((x) => x.text));
    return [
      header(p, 'Strategy Analysis', 'Assesses the current state, the external environment and the gaps that the change must close.'),
      `## 2. SWOT analysis\n### Strengths\n${sw('Strength')}\n\n### Weaknesses\n${sw('Weakness')}\n\n### Opportunities\n${sw('Opportunity')}\n\n### Threats\n${sw('Threat')}`,
      `## 3. PESTLE analysis\n${table(['Factor', 'Description', 'Impact', 'Response'], p.pestle.map((x) => [x.factor, x.text, x.impact, x.response]))}`,
      `## 4. Gap analysis\n${table(['ID', 'Area', 'Current state', 'Future state', 'Gap', 'Action', 'Priority'], p.gaps.map((g) => [g.code, g.area, g.asIs, g.toBe, g.gap, g.action, g.priority]))}`,
      `## 5. Current vs future processes\n${p.processes.map((x) => `### ${x.name} (${x.state})\n${mmd(D.processDiagram(p, x))}`).join('\n\n') || '_No processes modelled._'}`,
    ];
  } },

  stakeholders: { title: 'Stakeholder Analysis & Engagement Plan', audience: 'Project team', build: (p) => [
    header(p, 'Stakeholder Analysis & Engagement Plan', 'Identifies stakeholders, analyses their influence and interest, and plans how to engage them.'),
    `## 2. Stakeholder register\n${table(['Name', 'Role', 'Organisation', 'Power', 'Interest', 'Attitude', 'Needs & concerns'], p.stakeholders.map((s) => [s.name, s.role, s.org, s.power, s.interest, s.attitude, s.concerns]))}`,
    `## 3. Power / interest map\n${mmd(D.stakeholderMap(p))}`,
    `## 4. Engagement strategy\n${table(['Stakeholder', 'Strategy', 'Method', 'Approver'], p.stakeholders.map((s) => [s.name, s.power === 'High' ? (s.interest === 'High' ? 'Manage closely' : 'Keep satisfied') : s.interest === 'High' ? 'Keep informed' : 'Monitor', s.comms, s.approver ? 'Yes' : 'No']))}`,
    `## 5. RACI matrix\n${table(['Deliverable', ...p.stakeholders.map((s) => s.name)], p.raciItems.map((d) => [d, ...p.stakeholders.map((s) => p.raci[d]?.[s.id] || '')]))}\n\n_R = Responsible, A = Accountable, C = Consulted, I = Informed._`,
    `## 6. Personas and actors\n${p.personas.map((a) => `### ${a.name} (${a.kind})\n${or(a.description, '')}\n\n**Goals**\n${list(a.goals)}\n\n**Pain points**\n${list(a.pains)}`).join('\n\n') || '_None recorded._'}`,
  ] },

  elicitation: { title: 'Elicitation Report & Meeting Minutes', audience: 'Participants, project team', build: (p) => [
    header(p, 'Elicitation Report & Meeting Minutes', 'Records every elicitation activity, what was learned and the agreed actions.'),
    `## 2. Summary of activities\n${table(['ID', 'Date', 'Technique', 'Topic', 'Participants'], p.elicitation.map((e) => [e.code, e.date, e.technique, e.title, (e.participants || []).map((x) => sh(p, x)).join(', ')]))}`,
    ...p.elicitation.map((e) => `## ${e.code} — ${e.title}\n**Date:** ${e.date} · **Technique:** ${e.technique}\n\n**Participants:** ${(e.participants || []).map((x) => sh(p, x)).join(', ') || '—'}\n\n### Agenda\n${ol(e.agenda)}\n\n### Notes\n${or(e.notes, '_No notes._')}\n\n### Outcomes\n${list(e.outcomes)}\n\n### Actions\n${table(['Action', 'Owner', 'Due', 'Done'], (e.actions || []).map((a) => [a.action, sh(p, a.owner), a.due, a.done ? 'Yes' : 'No']))}`),
    `## Open questions\n${table(['ID', 'Question', 'Asked of', 'Due', 'Status', 'Answer'], p.questions.map((x) => [x.code, x.question, sh(p, x.askedOf), x.due, x.status, x.answer]))}`,
  ] },

  brd: { title: 'Business Requirements Document (BRD)', audience: 'Business stakeholders', build: (p) => [
    header(p, 'Business Requirements Document', 'Defines what the business needs, why, and how success will be measured — independent of the technical solution.'),
    `## 2. Executive summary\n${or(p.meta.summary)}`,
    `## 3. Business problem\n${or(p.charter.problem)}`,
    `## 4. Business objectives\n${table(['ID', 'Objective', 'KPI', 'Target'], p.objectives.map((o) => [o.code, o.title, o.kpi, o.target]))}`,
    `## 5. Scope\n**In scope**\n${list(p.charter.scopeIn)}\n\n**Out of scope**\n${list(p.charter.scopeOut)}`,
    `## 6. Stakeholders\n${table(['Name', 'Role', 'RACI'], p.stakeholders.map((s) => [s.name, s.role, s.raci]))}`,
    `## 7. Business requirements\n${reqTable(p, reqsOf(p, ['Business']))}`,
    `## 8. Stakeholder requirements\n${reqTable(p, reqsOf(p, ['Stakeholder']))}`,
    `## 9. Business processes\n${p.processes.map((x) => `### ${x.name} (${x.state})\n${or(x.description, '')}\n\n${mmd(D.processDiagram(p, x))}`).join('\n\n') || '_None modelled._'}`,
    `## 10. Business rules\n${table(['ID', 'Rule', 'Kind', 'Owner'], p.rules.map((r) => [r.code, `**${r.name}** — ${r.statement}`, r.kind, sh(p, r.owner)]))}`,
    `## 11. Assumptions, constraints and dependencies\n${table(['ID', 'Type', 'Description'], p.raid.filter((r) => r.type !== 'Risk').map((r) => [r.code, r.type, r.description]))}\n\n${list(p.charter.constraints, '')}`,
    `## 12. Transition requirements\n${reqTable(p, reqsOf(p, ['Transition']))}`,
    `## 13. Glossary\n${table(['Term', 'Definition'], [...p.glossary].sort((a, b) => a.term.localeCompare(b.term)).map((g) => [g.term + (g.synonyms ? ` (${g.synonyms})` : ''), g.definition]))}`,
    signoff(p),
  ] },

  srs: { title: 'Software Requirements Specification (SRS)', audience: 'Developers, testers, architects', build: (p) => [
    header(p, 'Software Requirements Specification', 'Specifies the functional and non-functional requirements of the solution (structure based on ISO/IEC/IEEE 29148).'),
    `## 2. Overall description\n${or(p.meta.summary)}\n\n### System context\n${mmd(D.contextDiagram(p))}\n\n### User classes\n${table(['Actor', 'Kind', 'Description'], p.personas.map((a) => [a.name, a.kind, a.description]))}`,
    `## 3. Functional requirements\n${reqsOf(p, ['Functional']).map((r) => `### ${r.code} ${r.title}\n${r.statement}\n\n- **Priority:** ${r.priority} · **Status:** ${r.status} · **Source:** ${sh(p, r.source) || '—'}\n${r.rationale ? `- **Rationale:** ${r.rationale}\n` : ''}\n**Acceptance criteria**\n${acceptance(r)}`).join('\n\n') || '_None._'}`,
    `## 4. Use cases\n${mmd(D.useCaseDiagram(p))}\n\n${table(['ID', 'Use case', 'Primary actor'], p.usecases.map((u) => [u.code, u.name, nameOf(p.personas, u.primary)]))}\n\nSee the Use Case Specification for full flows.`,
    `## 5. Non-functional requirements\n${table(['ID', 'Category', 'Requirement', 'Metric / target', 'Priority'], reqsOf(p, ['Non-functional']).map((r) => [r.code, r.category, r.statement, r.metric, r.priority]))}`,
    `## 6. Data requirements\n${reqTable(p, reqsOf(p, ['Data']))}\n\n${many(D.modelDocDiagrams(p, 'erd'), 'Data model')}`,
    `## 7. External interface requirements\n${reqTable(p, reqsOf(p, ['Interface']))}\n\n${table(['System', 'Direction', 'Protocol', 'Data', 'Frequency'], p.integrations.map((i) => [i.system, i.direction, i.protocol, i.data, i.frequency]))}`,
    `## 8. Business rules and decision logic\n${table(['ID', 'Rule', 'Requirements'], p.rules.map((r) => [r.code, `${r.name}: ${r.statement}`, codesOf(p.requirements, r.requirementIds)]))}\n\n${p.decisionTables.map(dtMarkdown).join('\n\n')}`,
    `## 9. State models\n${p.states.map((s) => `### ${s.name}\n${mmd(D.stateDiagram(p, s))}`).join('\n\n') || '_None._'}`,
    signoff(p),
  ] },

  usecases: { title: 'Use Case Specifications', audience: 'Developers, testers', build: (p) => [
    header(p, 'Use Case Specifications', 'Fully dressed use cases describing actor–system interactions, alternatives and exceptions.'),
    `## 2. Use case diagram\n${mmd(D.useCaseDiagram(p))}`,
    ...p.usecases.map((u) => [
      `## ${u.code} ${u.name}`,
      table(['Field', 'Value'], [['Primary actor', nameOf(p.personas, u.primary)], ['Supporting actors', (u.secondary || []).map((x) => nameOf(p.personas, x)).join(', ')], ['Level', u.level], ['Goal', u.goal], ['Trigger', u.trigger], ['Related requirements', codesOf(p.requirements, u.requirementIds)], ['Includes / extends', codesOf(p.usecases, u.includes)]]),
      `### Preconditions\n${list(u.pre)}`, `### Main success scenario\n${ol(u.main)}`, `### Alternative flows\n${list(u.alt)}`, `### Exceptions\n${list(u.exceptions)}`, `### Postconditions\n${list(u.post)}`,
      `### Sequence\n${mmd(D.sequenceDiagram(p, u))}`,
    ].join('\n\n')),
  ] },

  backlog: { title: 'Product Backlog & User Stories', audience: 'Scrum team, product owner', build: (p) => {
    const epics = [...new Set(p.stories.map((s) => s.epic || 'No epic'))];
    return [
      header(p, 'Product Backlog & User Stories', 'The prioritised backlog with acceptance criteria and estimates.'),
      `## 2. Summary\n${table(['Status', 'Stories', 'Points'], ['Backlog', 'Ready', 'In progress', 'In review', 'Done'].map((s) => { const x = p.stories.filter((y) => y.status === s); return [s, x.length, x.reduce((a, y) => a + (+y.points || 0), 0)]; }))}`,
      `## 3. Prioritisation\n${table(['ID', 'Story', 'MoSCoW', 'RICE', 'WSJF'], [...p.stories].sort((a, b) => wsjf(b) - wsjf(a)).map((s) => [s.code, s.iWant, s.priority, rice(s), wsjf(s)]))}\n\n${mmd(D.valueEffort(p))}`,
      ...epics.map((e) => `## Epic: ${e}\n${p.stories.filter((s) => (s.epic || 'No epic') === e).map((s) => `### ${s.code} ${s.iWant}\n> ${storyText(p, s)}\n\n- **Points:** ${s.points || '—'} · **Priority:** ${s.priority || '—'} · **Status:** ${s.status} · **Release:** ${nameOf(p.releases, s.release) || '—'}\n- **Implements:** ${codesOf(p.requirements, s.requirementIds) || '—'}\n\n**Acceptance criteria**\n${acceptance(s)}`).join('\n\n')}`),
      `## Definition of Ready\n${list(['Story follows As a / I want / so that', 'Acceptance criteria agreed with the product owner', 'Estimated by the team', 'Dependencies identified', 'Traced to a requirement'])}`,
      `## Definition of Done\n${list(['Code reviewed and merged', 'All acceptance criteria pass', 'Tests automated where practical', 'Documentation updated', 'Accepted by the product owner'])}`,
    ];
  } },

  processes: { title: 'Process Documentation (As-is / To-be)', audience: 'Process owners, operations', build: (p) => [
    header(p, 'Process Documentation', 'Describes current (as-is) and future (to-be) business processes, roles and pain points.'),
    ...p.processes.map((x) => `## ${x.name} (${x.state})\n**Owner:** ${sh(p, x.owner) || '—'}\n\n${or(x.description, '')}\n\n${mmd(D.processDiagram(p, x))}\n\n${table(['Step', 'Type', 'Description', 'Who', 'Next', 'Pain point / note'], (x.steps || []).map((s, i, arr) => [s.id, s.kind, s.label, s.lane, s.kind === 'decision' ? `Yes → ${s.yes || '?'}, No → ${s.no || '?'}` : s.kind === 'end' ? '—' : s.next || arr[i + 1]?.id || '—', s.pain]))}`),
    `## Gap analysis\n${table(['Area', 'As-is', 'To-be', 'Action'], p.gaps.map((g) => [g.area, g.asIs, g.toBe, g.action]))}`,
  ] },

  data: { title: 'Data Dictionary & Data Model', audience: 'Developers, data team', build: (p) => [
    header(p, 'Data Dictionary & Data Model', 'Defines the logical data model: entities, attributes, keys, relationships and data governance.'),
    `## 2. Entity relationship diagram\n${many(D.modelDocDiagrams(p, 'erd'), 'Area')}`,
    `## 3. Class diagram\n${many(D.modelDocDiagrams(p, 'class'), 'Area')}`,
    `## 4. Entities\n${table(['Entity', 'Description', 'Classification', 'Retention', 'Owner'], p.entities.map((e) => [e.name, e.description, e.classification, e.retention, sh(p, e.owner)]))}`,
    ...p.entities.map((e) => `### ${e.name}\n${table(['Attribute', 'Type', 'Key', 'Required', 'Unique', 'Description / validation'], (e.fields || []).map((f) => [f.name, f.type, [f.pk && 'PK', f.fk && `FK → ${f.fk}`].filter(Boolean).join(', '), f.required ? 'Yes' : 'No', f.unique ? 'Yes' : 'No', f.desc]))}`),
    `## 5. Relationships\n${table(['From', 'Cardinality', 'To', 'Meaning'], p.relationships.map((r) => [nameOf(p.entities, r.from), r.card, nameOf(p.entities, r.to), r.label]))}`,
    `## 6. Data requirements\n${reqTable(p, reqsOf(p, ['Data']))}`,
    `## Normalisation check\nEach entity checked for first, second and third normal form: a primary key, one value per attribute, and no partial or transitive dependencies.\n\n${table(['Entity', 'Normal form', 'Open points'], analyseModel(p).map((m) => [m.entity.name, ['Not in 1NF', '1NF', '2NF', '3NF'][m.nf], m.issues.map((i) => `${i.form}: ${i.title}`).join('; ') || 'None']))}`,
    `## Appendix — SQL DDL\n\`\`\`sql\n${sqlDdl(p)}\n\`\`\``,
  ] },

  api: { title: 'API & Interface Specification', audience: 'Developers, integration partners', build: (p) => [
    header(p, 'API & Interface Specification', 'Defines the service endpoints and system integrations. An OpenAPI 3.0 file is available from Exports.'),
    `## 2. System context\n${mmd(D.contextDiagram(p))}`,
    `## 3. Integrations\n${table(['System', 'Direction', 'Protocol', 'Data exchanged', 'Frequency', 'Auth', 'SLA / errors', 'Owner'], p.integrations.map((i) => [i.system, i.direction, i.protocol, i.data, i.frequency, i.auth, i.sla, sh(p, i.owner)]))}`,
    `## 4. Endpoint summary\n${table(['Method', 'Path', 'Summary', 'Security', 'Requirements'], p.apis.map((a) => [a.method, `\`${a.path}\``, a.summary, a.auth, codesOf(p.requirements, a.requirementIds)]))}`,
    ...p.apis.map((a) => `### ${a.method} \`${a.path}\`\n${a.summary}\n\n**Parameters**\n${table(['Name', 'In', 'Type', 'Required', 'Description'], (a.params || []).map((x) => [x.name, x.in, x.type, x.required || x.in === 'path' ? 'Yes' : 'No', x.desc]))}\n\n${a.request ? `**Request body**\n\`\`\`json\n${a.request}\n\`\`\`\n\n` : ''}${a.response ? `**Response**\n\`\`\`json\n${a.response}\n\`\`\`\n\n` : ''}**Response codes**\n${table(['Code', 'Meaning'], (a.codes || []).map((c) => [c.code, c.desc]))}`),
  ] },

  rtm: { title: 'Requirements Traceability Matrix', audience: 'Everyone', build: (p) => {
    const rows = rtmRows(p);
    const cov = rows.filter((x) => x.covered).length;
    return [
      header(p, 'Requirements Traceability Matrix', 'Traces every requirement backwards to objectives and sources, and forwards to design, stories and tests.'),
      `## 2. Coverage\n- Requirements: **${rows.length}**\n- Covered by at least one test: **${cov}** (${rows.length ? Math.round((cov / rows.length) * 100) : 0}%)\n- Without an objective: **${rows.filter((x) => !x.objectives.length && x.r.type !== 'Business').length}**`,
      `## 3. Matrix\n${table(['Req', 'Title', 'Priority', 'Objectives', 'Derived from', 'Use cases', 'Stories', 'Rules', 'APIs', 'Tests'], rows.map((x) => [x.r.code, x.r.title, x.r.priority, x.objectives.join(', '), x.parents.join(', '), x.usecases.join(', '), x.stories.join(', '), x.rules.join(', '), x.apis.join(', '), x.tests.join(', ')]))}`,
      `## 4. Traceability graph\n${many(D.traceDocDiagrams(p), 'Objective')}`,
      `## 5. Requirement quality issues\n${table(['Req', 'Issues'], p.requirements.map((r) => [r.code, lintRequirement(r, p).join('; ')]).filter((x) => x[1]))}`,
    ];
  } },

  uat: { title: 'UAT Test Plan & Results', audience: 'Testers, business users', build: (p) => {
    const by = (s) => p.tests.filter((t) => t.status === s).length;
    return [
      header(p, 'User Acceptance Test Plan & Results', 'Defines how the business will verify the solution and records the results.'),
      `## 2. Approach\nTests are derived from requirements and acceptance criteria. Each test case is executed by a business tester and recorded as Passed, Failed or Blocked. Failed tests are logged as defects and re-tested.`,
      `## 3. Results summary\n${table(['Passed', 'Failed', 'Blocked', 'Not run', 'Total'], [[by('Passed'), by('Failed'), by('Blocked'), by('Not run'), p.tests.length]])}`,
      `## 4. Test cases\n${p.tests.map((t) => `### ${t.code} ${t.title}\n- **Verifies:** ${[codesOf(p.requirements, t.requirementIds), codesOf(p.stories, t.storyIds)].filter(Boolean).join(', ') || '—'}\n- **Preconditions:** ${or(t.pre, '—')}\n- **Status:** ${t.status} · **Tester:** ${sh(p, t.tester) || '—'}\n\n**Steps**\n${ol(t.steps)}\n\n**Expected:** ${or(t.expected, '—')}${t.actual ? `\n\n**Actual:** ${t.actual}` : ''}`).join('\n\n') || '_No test cases._'}`,
      `## 5. Acceptance criteria to be verified\n${p.requirements.filter((r) => (r.acceptance || []).length).map((r) => `### ${r.code} ${r.title}\n${acceptance(r)}`).join('\n\n')}`,
      `## 6. UAT sign-off\nBy signing, the approver confirms the solution meets the agreed acceptance criteria.\n\n${signoff(p).replace('## Approval\n', '')}`,
    ];
  } },

  raid: { title: 'RAID & Decision Log', audience: 'Project team, steering committee', build: (p) => [
    header(p, 'RAID & Decision Log', 'Risks, assumptions, issues, dependencies and decisions.'),
    ...['Risk', 'Assumption', 'Issue', 'Dependency'].map((t) => `## ${t}s\n${table(['ID', 'Description', ...(t === 'Risk' || t === 'Issue' ? ['L', 'I', 'Score'] : []), 'Owner', 'Status', 'Response', 'Review'], p.raid.filter((r) => r.type === t).map((r) => [r.code, r.description, ...(t === 'Risk' || t === 'Issue' ? [r.likelihood, r.impact, `${riskScore(r)} ${riskLevel(r)}`] : []), sh(p, r.owner), r.status, r.response, r.due]))}`),
    `## Decisions\n${table(['ID', 'Date', 'Decision', 'Options considered', 'Rationale', 'Decided by'], p.decisions.map((d) => [d.code, d.date, d.decision, (d.options || []).join('; '), d.rationale, sh(p, d.by)]))}`,
  ] },

  changes: { title: 'Change Request Log & Impact Analysis', audience: 'Change control board', build: (p) => [
    header(p, 'Change Request Log & Impact Analysis', 'Every change to the baselined scope with its impact assessment and decision.'),
    `## 2. Log\n${table(['ID', 'Date', 'Change', 'Requested by', 'Schedule (days)', 'Cost', 'Risk', 'Status'], p.changes.map((c) => [c.code, c.date, c.title, sh(p, c.by), c.schedule, c.cost ? money(p, c.cost) : '', c.risk, c.status]))}`,
    ...p.changes.map((c) => `## ${c.code} ${c.title}\n**Requested change:** ${or(c.description)}\n\n**Justification:** ${or(c.reason)}\n\n### Impact analysis\n${table(['Dimension', 'Impact'], [['Scope', c.scope], ['Schedule', c.schedule ? `${c.schedule} days` : ''], ['Cost', c.cost ? money(p, c.cost) : ''], ['Risk', c.risk], ['Affected requirements', codesOf(p.requirements, c.requirementIds)], ['Affected stories', p.stories.filter((s) => (s.requirementIds || []).some((r) => (c.requirementIds || []).includes(r))).map((s) => s.code).join(', ')], ['Affected tests', p.tests.filter((t) => (t.requirementIds || []).some((r) => (c.requirementIds || []).includes(r))).map((t) => t.code).join(', ')]])}\n\n**Decision:** ${c.status}${c.decision ? ` — ${c.decision}` : ''}`),
  ] },

  release: { title: 'Release & Transition Plan', audience: 'Delivery, operations', build: (p) => [
    header(p, 'Release & Transition Plan', 'What ships when, and what is needed to move from the current to the future state.'),
    `## 2. Roadmap\n${mmd(D.roadmap(p))}`,
    ...p.releases.map((r) => `## ${r.name}\n${r.start} → ${r.end}\n\n**Goal:** ${or(r.goal, '—')}\n\n${table(['Story', 'Points', 'Status'], p.stories.filter((s) => s.release === r.id).map((s) => [`${s.code} ${s.iWant}`, s.points, s.status]))}\n\n**Requirements:** ${p.requirements.filter((q) => q.release === r.id).map((q) => q.code).join(', ') || '—'}`),
    `## Transition requirements\n${reqTable(p, reqsOf(p, ['Transition']))}`,
    `## Readiness checklist\n${list(['UAT signed off', 'Training delivered to affected staff', 'Data migration rehearsed', 'Support and runbooks handed over', 'Rollback plan agreed', 'Communications sent to customers and staff'])}`,
  ] },

  estimate: { title: 'Cost & Schedule Estimate', audience: 'Sponsor, delivery lead, finance', build: (p) => {
    const e = estimate(p);
    const d1 = (n) => (Math.round(n * 10) / 10).toString();
    return [
      header(p, 'Cost & Schedule Estimate', 'Expected effort, cost and finish date, with a confidence range, built from three-point estimates.'),
      `## 2. Summary\n${table(['Measure', 'Value'], [['Expected effort', `${d1(e.effort)} person-days (${Math.round(e.hours)} hours)`], ['Labour cost', money(p, e.labour)], [`Contingency (${Math.round(e.contingency * 100)}%)`, money(p, e.total - e.labour)], ['Total estimated cost', money(p, e.total)], ['Duration', `${e.durationDays} working days`], ['Start', e.startDate || 'Not set'], ['Estimated finish', e.endDate || 'Not set'], ['Target date', e.deadline || 'Not set']])}`,
      e.warnings.length ? `> **Check:** ${e.warnings.join('; ')}` : '',
      `## 3. Confidence range\nAssumes the work items are independent; uses the PERT standard deviation of each item.\n\n${table(['Confidence', 'Effort (days)', 'Cost'], [['50%', '50'], ['80%', '80'], ['90%', '90'], ['95%', '95']].map(([l, k]) => [l, d1(e.confidence[k].effort), money(p, e.confidence[k].cost)]))}`,
      `## 4. Schedule\n${mmd(D.schedule(p))}\n\n${table(['Phase', 'Effort (days)', 'Working days', 'Start', 'End', 'Labour cost'], e.phases.map((ph) => [ph.phase, d1(ph.effort), ph.days, ph.start, ph.end, money(p, ph.cost)]))}`,
      `## 5. Team and rates\n${table(['Role', 'Day rate', 'People'], p.rates.map((r) => [r.role, money(p, +r.dayRate || 0), r.fte || 1]))}`,
      `## 6. Work items\n${table(['ID', 'Work item', 'Phase', 'Role', 'Optimistic', 'Likely', 'Pessimistic', 'Expected', 'Cost'], e.items.map((w) => [w.code, w.item, w.phase, byId(p.rates, w.role)?.role || '', w.optimistic, w.likely, w.pessimistic, d1(w.expected), money(p, w.cost)]))}`,
      e.velocity ? `## 7. Agile forecast\n${e.openPoints} open story points at ${e.velocity} points per ${e.sprintWeeks}-week sprint = **${e.sprints} sprints**${e.agileEnd ? `, finishing about ${e.agileEnd}` : ''}.` : '',
      `## Method\n- Expected effort per item = (optimistic + 4 x most likely + pessimistic) / 6; standard deviation = (pessimistic - optimistic) / 6.\n- Phases run one after another; within a phase, roles work in parallel, so a phase lasts as long as its busiest role (effort / people).\n- Dates count working days only (${e.settings.workDays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}), skipping ${e.settings.holidays.length} listed holiday(s).`,
      signoff(p),
    ];
  } },

  glossary: { title: 'Glossary', audience: 'Everyone', build: (p) => [
    header(p, 'Glossary', 'Shared definitions of business terms, so everyone uses the same language.'),
    `## 2. Terms\n${table(['Term', 'Synonyms / acronym', 'Definition'], [...p.glossary].sort((a, b) => a.term.localeCompare(b.term)).map((g) => [g.term, g.synonyms, g.definition]))}`,
  ] },
};

function dtMarkdown(dt) {
  const conds = dt.conditions || [], acts = dt.actions || [];
  const rows = dt.rows || [];
  const split = (s) => String(s || '').split(',').map((x) => x.trim());
  return `### ${dt.code} ${dt.name}\n${table(['', ...rows.map((_, i) => `Rule ${i + 1}`)], [...conds.map((c, k) => [`**If** ${c}`, ...rows.map((r) => split(r.when)[k] || '-')]), ...acts.map((a, k) => [`**Then** ${a}`, ...rows.map((r) => split(r.then)[k] || '-')])])}${dt.notes ? `\n\n${dt.notes}` : ''}`;
}
export { dtMarkdown };

export const DOC_LIST = Object.entries(DOCS).map(([id, d]) => ({ id, title: d.title, audience: d.audience }));

export function buildDoc(p, id) {
  const d = DOCS[id];
  if (!d) return null;
  return { id, title: d.title, markdown: d.build(p).filter(Boolean).join('\n\n') + '\n' };
}
