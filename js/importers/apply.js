// Turn confirmed import candidates into project records. Pure functions.
import { uid, nextCode, byId, NFR_CATEGORIES, PRIORITIES } from '../model.js';
import { titleFrom } from './text.js';

function findOrCreateActor(p, name) {
  const n = String(name || '').trim();
  if (!n) return '';
  const existing = p.actors.find((a) => a.name.toLowerCase() === n.toLowerCase());
  if (existing) return existing.id;
  const a = { id: uid('act'), name: n, description: '', goals: '' };
  p.actors.push(a);
  return a.id;
}

/** Apply selected text-extraction candidates. `picked` has the same shape as extractFromText(). */
export function applyTextCandidates(p, picked) {
  const counts = {};
  const inc = (k) => (counts[k] = (counts[k] || 0) + 1);
  const third = (t) => t.replace(/\bmy\b/gi, 'their').replace(/\bmine\b/gi, 'theirs').replace(/\bI\b/g, 'they').replace(/\bme\b/gi, 'them').replace(/\bmyself\b/gi, 'themselves');
  for (const s of picked.stories || []) {
    p.requirements.push({
      id: uid('req'), code: nextCode(p.requirements, 'FR-'), title: titleFrom(third(s.want)),
      statement: `The system shall allow the ${s.actor.toLowerCase()} to ${third(s.want).replace(/[.!]+$/, '')}.`,
      actorId: findOrCreateActor(p, s.actor), benefit: s.benefit, objectiveIds: [], priority: '', source: '', status: 'Proposed', releaseId: '', acceptance: [],
    });
    inc('requirements');
  }
  for (const r of picked.requirements || []) {
    p.requirements.push({
      id: uid('req'), code: nextCode(p.requirements, 'FR-'), title: titleFrom(r.statement.replace(/^the system shall\s+(allow\s+\w+\s+to\s+)?/i, '')),
      statement: r.statement, actorId: '', benefit: '', objectiveIds: [], priority: '', source: '', status: 'Proposed', releaseId: '', acceptance: [],
    });
    inc('requirements');
  }
  for (const n of picked.nfrs || []) {
    p.nfrs.push({ id: uid('nfr'), code: nextCode(p.nfrs, 'NFR-'), category: NFR_CATEGORIES.includes(n.category) ? n.category : 'Performance', statement: n.text, metric: '', target: '', priority: 'Must' });
    inc('nfrs');
  }
  for (const b of picked.rules || []) { p.rules.push({ id: uid('br'), code: nextCode(p.rules, 'BR-', 2), statement: b.text, requirementIds: [] }); inc('rules'); }
  for (const r of picked.risks || []) { p.risks.push({ id: uid('rsk'), code: nextCode(p.risks, 'R-', 2), description: r.text, likelihood: 3, impact: 3, mitigation: '', owner: '', status: 'Open' }); inc('risks'); }
  for (const a of picked.assumptions || []) { p.assumptions.push({ id: uid('asm'), code: nextCode(p.assumptions, 'A-', 2), text: a.text, owner: '', validated: false }); inc('assumptions'); }
  for (const c of picked.constraints || []) { p.constraints.push({ id: uid('con'), code: nextCode(p.constraints, 'C-', 2), text: c.text }); inc('constraints'); }
  for (const d of picked.decisions || []) { p.decisions.push({ id: uid('dec'), code: nextCode(p.decisions, 'D-', 2), date: new Date().toISOString().slice(0, 10), decision: d.text, rationale: '', owner: '' }); inc('decisions'); }
  for (const q of picked.questions || []) { p.questions.push({ id: uid('q'), code: nextCode(p.questions, 'Q-', 2), question: q.text, askedOf: 'Client', owner: '', due: '', status: 'Open', answer: '' }); inc('questions'); }
  // Loose Given/When/Then lines become acceptance criteria on the last requirement imported.
  const target = p.requirements[p.requirements.length - 1];
  for (const ac of picked.acceptance || []) {
    if (!target) break;
    target.acceptance.push({ id: uid('ac'), title: `Scenario ${target.acceptance.length + 1}`, given: ac.given, when: ac.when, then: ac.then });
    inc('acceptance criteria');
  }
  return counts;
}

const TYPE_MAP = [
  [/uuid|uniqueidentifier/, 'uuid'], [/bigint|int|serial|smallint|tinyint/, 'int'], [/decimal|numeric|float|double|real|money/, 'decimal'],
  [/bool|bit/, 'boolean'], [/timestamp|datetime/, 'datetime'], [/^date$/, 'date'], [/json/, 'json'], [/text|clob/, 'text'], [/enum/, 'enum'],
];
const mapType = (t) => (TYPE_MAP.find(([re]) => re.test(t)) || [, 'string'])[1];

/** Import parsed tables into the data model. Existing entities with the same name are skipped. */
export function applyTables(p, tables) {
  let added = 0;
  const pretty = (n) => n.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()).replace(/s$/, '');
  const nameMap = {};
  for (const t of tables) nameMap[t.name] = pretty(t.name);
  for (const t of tables) {
    const name = nameMap[t.name];
    if (p.entities.some((e) => e.name.toLowerCase() === name.toLowerCase())) continue;
    p.entities.push({
      id: uid('ent'), name, description: `Imported from ${t.source} (${t.file}).`,
      fields: t.columns.map((c) => ({ name: c.name, type: mapType(c.type), pk: c.pk, required: c.required, unique: c.unique, fk: c.fk ? nameMap[c.fk] || pretty(c.fk) : '', rule: '' })),
    });
    added++;
  }
  // Create relationships from foreign keys.
  for (const e of p.entities) {
    for (const f of e.fields) {
      const target = p.entities.find((x) => x.name === f.fk);
      if (!target) continue;
      if (p.relationships.some((r) => r.fromId === target.id && r.toId === e.id)) continue;
      p.relationships.push({ id: uid('rel'), fromId: target.id, toId: e.id, cardinality: 'one-to-many', label: 'has' });
    }
  }
  return added;
}

/** Each discovered endpoint becomes a draft requirement for the analyst to review. */
export function applyRoutes(p, routes) {
  let added = 0;
  const verb = { GET: 'retrieve', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete', CRUD: 'create, read, update and delete', ANY: 'process requests for' };
  for (const r of routes) {
    const resource = r.path.split('/').filter((x) => x && !x.startsWith(':') && !x.startsWith('{') && !/^v\d+$/.test(x) && x !== 'api').pop() || 'resource';
    const statement = `The system shall provide an API endpoint (${r.method} ${r.path}) to ${verb[r.method] || 'handle'} ${resource.replace(/[-_]/g, ' ')}.`;
    if (p.requirements.some((x) => x.statement === statement)) continue;
    p.requirements.push({
      id: uid('req'), code: nextCode(p.requirements, 'FR-'), title: `${(verb[r.method] || 'Handle').replace(/^\w/, (c) => c.toUpperCase())} ${resource.replace(/[-_]/g, ' ')}`,
      statement, actorId: '', benefit: '', objectiveIds: [], priority: '', source: '', status: 'Proposed', releaseId: '', acceptance: [], notes: `Found in ${r.file}:${r.line} (${r.framework})`,
    });
    added++;
  }
  return added;
}

// ---------- CSV ----------
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"' && s[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export const REQUIREMENTS_CSV_TEMPLATE =
  'ID,Title,Statement,Actor,Benefit,Priority,Given,When,Then\n' +
  'FR-001,Book an appointment,The system shall let a signed-in patient book one available slot.,Patient,my appointment is confirmed without phoning,Must,a patient has selected a free slot,they confirm the booking,a confirmation number is shown\n';

/** Import requirements from CSV rows (first row = headers, matched by name). */
export function applyRequirementsCsv(p, text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { added: 0, errors: ['The file has no data rows.'] };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const ix = {
    id: col('id', 'code', 'req id', 'requirement id'), title: col('title', 'name', 'summary'), statement: col('statement', 'requirement', 'description'),
    actor: col('actor', 'user', 'persona', 'role'), benefit: col('benefit', 'so that', 'value'), priority: col('priority', 'moscow'),
    given: col('given'), when: col('when'), then: col('then'),
  };
  if (ix.statement < 0 && ix.title < 0) return { added: 0, errors: ['No "Statement" or "Title" column found.'] };
  const errors = [];
  let added = 0;
  rows.slice(1).forEach((r, n) => {
    const get = (k) => (ix[k] >= 0 ? String(r[ix[k]] ?? '').trim() : '');
    const statement = get('statement') || `The system shall ${get('title').toLowerCase()}.`;
    if (!get('title') && !get('statement')) { errors.push(`Row ${n + 2}: empty, skipped.`); return; }
    const pr = PRIORITIES.find((x) => x.toLowerCase() === get('priority').toLowerCase()) || '';
    let code = get('id');
    if (!code || p.requirements.some((x) => x.code === code)) code = nextCode(p.requirements, 'FR-');
    const req = {
      id: uid('req'), code, title: get('title') || titleFrom(statement), statement, actorId: findOrCreateActor(p, get('actor')), benefit: get('benefit'),
      objectiveIds: [], priority: pr, source: '', status: 'Proposed', releaseId: '', acceptance: [],
    };
    if (get('given') && get('when') && get('then')) req.acceptance.push({ id: uid('ac'), title: 'Scenario 1', given: get('given'), when: get('when'), then: get('then') });
    p.requirements.push(req);
    added++;
  });
  return { added, errors };
}

export { byId };
