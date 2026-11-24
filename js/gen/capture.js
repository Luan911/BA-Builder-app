// Fast capture: turn pasted notes into items, derive screens / API endpoints / UAT tests from what is
// already in the model, and make project templates. Pure functions — the screens in
// js/views/capture.js call them, and tests/unit.mjs checks them.
import { COLLECTIONS, uid, ensureCode } from '../model.js';

// ---------- pasted lines ----------
/** Split pasted text into clean lines: strip bullets, numbering, checkboxes and duplicates. */
export function parseLines(text) {
  const seen = new Set();
  const strip = (l) => { let prev; do { prev = l; l = l.replace(/^\s*(?:[-*•·–—>]+|\d{1,3}[.)]|[a-z][.)](?=\s)|\[[ xX]?\])\s*/, ''); } while (l !== prev); return l.trim(); };
  return String(text || '')
    .split(/\r?\n/)
    .map(strip)
    .filter((l) => l.length > 1 && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()));
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower1 = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const sentence = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);
const splitPair = (l) => { const m = l.match(/^(.{1,80}?)\s*(?::|\s[-–—]\s|=)\s*(.+)$/); return m ? [m[1].trim(), m[2].trim()] : null; };
const titleFrom = (s) => cap(s.replace(/^the system (?:shall|must|should|will)\s+/i, '').replace(/[.!?]$/, '')).split(/\s+/).slice(0, 9).join(' ');

/** Which registers support "Paste a list", and what each pasted line becomes. */
export const QUICK = {
  questions: { label: 'Paste questions', hint: 'One question per line — e.g. straight from meeting notes.', make: (l) => ({ question: `${cap(l.replace(/[.?!]+$/, ''))}?`, status: 'Open' }) },
  requirements: { label: 'Paste requirements', hint: 'One per line. "The system shall…" lines are kept as written; other lines become "The system shall …".', options: ['Functional', 'Non-functional', 'Business', 'Stakeholder', 'Data', 'Interface', 'Transition'], make: (l, p, type = 'Functional') => {
    const st = /^the system (shall|must)\b/i.test(l) ? sentence(cap(l)) : sentence(`The system shall ${lower1(l)}`);
    return { type, title: titleFrom(l), statement: st, priority: 'Should', status: 'Draft', ...links(p) };
  } },
  stories: { label: 'Paste stories', hint: '"As a <role>, I want <goal> so that <benefit>" — or just the goal, one per line.', make: (l, p) => {
    const m = l.match(/^as an?\s+(.+?),?\s+i want(?:\s+to)?\s+(.+?)(?:,?\s+so that\s+(.+?))?\.?$/i);
    const role = m ? m[1] : '';
    const persona = p.personas.find((x) => role && x.name.toLowerCase() === role.toLowerCase()) || p.personas.find((x) => role && role.toLowerCase().includes(x.name.toLowerCase())) || p.personas.find((x) => x.kind !== 'System') || p.personas[0];
    return { asA: persona?.id || '', iWant: m ? m[2] : lower1(l.replace(/\.$/, '')), soThat: m?.[3] || '', status: 'Backlog', priority: 'Should' };
  } },
  glossary: { label: 'Paste terms', hint: '"Term: definition" (or "Term - definition") per line.', make: (l) => { const pr = splitPair(l); return pr ? { term: pr[0], definition: sentence(cap(pr[1])) } : { term: l, definition: 'To be defined.' }; } },
  raid: { label: 'Paste RAID items', hint: 'Start a line with "Risk:", "Assumption:", "Issue:" or "Dependency:" — otherwise the type you choose below is used.', options: ['Risk', 'Assumption', 'Issue', 'Dependency'], make: (l, p, type = 'Risk') => {
    const m = l.match(/^(risk|assumption|issue|dependency)\s*[:\-–]\s*(.+)$/i);
    return { type: m ? cap(m[1].toLowerCase()) : type, description: sentence(cap(m ? m[2] : l)), likelihood: 3, impact: 3, status: 'Open' };
  } },
  rules: { label: 'Paste rules', hint: '"Rule name: statement" per line, or just the statement.', make: (l) => { const pr = splitPair(l); return pr ? { name: pr[0], statement: sentence(cap(pr[1])), kind: 'Constraint' } : { name: titleFrom(l), statement: sentence(cap(l)), kind: 'Constraint' }; } },
  personas: { label: 'Paste users & systems', hint: 'One role or external system per line (e.g. "Branch manager", "Payment gateway").', make: (l) => ({ name: cap(l.replace(/\.$/, '')), kind: /\b(system|api|service|gateway|bureau|platform|erp|crm|database)\b/i.test(l) ? 'System' : 'Human' }) },
  stakeholders: { label: 'Paste stakeholders', hint: '"Name - Role" (or "Name, Role") per line.', make: (l) => { const m = l.match(/^(.+?)\s*(?:[-–—,(]|\s\|\s)\s*(.+?)\)?$/); return { name: m ? m[1] : l, role: m ? m[2] : 'Stakeholder', power: 'Medium', interest: 'Medium', attitude: 'Neutral', raci: 'C' }; } },
  tests: { label: 'Paste test cases', hint: 'One test case title per line.', make: (l) => ({ title: cap(l.replace(/\.$/, '')), status: 'Not run', level: 'User acceptance (UAT)' }) },
  changes: { label: 'Paste change requests', hint: 'One requested change per line.', make: (l) => ({ title: titleFrom(l), description: sentence(cap(l)), status: 'Proposed', risk: 'Medium' }) },
  decisions: { label: 'Paste decisions', hint: 'One decision per line.', make: (l) => ({ decision: sentence(cap(l)) }) },
};

/** Default links so new requirements are traced: the approver as source, the only objective if there is one. */
function links(p) {
  const approver = p.stakeholders.find((s) => s.approver);
  return { source: approver?.id || '', objectiveIds: p.objectives.length === 1 ? [p.objectives[0].id] : [] };
}

/** Build full items for a register from pasted text (codes assigned, defaults applied). */
export function itemsFromText(key, text, p, option) {
  const q = QUICK[key];
  const c = COLLECTIONS[key];
  if (!q || !c) return [];
  const list = [...p[key]];
  return parseLines(text).map((line) => {
    const item = { id: uid(key.slice(0, 3)), ...(c.defaults ? c.defaults() : {}), ...q.make(line, p, option) };
    ensureCode(key, item, list);
    list.push(item);
    return item;
  });
}

// ---------- derive from the data model ----------
const human = (n) => cap(String(n).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().replace(/\bid\b/g, 'ID'));
const CONTROL = { string: 'Text', text: 'Text area', int: 'Number', decimal: 'Number', boolean: 'Checkbox', date: 'Date', datetime: 'Date', email: 'Email', enum: 'Dropdown', json: 'Text area', uuid: 'Dropdown' };

/** A data-entry screen for an entity: one mapped field per attribute (keys skipped), plus a Save button. */
export function screenFromEntity(p, entity) {
  const fields = (entity.fields || []).filter((f) => f.name && !f.pk).map((f) => ({
    label: human(f.fk ? f.name.replace(/id$/i, '') || f.name : f.name),
    control: f.fk ? 'Dropdown' : f.type === 'decimal' && /amount|price|cost|total|income|salary|balance/i.test(f.name) ? 'Currency' : CONTROL[f.type] || 'Text',
    required: !!f.required,
    validation: [f.desc, f.unique ? 'Must be unique' : '', f.fk ? `Choose an existing ${f.fk}` : ''].filter(Boolean).join('; '),
    mapsTo: `${entity.name}.${f.name}`,
  }));
  fields.push({ label: 'Save', control: 'Button', validation: 'Enabled when all required fields are valid' });
  return { name: `${human(entity.name)} details`, purpose: `Capture and maintain ${human(entity.name).toLowerCase()} records.`, fields, usecaseIds: [], apiIds: [] };
}

const plural = (s) => { const w = String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); return /(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`; };

/** Standard REST endpoints for an entity (list, get, create, update, delete) that do not exist yet. */
export function endpointsFromEntity(p, entity) {
  const base = `/${plural(entity.name)}`;
  const one = `${base}/{id}`;
  const noun = human(entity.name).toLowerCase();
  const idParam = [{ name: 'id', in: 'path', type: 'string', required: true, desc: `${human(entity.name)} ID` }];
  const all = [
    { method: 'GET', path: base, summary: `List ${plural(noun).replace(/-/g, ' ')}`, params: [{ name: 'page', in: 'query', type: 'integer', required: false, desc: 'Page number' }, { name: 'pageSize', in: 'query', type: 'integer', required: false, desc: 'Items per page (max 100)' }], codes: [['200', 'OK — a page of results'], ['401', 'Unauthorised']] },
    { method: 'GET', path: one, summary: `Get one ${noun}`, params: idParam, codes: [['200', 'OK'], ['401', 'Unauthorised'], ['404', 'Not found']] },
    { method: 'POST', path: base, summary: `Create a ${noun}`, params: [], codes: [['201', 'Created — returns the new record and its ID'], ['400', 'Bad request — validation failed (field errors returned)'], ['401', 'Unauthorised'], ['409', 'Conflict — duplicate']], failure: 'Callers send an Idempotency-Key; a repeated request returns the original result instead of creating a duplicate.', idempotent: true },
    { method: 'PUT', path: one, summary: `Update a ${noun}`, params: idParam, codes: [['200', 'OK — updated'], ['400', 'Bad request — validation failed'], ['401', 'Unauthorised'], ['404', 'Not found'], ['409', 'Conflict — changed by someone else; reload and retry']], idempotent: true },
    { method: 'DELETE', path: one, summary: `Delete a ${noun}`, params: idParam, codes: [['204', 'Deleted'], ['401', 'Unauthorised'], ['403', 'Forbidden — not allowed for this role'], ['404', 'Not found']], idempotent: true },
  ];
  const exists = (a) => p.apis.some((x) => x.method === a.method && x.path === a.path);
  return all.filter((a) => !exists(a)).map((a) => ({ ...a, entity: entity.id, version: 'v1', tag: human(entity.name), auth: 'OAuth2 / JWT bearer', codes: [...a.codes, ['500', 'Server error — try again later; the caller sees a friendly message']].map(([code, desc]) => ({ code, desc })), failure: a.failure || '', idempotent: !!a.idempotent, requirementIds: [] }));
}

/** Draft UAT test cases from acceptance criteria that do not have a test yet (one per scenario). */
export function testsFromAcceptance(p) {
  const done = new Set(p.tests.map((t) => t.fromAc).filter(Boolean));
  const out = [];
  const add = (kind, x, ac, i) => {
    const key = `${kind}:${x.id}:${i}`;
    if (done.has(key) || !(ac.given || ac.when || ac.then)) return;
    const label = kind === 'r' ? `${x.code} ${x.title}` : `${x.code} ${x.iWant || ''}`;
    out.push({
      fromAc: key, level: 'User acceptance (UAT)', status: 'Not run',
      title: `${label}`.slice(0, 70) + (ac.when ? ` — when ${ac.when}`.slice(0, 60) : ''),
      pre: ac.given ? cap(ac.given) : '',
      steps: [ac.given && `Set up: ${ac.given}`, ac.when && `Do: ${ac.when}`].filter(Boolean),
      expected: ac.then ? sentence(cap(ac.then)) : '',
      requirementIds: kind === 'r' ? [x.id] : [...(x.requirementIds || [])], storyIds: kind === 's' ? [x.id] : [],
    });
  };
  for (const r of p.requirements.filter((x) => x.status !== 'Rejected')) (r.acceptance || []).forEach((ac, i) => add('r', r, ac, i));
  for (const s of p.stories) (s.acceptance || []).forEach((ac, i) => add('s', s, ac, i));
  return out;
}

// ---------- project templates ----------
/** What a template keeps: reusable people, terms, quality requirements, assumptions and the BA plan. */
export function templateFrom(p, name) {
  const pick = (k, f = () => true) => JSON.parse(JSON.stringify(p[k].filter(f)));
  return {
    name, createdAt: new Date().toISOString(),
    data: {
      meta: { methodology: p.meta.methodology, domain: p.meta.domain, specStyle: p.meta.specStyle, client: p.meta.client },
      personas: pick('personas'), stakeholders: pick('stakeholders'), glossary: pick('glossary'),
      requirements: pick('requirements', (r) => r.type === 'Non-functional').map((r) => ({ ...r, status: 'Draft', objectiveIds: [], release: '' })),
      rules: pick('rules', (r) => !(r.requirementIds || []).length),
      raid: pick('raid', (r) => r.type === 'Assumption' || r.type === 'Dependency').map((r) => ({ ...r, status: 'Open' })),
      rates: pick('rates'), baPlan: JSON.parse(JSON.stringify(p.baPlan || {})), raciItems: [...(p.raciItems || [])],
    },
  };
}
/** Apply a template's data onto a new, empty project. */
export function applyTemplate(project, tpl) {
  const d = JSON.parse(JSON.stringify(tpl?.data || {}));
  Object.assign(project.meta, Object.fromEntries(Object.entries(d.meta || {}).filter(([, v]) => v)));
  for (const k of ['personas', 'stakeholders', 'glossary', 'requirements', 'rules', 'raid', 'rates']) if (Array.isArray(d[k])) project[k] = d[k];
  if (d.baPlan) project.baPlan = { ...project.baPlan, ...d.baPlan };
  if (Array.isArray(d.raciItems) && d.raciItems.length) project.raciItems = d.raciItems;
  return project;
}
