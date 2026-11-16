// Project data model, defaults and small helpers. No DOM access here.

export const SCHEMA_VERSION = 1;

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

/** Next sequential code, e.g. nextCode(list, 'FR-', 3) -> "FR-004". */
export function nextCode(list, prefix, pad = 3) {
  let max = 0;
  for (const item of list || []) {
    const m = String(item.code || '').match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(pad, '0');
}

export const PRIORITIES = ['Must', 'Should', 'Could', "Won't"];
export const REQ_STATUSES = ['Proposed', 'Approved', 'In build', 'Done', 'Rejected'];
export const NFR_CATEGORIES = [
  'Performance',
  'Availability',
  'Security',
  'Privacy',
  'Usability',
  'Accessibility',
  'Scalability',
  'Reliability',
  'Maintainability',
  'Compliance',
  'Compatibility',
];
export const METHODOLOGIES = ['Hybrid', 'Agile', 'Waterfall'];
export const COMPLIANCE_OPTIONS = ['POPIA', 'GDPR', 'PCI-DSS', 'HIPAA', 'SOC 2', 'ISO 27001', 'WCAG 2.2'];
export const STAKEHOLDER_SIDES = ['Client', 'Delivery', 'Third party'];
export const RACI = ['A', 'R', 'C', 'I'];
export const LEVELS = ['High', 'Medium', 'Low'];
export const STEP_TYPES = ['start', 'task', 'decision', 'end'];
export const FIELD_TYPES = ['string', 'text', 'int', 'decimal', 'boolean', 'date', 'datetime', 'uuid', 'email', 'enum', 'json'];
export const CARDINALITIES = ['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'];
export const COMPONENT_TYPES = ['client', 'gateway', 'service', 'datastore', 'queue', 'external'];
export const PROTOCOLS = ['REST', 'GraphQL', 'SOAP', 'gRPC', 'Message queue', 'Webhook', 'File (SFTP)', 'Database link', 'Other'];
export const DIRECTIONS = ['Outbound', 'Inbound', 'Two-way'];
export const RISK_STATUSES = ['Open', 'Mitigating', 'Closed'];
export const QUESTION_STATUSES = ['Open', 'Answered'];

export function blankProject() {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('prj'),
    createdAt: now,
    updatedAt: now,
    meta: {
      name: '',
      code: '',
      client: '',
      sponsor: '',
      preparedBy: '',
      domain: '',
      methodology: 'Hybrid',
      compliance: [],
      version: '0.1',
      summary: '',
    },
    initiation: {
      problem: '',
      vision: '',
      scopeIn: [],
      scopeOut: [],
      budget: '',
      targetDate: '',
      successCriteria: [],
    },
    objectives: [],
    stakeholders: [],
    actors: [],
    requirements: [],
    nfrs: [],
    rules: [],
    entities: [],
    relationships: [],
    processes: [],
    integrations: [],
    components: [],
    releases: [],
    risks: [],
    assumptions: [],
    constraints: [],
    dependencies: [],
    decisions: [],
    questions: [],
    gates: {},
  };
}

/** Fill any missing keys so older or hand-edited project files still load safely. */
export function normalizeProject(input) {
  const base = blankProject();
  const p = input && typeof input === 'object' ? input : {};
  const out = { ...base, ...p };
  out.meta = { ...base.meta, ...(p.meta || {}) };
  out.initiation = { ...base.initiation, ...(p.initiation || {}) };
  for (const key of Object.keys(base)) {
    if (Array.isArray(base[key]) && !Array.isArray(out[key])) out[key] = [];
  }
  if (!Array.isArray(out.meta.compliance)) out.meta.compliance = [];
  for (const k of ['scopeIn', 'scopeOut', 'successCriteria']) {
    if (!Array.isArray(out.initiation[k])) out.initiation[k] = [];
  }
  out.gates = out.gates && typeof out.gates === 'object' ? out.gates : {};
  for (const r of out.requirements) {
    r.id ||= uid('req');
    r.acceptance = Array.isArray(r.acceptance) ? r.acceptance : [];
    r.objectiveIds = Array.isArray(r.objectiveIds) ? r.objectiveIds : [];
  }
  for (const e of out.entities) {
    e.id ||= uid('ent');
    e.fields = Array.isArray(e.fields) ? e.fields : [];
  }
  for (const pr of out.processes) {
    pr.id ||= uid('proc');
    pr.steps = Array.isArray(pr.steps) ? pr.steps : [];
  }
  for (const c of out.components) c.connectsTo = Array.isArray(c.connectsTo) ? c.connectsTo : [];
  for (const b of out.rules) b.requirementIds = Array.isArray(b.requirementIds) ? b.requirementIds : [];
  for (const key of Object.keys(base)) {
    if (Array.isArray(out[key])) for (const item of out[key]) if (item && typeof item === 'object') item.id ||= uid(key.slice(0, 3));
  }
  out.schemaVersion = SCHEMA_VERSION;
  return out;
}

// ---------- lookups ----------
export const byId = (list, id) => (list || []).find((x) => x.id === id);
export const actorName = (p, id) => byId(p.actors, id)?.name || '';
export const stakeholderName = (p, id) => byId(p.stakeholders, id)?.name || '';
export const entityName = (p, id) => byId(p.entities, id)?.name || '';
export const releaseName = (p, id) => byId(p.releases, id)?.name || '';

export function riskScore(r) {
  return (Number(r.likelihood) || 0) * (Number(r.impact) || 0);
}
export function riskRating(r) {
  const s = riskScore(r);
  if (s >= 15) return 'High';
  if (s >= 8) return 'Medium';
  return 'Low';
}

/** Story text generated from a functional requirement. */
export function storyFor(p, req) {
  const actor = actorName(p, req.actorId) || 'user';
  const want = lowerFirst(req.title || req.statement || '').replace(/\.$/, '');
  const benefit = (req.benefit || '').replace(/\.$/, '');
  return `As a ${actor}, I want to ${want}${benefit ? `, so that ${lowerFirst(benefit)}` : ''}.`;
}

export function storyCode(req) {
  return String(req.code || '').replace(/^FR/, 'US');
}

/** Test case codes derived from a requirement's acceptance criteria. */
export function testCasesFor(req) {
  const base = String(req.code || 'REQ').replace(/^FR-?/, '');
  return (req.acceptance || []).map((ac, i) => ({
    code: `TC-${base}-${String(i + 1).padStart(2, '0')}`,
    title: ac.title || `Scenario ${i + 1}`,
    given: ac.given || '',
    when: ac.when || '',
    then: ac.then || '',
  }));
}

export function lowerFirst(s) {
  s = String(s || '').trim();
  if (!s) return s;
  // keep acronyms like "API" or "OTP" intact
  if (/^[A-Z]{2,}/.test(s) || /^I\b/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
