// Data model: every BA artefact is a collection described by a schema.
// The generic editor, documents, diagrams and traceability all read these definitions.
import { esc, pill, autoPill } from './ui.js';

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}`;
/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date, a day off near midnight). */
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => isoDate();

export function nextCode(list, prefix, pad = 3) {
  let max = 0;
  for (const it of list || []) {
    const m = String(it.code || '').match(new RegExp(`^${prefix}-?(\\d+)$`));
    if (m) max = Math.max(max, +m[1]);
  }
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

// ---------- option lists ----------
export const MOSCOW = ['Must', 'Should', 'Could', "Won't"];
export const LHM = ['High', 'Medium', 'Low'];
export const REQ_TYPES = [
  { value: 'Business', label: 'Business (BR)', prefix: 'BR' },
  { value: 'Stakeholder', label: 'Stakeholder (SR)', prefix: 'SR' },
  { value: 'Functional', label: 'Functional (FR)', prefix: 'FR' },
  { value: 'Non-functional', label: 'Non-functional (NFR)', prefix: 'NFR' },
  { value: 'Data', label: 'Data (DR)', prefix: 'DR' },
  { value: 'Interface', label: 'Interface (IR)', prefix: 'IR' },
  { value: 'Transition', label: 'Transition (TR)', prefix: 'TR' },
];
export const NFR_CATS = ['Performance', 'Availability', 'Security', 'Privacy', 'Usability', 'Accessibility', 'Scalability', 'Reliability', 'Maintainability', 'Compliance', 'Auditability', 'AI governance'];
export const TEST_LEVELS = ['Unit', 'System (ST)', 'Integration (SIT)', 'User acceptance (UAT)', 'Regression', 'Performance'];
export const LAYERS = ['Presentation (UI)', 'Business logic / services', 'Integration / middleware', 'Data', 'External system'];
export const CONTROLS = ['Text', 'Number', 'Currency', 'Date', 'Dropdown', 'Radio buttons', 'Checkbox', 'Text area', 'Email', 'Phone', 'File upload', 'Read-only', 'Button'];
export const REQ_STATUS = ['Draft', 'Proposed', 'Approved', 'Implemented', 'Rejected'];
export const STORY_STATUS = ['Backlog', 'Ready', 'In progress', 'In review', 'Done'];
export const ELICIT_TYPES = ['Interview', 'Workshop', 'Survey', 'Observation', 'Document analysis', 'Focus group', 'Brainstorming', 'Prototype review', 'Demo'];
export const ATTITUDES = ['Champion', 'Supporter', 'Neutral', 'Critic', 'Blocker'];
export const STEP_KINDS = ['start', 'task', 'decision', 'fork', 'join', 'timer', 'message', 'subprocess', 'end'];
export const FIELD_TYPES = ['string', 'text', 'int', 'decimal', 'boolean', 'date', 'datetime', 'uuid', 'email', 'enum', 'json'];
export const CARDS = ['one-to-one', 'one-to-many', 'many-to-many', 'zero-or-one-to-many', 'one-to-one-or-more', 'one-to-zero-or-one'];
export const REL_KINDS = ['association', 'aggregation', 'composition', 'generalisation'];
export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const RAID_TYPES = ['Risk', 'Assumption', 'Issue', 'Dependency'];
export const CR_STATUS = ['Proposed', 'Under review', 'Approved', 'Rejected', 'Implemented'];
export const TEST_STATUS = ['Not run', 'Passed', 'Failed', 'Blocked'];

// ---------- lookups for selects ----------
const o = {
  stakeholders: (p) => p.stakeholders.map((s) => ({ value: s.id, label: s.name })),
  personas: (p) => p.personas.map((s) => ({ value: s.id, label: s.name })),
  objectives: (p) => p.objectives.map((x) => ({ value: x.id, label: `${x.code} ${x.title}` })),
  requirements: (p) => p.requirements.map((x) => ({ value: x.id, label: `${x.code} ${x.title}` })),
  stories: (p) => p.stories.map((x) => ({ value: x.id, label: `${x.code} ${x.iWant || ''}`.slice(0, 60) })),
  entities: (p) => p.entities.map((x) => ({ value: x.id, label: x.name })),
  entityNames: (p) => p.entities.map((x) => x.name),
  releases: (p) => p.releases.map((x) => ({ value: x.id, label: x.name })),
  epics: (p) => [...new Set(p.stories.map((s) => s.epic).filter(Boolean))],
  rates: (p) => p.rates.map((x) => ({ value: x.id, label: `${x.role} (${x.dayRate || 0}/day)` })),
  attributes: (p) => p.entities.flatMap((e) => (e.fields || []).filter((f) => f.name).map((f) => `${e.name}.${f.name}`)),
  apis: (p) => p.apis.map((x) => ({ value: x.id, label: `${x.method} ${x.path}` })),
  usecases: (p) => p.usecases.map((x) => ({ value: x.id, label: `${x.code} ${x.name}` })),
  tests: (p) => p.tests.map((x) => ({ value: x.id, label: `${x.code} ${x.title}` })),
  components: (p) => p.components.map((x) => ({ value: x.id, label: x.name })),
};
export const lookup = o;

export const byId = (list, id) => (list || []).find((x) => x.id === id);
export const nameOf = (list, id) => byId(list, id)?.name || '';
const codes = (list, ids) => (ids || []).map((id) => byId(list, id)?.code).filter(Boolean);
const cut = (s, n = 80) => {
  const t = String(s || '');
  return t ? esc(t.length > n ? `${t.slice(0, n - 1)}…` : t) : '<span class="muted">—</span>';
};
const b = (s) => `<b>${esc(s || '')}</b>`;
const codePills = (list, ids) => codes(list, ids).map((c) => pill(c)).join(' ') || '<span class="muted">—</span>';

// ---------- analysis helpers ----------
export const riskScore = (r) => (+r.likelihood || 0) * (+r.impact || 0);
export const riskLevel = (r) => (riskScore(r) >= 15 ? 'High' : riskScore(r) >= 8 ? 'Medium' : 'Low');
export const rice = (s) => (+s.effort ? Math.round(((+s.reach || 0) * (+s.impact || 0) * ((+s.confidence || 0) / 100)) / +s.effort * 10) / 10 : 0);
export const wsjf = (s) => (+s.jobSize ? Math.round((((+s.bv || 0) + (+s.tc || 0) + (+s.rr || 0)) / +s.jobSize) * 10) / 10 : 0);
export const storyText = (p, s) => `As a ${nameOf(p.personas, s.asA) || 'user'}, I want ${s.iWant || '…'}${s.soThat ? `, so that ${s.soThat}` : ''}.`;

const AMBIGUOUS = ['fast', 'quick', 'quickly', 'easy', 'easily', 'simple', 'user-friendly', 'user friendly', 'intuitive', 'seamless', 'flexible', 'robust', 'efficient', 'adequate', 'appropriate', 'as needed', 'if possible', 'etc', 'and/or', 'some', 'several', 'many', 'few', 'minimal', 'optimal', 'approximately', 'tbd', 'tbc', 'normally', 'usually', 'reasonable', 'sufficient', 'modern', 'better', 'improved', 'best', 'acceptable', 'rapid', 'rapidly', 'timely', 'promptly', 'as soon as possible', 'asap', 'state-of-the-art', 'and so on'];
const AMB_RE = new RegExp(`\\b(${AMBIGUOUS.map((w) => w.replace(/[/-]/g, '\\$&')).join('|')})\\b`, 'gi');

/** Requirement quality checks (IEEE 29148 style). Returns a list of problems. */
export function lintRequirement(r, p) {
  const out = [];
  const st = String(r.statement || '');
  const words = [...new Set((st.match(AMB_RE) || []).map((w) => w.toLowerCase()))];
  if (words.length) out.push(`Ambiguous wording: ${words.join(', ')} — replace with an exact number or behaviour`);
  if (st && !/\b(shall|must)\b/i.test(st) && ['Functional', 'Non-functional', 'Data', 'Interface'].includes(r.type)) out.push('Use "shall" or "must" for a binding statement');
  if ((st.match(/\band\b/gi) || []).length >= 3) out.push('May contain several requirements (3 or more "and") — split it into separate requirements');
  if (!st.trim()) out.push('No statement');
  if (r.type === 'Non-functional' && !/\d/.test(`${st} ${r.metric || ''}`)) out.push('NFR has no measurable target — add a number to the statement or the metric');
  if (['Functional', 'Non-functional'].includes(r.type) && !(r.acceptance || []).length) out.push('No acceptance criteria — add a Given / When / Then scenario');
  if (!r.source) out.push('No source stakeholder — choose who asked for it');
  if (r.type !== 'Business' && !(r.objectiveIds || []).length && p.objectives.length) out.push('Not traced to an objective — choose one under "Supports objectives"');
  return out;
}

/** API specification checks: what a developer needs to build it without guessing. */
export function lintApi(a, p) {
  const out = [];
  const codes = (a.codes || []).map((c) => String(c.code));
  if (!a.summary) out.push('No summary');
  if (!codes.some((c) => /^2/.test(c))) out.push('No success response code (2xx)');
  if (!codes.some((c) => /^4/.test(c))) out.push('No client error codes (4xx) — what does a caller get when input is wrong?');
  if (a.method === 'POST' && !codes.includes('201') && !codes.includes('200') && !codes.includes('202')) out.push('POST should return 201 Created (or 200 / 202)');
  if (['POST', 'PUT', 'PATCH'].includes(a.method) && !a.request && !a.entity) out.push('No request body example or resource entity');
  if (!a.auth) out.push('Security not specified');
  const inPath = [...String(a.path || '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const declared = (a.params || []).filter((x) => x.in === 'path').map((x) => x.name);
  for (const n of inPath) if (!declared.includes(n)) out.push(`Path parameter {${n}} is not described`);
  if (['POST', 'PATCH'].includes(a.method) && !a.idempotent && !/idempot|retry|duplicate/i.test(a.failure || '')) out.push('Say what happens on a retry: could a repeated request create a duplicate?');
  if (!a.failure && !codes.includes('500') && !codes.includes('503')) out.push('No failure handling (timeouts, server errors, what the user sees)');
  if (!(a.requirementIds || []).length && p.requirements.length) out.push('Not linked to a requirement');
  return out;
}

/** Data mapping checks for a screen. */
export function mappingIssues(scr, p) {
  const out = [];
  const known = new Set(p.entities.flatMap((e) => (e.fields || []).map((f) => `${e.name}.${f.name}`)));
  const attr = (ref) => { const [en, fn] = String(ref).split('.'); return (p.entities.find((e) => e.name === en)?.fields || []).find((f) => f.name === fn); };
  for (const f of scr.fields || []) {
    if (f.control === 'Button' || f.control === 'Read-only') continue;
    const label = f.label || 'Unnamed field';
    if (!f.mapsTo) { out.push(`${label}: not mapped to where it is stored`); continue; }
    if (!known.has(f.mapsTo)) { out.push(`${label}: ${f.mapsTo} no longer exists in the data model`); continue; }
    const a = attr(f.mapsTo);
    if (a?.required && !f.required) out.push(`${label}: stored in a required attribute (${f.mapsTo}) but optional on screen`);
    const numeric = ['Number', 'Currency'].includes(f.control), isNum = ['int', 'decimal'].includes(a?.type);
    if (numeric !== isNum && a?.type && !['enum', 'uuid'].includes(a.type) && f.control !== 'Dropdown') out.push(`${label}: ${f.control} control but ${f.mapsTo} is ${a.type}`);
    if (f.control === 'Date' && a && !['date', 'datetime'].includes(a.type)) out.push(`${label}: Date control but ${f.mapsTo} is ${a.type}`);
  }
  if ((scr.fields || []).length && !(scr.fields || []).some((f) => f.control === 'Button')) out.push('No action button (how does the user submit?)');
  return out;
}

/** Non-blocking suggestions that make a requirement easier to build and test. */
export function suggestRequirement(r) {
  const out = [];
  const ac = r.acceptance || [];
  const text = ac.map((a) => `${a.given} ${a.when} ${a.then}`).join(' ').toLowerCase();
  if (r.type === 'Functional' && ac.length && !/(invalid|error|fail|reject|not |missing|unavailable|timeout|declin|exceed|duplicate|already|wrong|blank|empty|cancel)/.test(text)) out.push('Add an unhappy-path scenario: what should happen when the input is wrong, a rule is broken or a service is unavailable?');
  if (r.type === 'Functional' && /\b(send|notify|email|sms|confirm)/i.test(r.statement || '') && !/fail|not deliver|bounce/.test(text)) out.push('If the notification cannot be delivered, does the main action still succeed? Say what the user sees.');
  if (/\b(update|edit|change)\b/i.test(r.statement || '') && !/which|field/i.test(`${r.statement} ${text}`)) out.push('Which fields can be changed, and do any changes need verification?');
  return out;
}

/** Business case maths: NPV, ROI, payback year. */
export function businessCase(p) {
  const rate = (+p.businessCase.discountRate || 0) / 100;
  const years = Math.max(1, Math.min(10, Math.round(+p.businessCase.years || 5)));
  const rows = [];
  let cum = 0, cumPv = 0, npv = 0, totalCost = 0, totalBen = 0, payback = null, paybackExact = null, discountedPayback = null;
  for (let y = 0; y <= years; y++) {
    const cost = p.financials.filter((f) => f.kind === 'Cost' && +f.year === y).reduce((a, f) => a + (+f.amount || 0), 0);
    const ben = p.financials.filter((f) => f.kind === 'Benefit' && +f.year === y).reduce((a, f) => a + (+f.amount || 0), 0);
    const net = ben - cost;
    const df = 1 / Math.pow(1 + rate, y);
    const prev = cum, prevPv = cumPv;
    cum += net;
    cumPv += net * df;
    npv += net * df;
    totalCost += cost;
    totalBen += ben;
    if (payback === null && cum >= 0 && totalBen > 0) {
      payback = y;
      // linear interpolation inside the year the cumulative cash flow turns positive
      paybackExact = prev < 0 && net > 0 ? y - 1 + -prev / net : y;
    }
    if (discountedPayback === null && cumPv >= 0 && totalBen > 0) discountedPayback = prevPv < 0 && net * df > 0 ? y - 1 + -prevPv / (net * df) : y;
    rows.push({ year: y, cost, ben, net, df, pv: net * df, cum, cumPv });
  }
  const outside = p.financials.filter((f) => !(+f.year >= 0 && +f.year <= years && Number.isInteger(+f.year)));
  const roi = totalCost ? ((totalBen - totalCost) / totalCost) * 100 : 0;
  return { rows, npv, roi, totalCost, totalBen, payback, paybackExact, discountedPayback, irr: irr(rows.map((r) => r.net)), rate, years, outside };
}

/** Internal rate of return: the discount rate where NPV = 0. null when it does not exist. */
export function irr(flows) {
  const npvAt = (r) => flows.reduce((a, f, t) => a + f / Math.pow(1 + r, t), 0);
  if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) return null;
  let lo = -0.99, hi = 10;
  let fLo = npvAt(lo);
  if (fLo * npvAt(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2, fm = npvAt(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (fLo * fm < 0) hi = mid;
    else (lo = mid, fLo = fm);
  }
  return (lo + hi) / 2;
}

/** PERT expected days for one work item (same formula as js/estimate.js). */
export function pertDays(x) {
  let a = +x.optimistic || 0, m = +x.likely || 0, c = +x.pessimistic || 0;
  if (!m) m = a || c;
  if (!a) a = m;
  if (!c) c = m;
  return (Math.min(a, m, c) + 4 * m + Math.max(a, m, c)) / 6;
}

// ---------- collection schemas ----------
// Each: title, singular, prefix (auto code), fields (form), cols (table), defaults.
const acceptanceRows = { key: 'acceptance', label: 'Acceptance criteria (Given / When / Then)', type: 'rows', add: 'Add scenario', cols: [{ key: 'given', label: 'Given', type: 'textarea' }, { key: 'when', label: 'When', type: 'textarea' }, { key: 'then', label: 'Then', type: 'textarea' }] };

export const COLLECTIONS = {
  objectives: {
    title: 'Business objectives', singular: 'objective', prefix: 'OBJ', pad: 2,
    intro: 'SMART objectives the initiative must achieve. Every requirement should trace to one.',
    fields: [
      { key: 'code', label: 'ID', req: true }, { key: 'title', label: 'Objective', req: true },
      { key: 'kpi', label: 'KPI / measure', req: true }, { key: 'baseline', label: 'Baseline' },
      { key: 'target', label: 'Target', req: true, help: 'Include a number' }, { key: 'due', label: 'Achieve by', type: 'date' },
    ],
    cols: [['ID', (x) => b(x.code)], ['Objective', (x) => b(x.title)], ['KPI', (x) => cut(x.kpi)], ['Baseline → target', (x) => `${cut(x.baseline, 30)} → ${cut(x.target, 30)}`], ['Requirements', (x, p) => String(p.requirements.filter((r) => (r.objectiveIds || []).includes(x.id)).length)]],
  },
  swot: {
    title: 'SWOT analysis', singular: 'SWOT item',
    fields: [{ key: 'category', label: 'Category', type: 'select', options: ['Strength', 'Weakness', 'Opportunity', 'Threat'], req: true, blank: false }, { key: 'text', label: 'Description', type: 'textarea', req: true }],
    cols: [['Category', (x) => autoPill(x.category)], ['Item', (x) => cut(x.text, 140)]],
    defaults: () => ({ category: 'Strength' }),
  },
  pestle: {
    title: 'PESTLE analysis', singular: 'PESTLE factor',
    fields: [{ key: 'factor', label: 'Factor', type: 'select', options: ['Political', 'Economic', 'Social', 'Technological', 'Legal', 'Environmental'], req: true, blank: false }, { key: 'impact', label: 'Impact', type: 'select', options: LHM }, { key: 'text', label: 'Description', type: 'textarea', req: true }, { key: 'response', label: 'Response / implication', type: 'textarea' }],
    cols: [['Factor', (x) => b(x.factor)], ['Description', (x) => cut(x.text, 110)], ['Impact', (x) => autoPill(x.impact)], ['Response', (x) => cut(x.response, 70)]],
    defaults: () => ({ factor: 'Political', impact: 'Medium' }),
  },
  gaps: {
    title: 'Gap analysis', singular: 'gap', prefix: 'GAP', pad: 2,
    intro: 'Compare the current state (as-is) with the future state (to-be) and decide how to close each gap.',
    fields: [{ key: 'code', label: 'ID' }, { key: 'area', label: 'Capability / area', req: true }, { key: 'asIs', label: 'Current state (as-is)', type: 'textarea', req: true }, { key: 'toBe', label: 'Future state (to-be)', type: 'textarea', req: true }, { key: 'gap', label: 'Gap', type: 'textarea' }, { key: 'action', label: 'Action to close the gap', type: 'textarea' }, { key: 'priority', label: 'Priority', type: 'select', options: LHM }, { key: 'requirementIds', label: 'Addressed by requirements', type: 'multi', options: o.requirements }],
    cols: [['ID', (x) => b(x.code)], ['Area', (x) => b(x.area)], ['As-is', (x) => cut(x.asIs, 60)], ['To-be', (x) => cut(x.toBe, 60)], ['Action', (x) => cut(x.action, 60)], ['Priority', (x) => autoPill(x.priority)]],
  },
  financials: {
    title: 'Costs & benefits', singular: 'cost or benefit',
    fields: [{ key: 'kind', label: 'Type', type: 'select', options: ['Cost', 'Benefit'], blank: false }, { key: 'year', label: 'Year (0 = now)', type: 'number', min: 0, max: 10, req: true }, { key: 'item', label: 'Item', req: true }, { key: 'category', label: 'Category', type: 'select', options: ['Capex', 'Opex', 'People', 'Licences', 'Revenue', 'Cost saving', 'Cost avoidance', 'Other'] }, { key: 'amount', label: 'Amount', type: 'number', req: true }, { key: 'notes', label: 'Assumptions', type: 'textarea' }],
    cols: [['Type', (x) => pill(x.kind, x.kind === 'Cost' ? 'err' : 'ok')], ['Year', (x) => String(x.year)], ['Item', (x) => b(x.item)], ['Category', (x) => cut(x.category, 20)], ['Amount', (x) => Number(x.amount || 0).toLocaleString(), 'num']],
    defaults: () => ({ kind: 'Cost', year: 0 }),
  },
  stakeholders: {
    title: 'Stakeholder register', singular: 'stakeholder',
    fields: [
      { key: 'name', label: 'Name', req: true }, { key: 'role', label: 'Role / title', req: true }, { key: 'org', label: 'Organisation / team' }, { key: 'email', label: 'Contact' },
      { key: 'power', label: 'Power / influence', type: 'select', options: LHM }, { key: 'interest', label: 'Interest', type: 'select', options: LHM },
      { key: 'attitude', label: 'Attitude', type: 'select', options: ATTITUDES }, { key: 'raci', label: 'RACI (overall)', type: 'select', options: ['R', 'A', 'C', 'I'] },
      { key: 'comms', label: 'Communication method', ph: 'e.g. Weekly status email' }, { key: 'approver', label: 'Sign-off', type: 'check', text: 'Approves deliverables' },
      { key: 'concerns', label: 'Needs & concerns', type: 'textarea' },
    ],
    cols: [['Name', (x) => `${b(x.name)}<div class="muted small">${esc(x.role || '')}</div>`], ['Organisation', (x) => cut(x.org, 30)], ['Power / interest', (x) => `${autoPill(x.power)} ${autoPill(x.interest)}`], ['Attitude', (x) => pill(x.attitude, { Champion: 'ok', Supporter: 'ok', Critic: 'warn', Blocker: 'err' }[x.attitude] || '')], ['RACI', (x) => pill(x.raci)], ['Sign-off', (x) => (x.approver ? pill('Approver', 'ok') : '')]],
    defaults: () => ({ power: 'Medium', interest: 'Medium', attitude: 'Neutral', raci: 'C' }),
  },
  personas: {
    title: 'Personas & actors', singular: 'persona',
    intro: 'The kinds of users (and external systems) that interact with the solution.',
    fields: [{ key: 'name', label: 'Name', req: true, ph: 'e.g. Loan applicant' }, { key: 'kind', label: 'Kind', type: 'select', options: ['Human', 'System'], blank: false }, { key: 'parent', label: 'Is a kind of (generalisation)', type: 'select', options: o.personas, help: 'e.g. Super admin is a kind of Admin: it inherits all of Admin\'s use cases' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'goals', label: 'Goals', type: 'list' }, { key: 'pains', label: 'Pain points', type: 'list' }],
    cols: [['Persona', (x) => b(x.name)], ['Kind', (x) => pill(x.kind)], ['Description', (x) => cut(x.description, 100)], ['Stories', (x, p) => String(p.stories.filter((s) => s.asA === x.id).length)]],
    defaults: () => ({ kind: 'Human', goals: [], pains: [] }),
  },
  elicitation: {
    title: 'Elicitation sessions', singular: 'session', prefix: 'EL', pad: 2,
    intro: 'Interviews, workshops and other sessions — with notes, outcomes and actions. Generates meeting minutes.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'date', label: 'Date', type: 'date', req: true }, { key: 'technique', label: 'Technique', type: 'select', options: ELICIT_TYPES, req: true }, { key: 'title', label: 'Title / topic', req: true },
      { key: 'participants', label: 'Participants', type: 'multi', options: o.stakeholders }, { key: 'agenda', label: 'Agenda', type: 'list' },
      { key: 'notes', label: 'Notes', type: 'textarea', rows: 6 }, { key: 'outcomes', label: 'Key outcomes / findings', type: 'list' },
      { key: 'actions', label: 'Actions', type: 'rows', add: 'Add action', cols: [{ key: 'action', label: 'Action', w: '2fr' }, { key: 'owner', label: 'Owner', type: 'select', options: o.stakeholders }, { key: 'due', label: 'Due (YYYY-MM-DD)' }, { key: 'done', label: 'Done', type: 'check', w: '50px' }] },
    ],
    cols: [['ID', (x) => b(x.code)], ['Date', (x) => esc(x.date)], ['Technique', (x) => pill(x.technique, 'info')], ['Topic', (x) => b(x.title)], ['Participants', (x) => String((x.participants || []).length)], ['Open actions', (x) => String((x.actions || []).filter((a) => !a.done).length)]],
    defaults: () => ({ date: today(), technique: 'Interview', participants: [], agenda: [], outcomes: [], actions: [] }),
  },
  questions: {
    title: 'Open questions', singular: 'question', prefix: 'Q', pad: 2,
    fields: [{ key: 'code', label: 'ID' }, { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Answered'], blank: false }, { key: 'question', label: 'Question', type: 'textarea', req: true }, { key: 'askedOf', label: 'Asked of', type: 'select', options: o.stakeholders }, { key: 'due', label: 'Due', type: 'date' }, { key: 'answer', label: 'Answer', type: 'textarea' }],
    cols: [['ID', (x) => b(x.code)], ['Question', (x) => cut(x.question, 110)], ['Asked of', (x, p) => cut(nameOf(p.stakeholders, x.askedOf), 30)], ['Due', (x) => esc(x.due || '—')], ['Status', (x) => autoPill(x.status)]],
    defaults: () => ({ status: 'Open' }),
  },
  requirements: {
    title: 'Requirements', singular: 'requirement', codeFrom: (x) => REQ_TYPES.find((t) => t.value === x.type)?.prefix || 'REQ',
    intro: 'Business, stakeholder, solution (functional / non-functional) and transition requirements per BABOK. Each is checked for quality as you write.',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: REQ_TYPES, blank: false, req: true }, { key: 'code', label: 'ID', help: 'Leave blank to number automatically' },
      { key: 'title', label: 'Title', req: true, full: true, ph: 'Short name, starting with a verb' },
      { key: 'statement', label: 'Requirement statement', type: 'textarea', req: true, ph: 'The system shall …' },
      { key: 'rationale', label: 'Rationale (why)', type: 'textarea', rows: 2 },
      { key: 'category', label: 'NFR category', type: 'select', options: NFR_CATS }, { key: 'metric', label: 'Metric & target (NFR)', ph: 'e.g. p95 < 2 s' },
      { key: 'priority', label: 'Priority (MoSCoW)', type: 'select', options: MOSCOW, req: true }, { key: 'status', label: 'Status', type: 'select', options: REQ_STATUS, blank: false },
      { key: 'source', label: 'Source stakeholder', type: 'select', options: o.stakeholders }, { key: 'release', label: 'Release', type: 'select', options: o.releases },
      { key: 'objectiveIds', label: 'Supports objectives', type: 'multi', options: o.objectives },
      { key: 'parentIds', label: 'Derived from (parent requirements)', type: 'multi', options: o.requirements },
      acceptanceRows,
    ],
    cols: [['ID', (x) => b(x.code)], ['Requirement', (x) => `${b(x.title)}<div class="muted small">${cut(x.statement, 110)}</div>`], ['Type', (x) => pill(x.type)], ['Priority', (x) => autoPill(x.priority)], ['Status', (x) => autoPill(x.status)], ['Quality', (x, p) => { const l = lintRequirement(x, p); return l.length ? `<span class="pill warn" title="${esc(l.join('\n'))}">${l.length} issue${l.length > 1 ? 's' : ''}</span>` : pill('OK', 'ok'); }]],
    defaults: () => ({ type: 'Functional', status: 'Draft', priority: 'Should', objectiveIds: [], parentIds: [], acceptance: [], statement: 'The system shall ' }),
    filters: { type: REQ_TYPES.map((t) => t.value), priority: MOSCOW, status: REQ_STATUS },
  },
  stories: {
    title: 'User stories', singular: 'user story', prefix: 'US',
    intro: 'Backlog items in "As a / I want / so that" form, with acceptance criteria, estimates and prioritisation scores.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'epic', label: 'Epic / feature', ph: 'e.g. Apply online' },
      { key: 'asA', label: 'As a (persona)', type: 'select', options: o.personas, req: true }, { key: 'status', label: 'Status', type: 'select', options: STORY_STATUS, blank: false },
      { key: 'iWant', label: 'I want…', req: true, full: true }, { key: 'soThat', label: '…so that', full: true },
      { key: 'points', label: 'Story points', type: 'select', options: ['1', '2', '3', '5', '8', '13', '21'] }, { key: 'priority', label: 'Priority', type: 'select', options: MOSCOW },
      { key: 'release', label: 'Release / sprint', type: 'select', options: o.releases }, { key: 'requirementIds', label: 'Implements requirements', type: 'multi', options: o.requirements },
      acceptanceRows,
      { key: 'reach', label: 'RICE · Reach (users / quarter)', type: 'number' }, { key: 'impact', label: 'RICE · Impact (0.25–3)', type: 'number' },
      { key: 'confidence', label: 'RICE · Confidence %', type: 'number' }, { key: 'effort', label: 'RICE · Effort (person-weeks)', type: 'number' },
      { key: 'bv', label: 'WSJF · Business value (1–20)', type: 'number' }, { key: 'tc', label: 'WSJF · Time criticality (1–20)', type: 'number' },
      { key: 'rr', label: 'WSJF · Risk reduction (1–20)', type: 'number' }, { key: 'jobSize', label: 'WSJF · Job size (1–20)', type: 'number' },
    ],
    cols: [['ID', (x) => b(x.code)], ['Story', (x, p) => `<div class="muted small">${esc(x.epic || '')}</div>${esc(storyText(p, x))}`], ['Pts', (x) => esc(x.points || '—')], ['Priority', (x) => autoPill(x.priority)], ['Status', (x) => autoPill(x.status)], ['AC', (x) => pill(String((x.acceptance || []).length), (x.acceptance || []).length ? 'ok' : 'err')]],
    defaults: () => ({ status: 'Backlog', priority: 'Should', requirementIds: [], acceptance: [], confidence: 80 }),
    filters: { status: STORY_STATUS, priority: MOSCOW },
  },
  usecases: {
    title: 'Use cases', singular: 'use case', prefix: 'UC', pad: 2,
    intro: 'Fully dressed use case specifications (Cockburn style). Generates the use case diagram and specification document.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'name', label: 'Use case name', req: true, ph: 'Verb + noun, e.g. Submit application' },
      { key: 'primary', label: 'Primary actor', type: 'select', options: o.personas, req: true }, { key: 'level', label: 'Level', type: 'select', options: ['User goal', 'Summary', 'Sub-function'] },
      { key: 'secondary', label: 'Supporting actors', type: 'multi', options: o.personas },
      { key: 'goal', label: 'Goal in context', type: 'textarea', rows: 2 }, { key: 'trigger', label: 'Trigger' }, { key: 'pre', label: 'Preconditions', type: 'list', rows: 2 },
      { key: 'main', label: 'Main success scenario (one step per line)', type: 'list', rows: 6 },
      { key: 'alt', label: 'Alternative flows (e.g. "3a. If … then …")', type: 'list', rows: 3 }, { key: 'exceptions', label: 'Exception flows', type: 'list', rows: 3 },
      { key: 'post', label: 'Postconditions (success guarantee)', type: 'list', rows: 2 },
      { key: 'includes', label: '«include» — always performs these use cases', type: 'multi', options: (p) => p.usecases.map((u) => ({ value: u.id, label: `${u.code} ${u.name}` })) },
      { key: 'extends', label: '«extend» — optionally adds to these use cases', type: 'multi', options: (p) => p.usecases.map((u) => ({ value: u.id, label: `${u.code} ${u.name}` })) },
      { key: 'requirementIds', label: 'Related requirements', type: 'multi', options: o.requirements },
    ],
    cols: [['ID', (x) => b(x.code)], ['Use case', (x) => b(x.name)], ['Primary actor', (x, p) => cut(nameOf(p.personas, x.primary), 30)], ['Steps', (x) => String((x.main || []).length)], ['Alt / exc.', (x) => `${(x.alt || []).length} / ${(x.exceptions || []).length}`]],
    defaults: () => ({ level: 'User goal', secondary: [], pre: [], main: [], alt: [], exceptions: [], post: [], includes: [], extends: [], requirementIds: [] }),
  },
  rules: {
    title: 'Business rules', singular: 'business rule', prefix: 'RULE', pad: 2,
    fields: [{ key: 'code', label: 'ID' }, { key: 'name', label: 'Name', req: true }, { key: 'kind', label: 'Kind', type: 'select', options: ['Constraint', 'Computation', 'Inference', 'Action enabler', 'Fact'] }, { key: 'decidedBy', label: 'Decided by', type: 'select', options: ['System (fully automated)', 'AI recommends, a person approves', 'AI decides (with monitoring)', 'Person (manual)'], help: 'Where AI is involved, say who is accountable and when a person must approve' }, { key: 'owner', label: 'Rule owner', type: 'select', options: o.stakeholders }, { key: 'statement', label: 'Rule statement', type: 'textarea', req: true }, { key: 'requirementIds', label: 'Enforced by requirements', type: 'multi', options: o.requirements }],
    cols: [['ID', (x) => b(x.code)], ['Rule', (x) => `${b(x.name)}<div class="muted small">${cut(x.statement, 120)}</div>`], ['Kind', (x) => pill(x.kind)], ['Requirements', (x, p) => codePills(p.requirements, x.requirementIds)]],
    defaults: () => ({ kind: 'Constraint', requirementIds: [] }),
  },
  decisionTables: {
    title: 'Decision tables', singular: 'decision table', prefix: 'DT', pad: 2,
    intro: 'Model complex conditional logic. Enter conditions and actions, then one rule per row with values in the same order (Y / N / - or values).',
    fields: [{ key: 'code', label: 'ID' }, { key: 'name', label: 'Name', req: true }, { key: 'conditions', label: 'Conditions (one per line)', type: 'list', rows: 3 }, { key: 'actions', label: 'Actions / outcomes (one per line)', type: 'list', rows: 3 }, { key: 'rows', label: 'Rules', type: 'rows', add: 'Add rule', cols: [{ key: 'when', label: 'Condition values, comma separated', w: '1.4fr', ph: 'Y, N, -' }, { key: 'then', label: 'Action values, comma separated', ph: 'X, -' }] }, { key: 'notes', label: 'Notes', type: 'textarea' }],
    cols: [['ID', (x) => b(x.code)], ['Name', (x) => b(x.name)], ['Conditions', (x) => String((x.conditions || []).length)], ['Actions', (x) => String((x.actions || []).length)], ['Rules', (x) => String((x.rows || []).length)]],
    defaults: () => ({ conditions: [], actions: [], rows: [] }),
  },
  tests: {
    title: 'Test cases (SIT / UAT)', singular: 'test case', prefix: 'TC',
    fields: [{ key: 'code', label: 'ID' }, { key: 'title', label: 'Title', req: true }, { key: 'level', label: 'Test level', type: 'select', options: TEST_LEVELS, help: 'SIT tests the systems working together; UAT is the business confirming it meets their needs' }, { key: 'requirementIds', label: 'Verifies requirements', type: 'multi', options: o.requirements }, { key: 'storyIds', label: 'Verifies stories', type: 'multi', options: o.stories }, { key: 'pre', label: 'Preconditions', type: 'textarea', rows: 2 }, { key: 'steps', label: 'Steps (one per line)', type: 'list' }, { key: 'expected', label: 'Expected result', type: 'textarea' }, { key: 'status', label: 'Status', type: 'select', options: TEST_STATUS, blank: false }, { key: 'tester', label: 'Tester', type: 'select', options: o.stakeholders }, { key: 'actual', label: 'Actual result / defect ref', type: 'textarea', rows: 2 }],
    cols: [['ID', (x) => b(x.code)], ['Test', (x) => b(x.title)], ['Verifies', (x, p) => codePills(p.requirements, x.requirementIds)], ['Level', (x) => pill((/\((\w+)\)/.exec(x.level || '') || [])[1] || x.level || '—')], ['Steps', (x) => String((x.steps || []).length)], ['Status', (x) => autoPill(x.status)], ['Defects', (x, p) => codePills(p.defects, p.defects.filter((d) => d.testId === x.id).map((d) => d.id))]],
    defaults: () => ({ status: 'Not run', level: 'User acceptance (UAT)', requirementIds: [], storyIds: [], steps: [] }),
    filters: { status: TEST_STATUS, level: TEST_LEVELS },
  },
  processes: {
    title: 'Process models', singular: 'process',
    intro: 'Map as-is and to-be processes step by step with swimlanes. Generates BPMN-style flow diagrams.',
    fields: [
      { key: 'name', label: 'Process name', req: true }, { key: 'state', label: 'State', type: 'select', options: ['As-is', 'To-be'], blank: false },
      { key: 'owner', label: 'Process owner', type: 'select', options: o.stakeholders }, { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'steps', label: 'Steps (leave "Next" blank to continue to the row below)', type: 'rows', add: 'Add step', cols: [
        { key: 'id', label: 'Step', w: '60px', ph: 'S1' }, { key: 'kind', label: 'Kind', type: 'select', options: STEP_KINDS, w: '110px' }, { key: 'label', label: 'Description', w: '1.6fr' },
        { key: 'lane', label: 'Lane (who)', w: '1fr', ph: 'e.g. Applicant' }, { key: 'next', label: 'Next', w: '70px' }, { key: 'yes', label: 'If yes', w: '70px' }, { key: 'no', label: 'If no', w: '70px' }, { key: 'pain', label: 'Pain point / note', w: '1fr' }],
        newRow: (rows) => ({ id: `S${rows.length + 1}`, kind: rows.length ? 'task' : 'start' }) },
    ],
    cols: [['Process', (x) => `${b(x.name)}<div class="muted small">${cut(x.description, 90)}</div>`], ['State', (x) => pill(x.state, x.state === 'To-be' ? 'ok' : 'warn')], ['Steps', (x) => String((x.steps || []).length)], ['Lanes', (x) => cut([...new Set((x.steps || []).map((s) => s.lane).filter(Boolean))].join(', '), 50)]],
    defaults: () => ({ state: 'As-is', steps: [{ id: 'S1', kind: 'start', label: 'Start' }] }),
  },
  entities: {
    title: 'Data entities', singular: 'entity',
    intro: 'Logical data model. Generates the ERD, class diagram, data dictionary and SQL DDL.',
    fields: [
      { key: 'name', label: 'Entity (singular, PascalCase)', req: true }, { key: 'owner', label: 'Data owner', type: 'select', options: o.stakeholders },
      { key: 'area', label: 'Area / subject (optional)', ph: 'e.g. Customer, Lending, Payments', help: 'Big data models are drawn one area per diagram' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2 }, { key: 'classification', label: 'Classification', type: 'select', options: ['Public', 'Internal', 'Confidential', 'Personal (PII)', 'Sensitive'] }, { key: 'retention', label: 'Retention', ph: 'e.g. 7 years' },
      { key: 'operations', label: 'Operations (optional, one per line, e.g. submit(), approve(reason))', type: 'list', rows: 2 },
      { key: 'fields', label: 'Attributes', type: 'rows', add: 'Add attribute', cols: [{ key: 'name', label: 'Name' }, { key: 'type', label: 'Type', type: 'select', options: FIELD_TYPES, w: '110px' }, { key: 'pk', label: 'PK', type: 'check', w: '36px' }, { key: 'required', label: 'Req', type: 'check', w: '36px' }, { key: 'unique', label: 'Uniq', type: 'check', w: '40px' }, { key: 'fk', label: 'References', type: 'select', options: o.entityNames, w: '130px' }, { key: 'desc', label: 'Description / validation', w: '1.4fr' }],
        newRow: (rows) => (rows.length ? { type: 'string' } : { name: 'id', type: 'uuid', pk: true, required: true, unique: true }) },
    ],
    cols: [['Entity', (x) => `${b(x.name)}<div class="muted small">${cut(x.description, 80)}</div>`], ['Attributes', (x) => cut((x.fields || []).map((f) => f.name + (f.pk ? ' 🔑' : f.fk ? ' →' : '')).join(', '), 90)], ['Class.', (x) => pill(x.classification, /PII|Sensitive/.test(x.classification || '') ? 'warn' : '')]],
    defaults: () => ({ classification: 'Internal', fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true }] }),
  },
  relationships: {
    title: 'Relationships', singular: 'relationship',
    fields: [{ key: 'from', label: 'From entity', type: 'select', options: o.entities, req: true }, { key: 'kind', label: 'Kind (UML)', type: 'select', options: REL_KINDS, blank: false, help: 'Aggregation: parts can exist alone. Composition: parts die with the whole (from = whole). Generalisation: from = parent, to = child' }, { key: 'card', label: 'Cardinality', type: 'select', options: CARDS, req: true }, { key: 'to', label: 'To entity', type: 'select', options: o.entities, req: true }, { key: 'label', label: 'Verb', ph: 'e.g. submits' }],
    cols: [['From', (x, p) => b(nameOf(p.entities, x.from))], ['Cardinality', (x) => pill(x.card)], ['To', (x, p) => b(nameOf(p.entities, x.to))], ['Meaning', (x) => cut(x.label)]],
    defaults: () => ({ card: 'one-to-many', kind: 'association' }),
    validate: (x) => (x.from && x.from === x.to && x.kind === 'generalisation' ? 'An entity cannot be a kind of itself' : ''),
  },
  states: {
    title: 'State machines', singular: 'state machine',
    intro: 'Lifecycle of a business object (e.g. an Application). Generates a state diagram.',
    fields: [{ key: 'name', label: 'Name', req: true }, { key: 'entity', label: 'Entity', type: 'select', options: o.entities }, { key: 'initial', label: 'Initial state', req: true }, { key: 'finals', label: 'Final states', type: 'list', rows: 2 }, { key: 'transitions', label: 'Transitions', type: 'rows', add: 'Add transition', cols: [{ key: 'from', label: 'From state' }, { key: 'to', label: 'To state' }, { key: 'event', label: 'Event / trigger', w: '1.3fr' }, { key: 'guard', label: 'Guard [condition]' }, { key: 'action', label: '/ Action (effect)' }] }],
    cols: [['State machine', (x) => b(x.name)], ['Entity', (x, p) => cut(nameOf(p.entities, x.entity), 30)], ['States', (x) => String(new Set((x.transitions || []).flatMap((t) => [t.from, t.to]).filter(Boolean)).size)], ['Transitions', (x) => String((x.transitions || []).length)]],
    defaults: () => ({ finals: [], transitions: [] }),
  },
  apis: {
    title: 'API endpoints', singular: 'endpoint',
    links: [['#/settings', 'Export OpenAPI / Postman'], ['#/docs/api', 'API specification']],
    intro: 'Interface specification for developers. Exports an OpenAPI 3.0 file.',
    fields: [
      { key: 'method', label: 'Method', type: 'select', options: METHODS, blank: false, req: true }, { key: 'path', label: 'Path', req: true, ph: '/applications/{id}' },
      { key: 'summary', label: 'Summary', req: true, full: true }, { key: 'tag', label: 'Group / tag' }, { key: 'auth', label: 'Security', type: 'select', options: ['None', 'API key', 'OAuth2 / JWT bearer', 'mTLS'] },
      { key: 'params', label: 'Parameters', type: 'rows', add: 'Add parameter', cols: [{ key: 'name', label: 'Name' }, { key: 'in', label: 'In', type: 'select', options: ['path', 'query', 'header'], w: '100px' }, { key: 'type', label: 'Type', type: 'select', options: ['string', 'integer', 'number', 'boolean'], w: '110px' }, { key: 'required', label: 'Req', type: 'check', w: '40px' }, { key: 'desc', label: 'Description', w: '1.4fr' }] },
      { key: 'entity', label: 'Resource (entity)', type: 'select', options: o.entities, help: 'Used to generate JSON and XML examples when the boxes below are empty' }, { key: 'version', label: 'Version', ph: 'v1' },
      { key: 'request', label: 'Request body example (JSON)', type: 'textarea', rows: 4 }, { key: 'response', label: 'Success response example (JSON)', type: 'textarea', rows: 4 },
      { key: 'codes', label: 'Response codes', type: 'rows', add: 'Add response code', cols: [{ key: 'code', label: 'Code', w: '80px' }, { key: 'desc', label: 'Meaning', w: '2fr' }] },
      { key: 'idempotent', label: 'Safe to retry', type: 'check', text: 'Idempotent: repeating the same request does not create duplicates' }, { key: 'failure', label: 'Failure handling (timeouts, retries, duplicates, what the user sees)', type: 'textarea', rows: 3, ph: 'e.g. Time out after 10 s; retry twice with the same Idempotency-Key; if still failing, mark as Pending and alert support' },
      { key: 'requirementIds', label: 'Implements requirements', type: 'multi', options: o.requirements },
    ],
    cols: [['Method', (x) => pill(x.method, { GET: 'info', POST: 'ok', DELETE: 'err', PUT: 'warn', PATCH: 'warn' }[x.method])], ['Path', (x) => `<code>${esc(x.path)}</code>`], ['Summary', (x) => cut(x.summary, 80)], ['Auth', (x) => cut(x.auth, 20)], ['Codes', (x) => esc((x.codes || []).map((c) => c.code).join(', ')) || '—'], ['Quality', (x, p) => { const l = lintApi(x, p); return l.length ? `<span class="pill warn" title="${esc(l.join('\n'))}">${l.length} issue${l.length > 1 ? 's' : ''}</span>` : pill('OK', 'ok'); }]],
    defaults: () => ({ method: 'GET', auth: 'OAuth2 / JWT bearer', version: 'v1', params: [], codes: [{ code: '200', desc: 'OK — request succeeded' }, { code: '400', desc: 'Bad request — validation failed (field errors returned)' }, { code: '401', desc: 'Unauthorised — missing or invalid credentials' }, { code: '404', desc: 'Not found' }, { code: '500', desc: 'Server error — try again later' }], requirementIds: [] }),
  },
  integrations: {
    title: 'Integrations', singular: 'integration',
    fields: [{ key: 'system', label: 'External system', req: true }, { key: 'direction', label: 'Direction', type: 'select', options: ['Outbound', 'Inbound', 'Two-way'] }, { key: 'protocol', label: 'Protocol', type: 'select', options: ['REST', 'SOAP', 'GraphQL', 'Message queue', 'Webhook', 'SFTP / file', 'Database', 'Other'] }, { key: 'frequency', label: 'Frequency', ph: 'Real-time / nightly batch' }, { key: 'data', label: 'Data exchanged', type: 'textarea', req: true }, { key: 'auth', label: 'Authentication' }, { key: 'owner', label: 'Owner', type: 'select', options: o.stakeholders }, { key: 'sla', label: 'SLA / error handling', type: 'textarea', rows: 2 }, { key: 'state', label: 'Landscape', type: 'select', options: ['Existing and kept', 'To-be (new)', 'As-is (to retire)'] }, { key: 'mapping', label: 'Field mapping', type: 'rows', add: 'Add mapping', cols: [{ key: 'source', label: 'Source field (their system)' }, { key: 'target', label: 'Target (our Entity.attribute)', type: 'select', options: o.attributes, w: '1.2fr' }, { key: 'rule', label: 'Transformation / rule', w: '1.4fr' }] }],
    cols: [['System', (x) => b(x.system)], ['Direction', (x) => pill(x.direction)], ['Protocol', (x) => pill(x.protocol, 'info')], ['Data', (x) => cut(x.data, 80)], ['Frequency', (x) => cut(x.frequency, 30)]],
    defaults: () => ({ direction: 'Outbound', protocol: 'REST', state: 'Existing and kept', mapping: [] }),
  },
  raid: {
    title: 'RAID log', singular: 'RAID item', codeFrom: (x) => ({ Risk: 'R', Assumption: 'A', Issue: 'I', Dependency: 'D' })[x.type] || 'R', pad: 2,
    fields: [{ key: 'type', label: 'Type', type: 'select', options: RAID_TYPES, blank: false }, { key: 'code', label: 'ID', help: 'Blank = automatic' }, { key: 'description', label: 'Description', type: 'textarea', req: true }, { key: 'likelihood', label: 'Likelihood (1–5)', type: 'number', min: 1, max: 5 }, { key: 'impact', label: 'Impact (1–5)', type: 'number', min: 1, max: 5 }, { key: 'owner', label: 'Owner', type: 'select', options: o.stakeholders }, { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Closed'], blank: false }, { key: 'response', label: 'Mitigation / response', type: 'textarea' }, { key: 'due', label: 'Review date', type: 'date' }],
    cols: [['ID', (x) => b(x.code)], ['Type', (x) => pill(x.type)], ['Description', (x) => cut(x.description, 100)], ['Score', (x) => (x.type === 'Risk' || x.type === 'Issue' ? `${pill(`${riskScore(x)} ${riskLevel(x)}`, { High: 'err', Medium: 'warn', Low: 'ok' }[riskLevel(x)])}` : '—')], ['Owner', (x, p) => cut(nameOf(p.stakeholders, x.owner), 24)], ['Status', (x) => autoPill(x.status)]],
    defaults: () => ({ type: 'Risk', likelihood: 3, impact: 3, status: 'Open' }),
    filters: { type: RAID_TYPES, status: ['Open', 'In progress', 'Closed'] },
  },
  decisions: {
    title: 'Decision log', singular: 'decision', prefix: 'DEC', pad: 2,
    fields: [{ key: 'code', label: 'ID' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'decision', label: 'Decision', type: 'textarea', req: true }, { key: 'options', label: 'Options considered', type: 'list', rows: 3 }, { key: 'rationale', label: 'Rationale', type: 'textarea' }, { key: 'by', label: 'Decided by', type: 'select', options: o.stakeholders }],
    cols: [['ID', (x) => b(x.code)], ['Date', (x) => esc(x.date)], ['Decision', (x) => `${cut(x.decision, 110)}<div class="muted small">${cut(x.rationale, 90)}</div>`], ['By', (x, p) => cut(nameOf(p.stakeholders, x.by), 24)]],
    defaults: () => ({ date: today(), options: [] }),
  },
  changes: {
    title: 'Change requests', singular: 'change request', prefix: 'CR',
    intro: 'Change control after the baseline: log the request, assess impact, record the decision.',
    fields: [{ key: 'code', label: 'ID' }, { key: 'date', label: 'Raised on', type: 'date' }, { key: 'title', label: 'Title', req: true, full: true }, { key: 'description', label: 'Requested change', type: 'textarea', req: true }, { key: 'reason', label: 'Business justification', type: 'textarea' }, { key: 'by', label: 'Requested by', type: 'select', options: o.stakeholders }, { key: 'status', label: 'Status', type: 'select', options: CR_STATUS, blank: false }, { key: 'scope', label: 'Impact · scope', type: 'textarea', rows: 2 }, { key: 'schedule', label: 'Impact · schedule (days)', type: 'number' }, { key: 'cost', label: 'Impact · cost', type: 'number' }, { key: 'risk', label: 'Impact · risk', type: 'select', options: LHM }, { key: 'requirementIds', label: 'Affected requirements', type: 'multi', options: o.requirements }, { key: 'decision', label: 'CCB decision & notes', type: 'textarea' }],
    cols: [['ID', (x) => b(x.code)], ['Change', (x) => b(x.title)], ['Impact', (x) => `${x.schedule ? `${x.schedule} d` : '—'} · ${x.cost ? Number(x.cost).toLocaleString() : '—'}`], ['Affects', (x, p) => codePills(p.requirements, x.requirementIds)], ['Status', (x) => autoPill(x.status)]],
    defaults: () => ({ date: today(), status: 'Proposed', risk: 'Medium', requirementIds: [] }),
  },
  releases: {
    title: 'Releases & sprints', singular: 'release',
    fields: [{ key: 'name', label: 'Name', req: true }, { key: 'goal', label: 'Goal', full: true }, { key: 'start', label: 'Start', type: 'date', req: true }, { key: 'end', label: 'End', type: 'date', req: true }],
    validate: (x) => (x.start && x.end && x.end < x.start ? 'The end date must be on or after the start date' : ''),
    cols: [['Release', (x) => `${b(x.name)}<div class="muted small">${cut(x.goal, 80)}</div>`], ['Start', (x) => esc(x.start)], ['End', (x) => esc(x.end)], ['Stories', (x, p) => String(p.stories.filter((s) => s.release === x.id).length)]],
  },
  rates: {
    title: 'Team & day rates', singular: 'role',
    intro: 'Roles on the delivery team, what each costs per day, and how many people fill it.',
    fields: [{ key: 'role', label: 'Role', req: true, ph: 'e.g. Developer' }, { key: 'dayRate', label: 'Day rate', type: 'number', req: true, min: 0 }, { key: 'fte', label: 'People in this role (FTE)', type: 'number', min: 0.1, step: 0.1 }, { key: 'notes', label: 'Notes' }],
    cols: [['Role', (x) => b(x.role)], ['Day rate', (x) => Number(x.dayRate || 0).toLocaleString(), 'num'], ['People', (x) => esc(x.fte || 1), 'num']],
    defaults: () => ({ fte: 1 }),
    validate: (x) => (+x.dayRate < 0 ? 'The day rate cannot be negative' : x.fte !== '' && x.fte != null && !(+x.fte > 0) ? 'People must be more than 0' : ''),
  },
  workItems: {
    title: 'Work estimate', singular: 'work item', prefix: 'WI',
    intro: 'Three-point estimates in person-days. Expected effort uses PERT: (optimistic + 4 x likely + pessimistic) / 6.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'item', label: 'Work item', req: true, ph: 'e.g. Build online application form' },
      { key: 'phase', label: 'Phase', type: 'select', options: ['Analysis', 'Design', 'Build', 'Test', 'Deploy', 'Project management', 'Other'], blank: false }, { key: 'role', label: 'Done by (role)', type: 'select', options: o.rates },
      { key: 'optimistic', label: 'Optimistic (days)', type: 'number', min: 0, step: 0.5 }, { key: 'likely', label: 'Most likely (days)', type: 'number', min: 0, step: 0.5, req: true },
      { key: 'pessimistic', label: 'Pessimistic (days)', type: 'number', min: 0, step: 0.5 }, { key: 'requirementIds', label: 'Covers requirements', type: 'multi', options: o.requirements },
      { key: 'notes', label: 'Assumptions', type: 'textarea', rows: 2 },
    ],
    cols: [['ID', (x) => b(x.code)], ['Work item', (x) => b(x.item)], ['Phase', (x) => pill(x.phase || 'Other')], ['Role', (x, p) => esc(byId(p.rates, x.role)?.role || '—')], ['O / M / P', (x) => esc(`${x.optimistic || '–'} / ${x.likely || '–'} / ${x.pessimistic || '–'}`), 'num'], ['Expected', (x) => `${pertDays(x).toFixed(1)} d`, 'num']],
    defaults: () => ({ phase: 'Build', requirementIds: [] }),
    validate: (x) => {
      const n = [x.optimistic, x.likely, x.pessimistic].filter((v) => v !== '' && v != null).map(Number);
      if (n.some((v) => v < 0 || Number.isNaN(v))) return 'Estimates must be 0 or more';
      if (+x.optimistic && +x.likely && +x.optimistic > +x.likely) return 'Optimistic must not be more than most likely';
      if (+x.pessimistic && +x.likely && +x.pessimistic < +x.likely) return 'Pessimistic must not be less than most likely';
      return '';
    },
  },
  screens: {
    title: 'Screens & data mapping', singular: 'screen', prefix: 'SCR', pad: 2,
    links: [['#/diagrams/dataflow', 'Data flow diagrams'], ['#/docs/mapping', 'Data mapping document']],
    intro: 'Each screen, its fields, and where every field is stored (Entity.attribute). This is the data mapping developers and testers need: from what the user sees to the database.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'name', label: 'Screen name', req: true, ph: 'e.g. Registration' },
      { key: 'persona', label: 'Used by', type: 'select', options: o.personas }, { key: 'usecaseIds', label: 'Supports use cases', type: 'multi', options: o.usecases },
      { key: 'purpose', label: 'Purpose', type: 'textarea', rows: 2, full: true },
      { key: 'apiIds', label: 'Calls API endpoints', type: 'multi', options: o.apis },
      { key: 'fields', label: 'Fields', type: 'rows', add: 'Add field', cols: [{ key: 'label', label: 'Label on screen', w: '1.2fr' }, { key: 'control', label: 'Control', type: 'select', options: CONTROLS, w: '120px' }, { key: 'required', label: 'Req', type: 'check', w: '40px' }, { key: 'validation', label: 'Validation / format', w: '1.3fr' }, { key: 'mapsTo', label: 'Stored in (Entity.attribute)', type: 'select', options: o.attributes, w: '1.4fr' }] },
      { key: 'notes', label: 'Notes (messages, states, wireframe link)', type: 'textarea', rows: 2 },
    ],
    cols: [['ID', (x) => b(x.code)], ['Screen', (x, p) => `${b(x.name)}<div class="muted small">${cut(nameOf(p.personas, x.persona), 40)}</div>`], ['Fields', (x) => String((x.fields || []).length)], ['Mapping', (x, p) => { const m = mappingIssues(x, p); const inputs = (x.fields || []).filter((f) => f.control !== 'Button').length; return m.length ? `<span class="pill warn" title="${esc(m.join('\n'))}">${m.length} to fix</span>` : inputs ? pill(`${inputs}/${inputs} mapped`, 'ok') : '—'; }]],
    defaults: () => ({ usecaseIds: [], apiIds: [], fields: [] }),
  },
  components: {
    title: 'Architecture components', singular: 'component', prefix: 'CMP', pad: 2,
    links: [['#/diagrams/arch-asis', 'As-is landscape'], ['#/diagrams/arch-tobe', 'To-be landscape'], ['#/diagrams/arch-layers', 'Layers'], ['#/docs/architecture', 'Architecture document']],
    intro: 'The systems and parts of the solution, the layer each sits in, and how they connect — today (as-is) and after the change (to-be). Drives the layered architecture and landscape diagrams.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'name', label: 'Component / system', req: true, ph: 'e.g. Mobile app, Order service, Inventory DB' },
      { key: 'layer', label: 'Layer', type: 'select', options: LAYERS, blank: false }, { key: 'state', label: 'Landscape', type: 'select', options: ['Existing and kept', 'To-be (new)', 'As-is (to retire)'], blank: false },
      { key: 'technology', label: 'Technology / product', ph: 'e.g. React, Java service, PostgreSQL, SAP' }, { key: 'owner', label: 'Owner', type: 'select', options: o.stakeholders },
      { key: 'description', label: 'Responsibility', type: 'textarea', rows: 2, full: true },
      { key: 'connections', label: 'Connections from this component', type: 'rows', add: 'Add connection', cols: [{ key: 'to', label: 'To', type: 'select', options: o.components }, { key: 'method', label: 'How', type: 'select', options: ['REST API', 'SOAP API', 'GraphQL', 'Event / message', 'File transfer', 'Database link', 'Manual (spreadsheet / re-keying)'], w: '1.2fr' }, { key: 'frequency', label: 'When', ph: 'Real-time / daily', w: '110px' }, { key: 'data', label: 'Data', w: '1.2fr' }, { key: 'state', label: 'Landscape', type: 'select', options: ['Both', 'As-is only', 'To-be only'], w: '110px' }] },
    ],
    cols: [['ID', (x) => b(x.code)], ['Component', (x) => `${b(x.name)}<div class="muted small">${cut(x.technology, 50)}</div>`], ['Layer', (x) => pill(x.layer || '—')], ['Landscape', (x) => pill(x.state || '—', /new/.test(x.state) ? 'ok' : /retire/.test(x.state) ? 'err' : '')], ['Connections', (x) => String((x.connections || []).length)]],
    defaults: () => ({ layer: 'Business logic / services', state: 'Existing and kept', connections: [] }),
    filters: { layer: LAYERS },
  },
  queries: {
    title: 'Saved SQL queries', singular: 'query', prefix: 'Q', pad: 2,
    links: [['#/sql', 'Open the SQL workbench']],
    intro: 'SQL you used to explore data or prove a requirement. Run them in the SQL workbench.',
    fields: [{ key: 'code', label: 'ID' }, { key: 'name', label: 'Name', req: true }, { key: 'purpose', label: 'What it answers / checks', type: 'textarea', rows: 2 }, { key: 'sql', label: 'SQL', type: 'textarea', rows: 8, req: true }, { key: 'requirementIds', label: 'Validates requirements', type: 'multi', options: o.requirements }],
    cols: [['ID', (x) => b(x.code)], ['Query', (x) => `${b(x.name)}<div class="muted small">${cut(x.purpose, 90)}</div>`], ['Requirements', (x, p) => codePills(p.requirements, x.requirementIds)], ['', (x) => `<button class="btn sm" data-runq="${esc(x.id)}">Run ▶</button>`]],
    defaults: () => ({ requirementIds: [] }),
  },
  defects: {
    title: 'Defect log', singular: 'defect', prefix: 'DEF',
    links: [['#/c/tests', 'Test cases'], ['#/docs/uat', 'UAT plan & results']],
    intro: 'Problems found in testing. A good defect says what was done, what was expected, what actually happened, and how bad it is — facts, not guesses about the cause.',
    fields: [
      { key: 'code', label: 'ID' }, { key: 'title', label: 'Title', req: true, full: true, ph: 'Short, specific: “Submit stays enabled when amount is above the maximum”' },
      { key: 'testId', label: 'Found by test case', type: 'select', options: o.tests }, { key: 'environment', label: 'Environment', type: 'select', options: ['Development', 'SIT', 'UAT', 'Production'] },
      { key: 'severity', label: 'Severity (impact)', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'], req: true }, { key: 'priority', label: 'Priority (urgency)', type: 'select', options: ['P1 — fix now', 'P2 — this release', 'P3 — next release', 'P4 — when possible'] },
      { key: 'steps', label: 'Steps to reproduce (one per line)', type: 'list', rows: 4 },
      { key: 'expected', label: 'Expected result', type: 'textarea', rows: 2, req: true }, { key: 'actual', label: 'Actual result', type: 'textarea', rows: 2, req: true },
      { key: 'status', label: 'Status', type: 'select', options: ['New', 'Open', 'In progress', 'Fixed — ready to retest', 'Closed', 'Rejected', 'Deferred'], blank: false },
      { key: 'reportedBy', label: 'Reported by', type: 'select', options: o.stakeholders }, { key: 'assignee', label: 'Assigned to' }, { key: 'date', label: 'Found on', type: 'date' },
      { key: 'requirementIds', label: 'Affects requirements', type: 'multi', options: o.requirements }, { key: 'notes', label: 'Notes / root cause / fix', type: 'textarea', rows: 2 },
    ],
    cols: [['ID', (x) => b(x.code)], ['Defect', (x, p) => `${b(x.title)}<div class="muted small">${cut(byId(p.tests, x.testId)?.code || '', 20)} ${esc(x.environment || '')}</div>`], ['Severity', (x) => pill(x.severity || '—', { Critical: 'err', High: 'err', Medium: 'warn', Low: 'ok' }[x.severity])], ['Priority', (x) => cut(String(x.priority || '').split(' ')[0], 4)], ['Status', (x) => autoPill(x.status)]],
    defaults: () => ({ status: 'New', environment: 'UAT', severity: 'Medium', priority: 'P2 — this release', requirementIds: [], steps: [], date: today() }),
    filters: { status: ['New', 'Open', 'In progress', 'Fixed — ready to retest', 'Closed', 'Rejected', 'Deferred'], severity: ['Critical', 'High', 'Medium', 'Low'] },
  },
  glossary: {
    title: 'Glossary', singular: 'term',
    fields: [{ key: 'term', label: 'Term', req: true }, { key: 'synonyms', label: 'Synonyms / acronym' }, { key: 'definition', label: 'Definition', type: 'textarea', req: true }],
    cols: [['Term', (x) => b(x.term)], ['Definition', (x) => cut(x.definition, 160)], ['Synonyms', (x) => cut(x.synonyms, 40)]],
    sort: (a, c) => String(a.term).localeCompare(String(c.term)),
  },
};

export const COLLECTION_KEYS = Object.keys(COLLECTIONS);

export function blankProject(name = '') {
  const now = new Date().toISOString();
  const p = {
    id: uid('prj'), createdAt: now, updatedAt: now,
    meta: { name, code: '', client: '', sponsor: '', analyst: '', version: '0.1', methodology: 'Agile', domain: '', summary: '' },
    charter: { problem: '', vision: '', scopeIn: [], scopeOut: [], successCriteria: [], budget: '', deadline: '', constraints: [] },
    businessCase: { discountRate: 10, years: 5, options: '', recommendation: '', currency: 'R' },
    estimate: { startDate: '', contingency: 15, hoursPerDay: 8, workDays: [1, 2, 3, 4, 5], holidays: '', velocity: 0, sprintWeeks: 2 },
    raci: {}, // { deliverable: { stakeholderId: 'R' | 'A' | 'C' | 'I' } }
    raciItems: ['Business case', 'Requirements baseline', 'Solution design', 'UAT', 'Go-live'],
    diagrams: [], // Diagram Studio: { id, name, code }
    canvases: [], // Whiteboard: { id, name, nodes, edges }
  };
  for (const k of COLLECTION_KEYS) p[k] = [];
  return p;
}

/** Make any loaded / imported project safe to use. */
export function normalize(input) {
  const base = blankProject();
  const p = { ...base, ...(input && typeof input === 'object' ? input : {}) };
  for (const k of ['meta', 'charter', 'businessCase', 'estimate']) p[k] = { ...base[k], ...(p[k] || {}) };
  for (const k of [...COLLECTION_KEYS, 'diagrams', 'canvases', 'raciItems']) if (!Array.isArray(p[k])) p[k] = base[k];
  if (!p.raci || typeof p.raci !== 'object') p.raci = {};
  for (const k of COLLECTION_KEYS) {
    p[k] = p[k].filter((it) => it && typeof it === 'object');
    for (const it of p[k]) it.id ||= uid(k.slice(0, 3));
    // imported or hand-edited files may lack IDs; documents and diagrams rely on them
    for (const it of p[k]) ensureCode(k, it, p[k]);
  }
  return p;
}

/** Assign an automatic code if the collection numbers its items. */
export function ensureCode(key, item, list) {
  const c = COLLECTIONS[key];
  if (item.code) return;
  const prefix = c.codeFrom ? c.codeFrom(item) : c.prefix;
  if (prefix) item.code = nextCode(list.filter((x) => x.id !== item.id), prefix, c.pad || 3);
}
