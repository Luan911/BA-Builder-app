// Technical exports: CSV, OpenAPI 3.0 (YAML), SQL DDL, JSON Schema.
import { COLLECTIONS, byId, nameOf } from '../model.js';

const plain = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = (head, rows) => [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

/** CSV of a collection: every simple field, with linked IDs turned into codes / names. */
export function toCsv(key, p) {
  const c = COLLECTIONS[key];
  const fields = c.fields.filter((f) => f.type !== 'rows');
  const val = (f, it) => {
    const v = it[f.key];
    if (Array.isArray(v)) {
      if (f.type === 'multi') return v.map((id) => findLabel(p, id)).join('; ');
      return v.join('; ');
    }
    if (f.type === 'select' && typeof f.options === 'function') return findLabel(p, v);
    if (f.type === 'check') return v ? 'Yes' : 'No';
    return v ?? '';
  };
  return csv(fields.map((f) => f.label), p[key].map((it) => fields.map((f) => val(f, it))));
}
function findLabel(p, id) {
  if (!id) return '';
  for (const k of Object.keys(COLLECTIONS)) {
    const it = byId(p[k], id);
    if (it) return it.code || it.name || it.title || it.term || id;
  }
  return id;
}
export const plainText = plain;

// ---------- YAML (enough for OpenAPI) ----------
function yaml(v, ind = 0) {
  const pad = '  '.repeat(ind);
  if (Array.isArray(v)) {
    if (!v.length) return ' []';
    return v.map((x) => (typeof x === 'object' && x !== null ? `\n${pad}-${yaml(x, ind + 1).replace(/^\n\s*/, ' ')}` : `\n${pad}- ${scalar(x)}`)).join('');
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (!keys.length) return ' {}';
    return keys.map((k) => {
      const x = v[k];
      const key = /^[A-Za-z0-9_./{}-]+$/.test(k) && !/^\d+$/.test(k) ? k : `'${k}'`;
      return typeof x === 'object' && x !== null ? `\n${pad}${key}:${yaml(x, ind + 1)}` : `\n${pad}${key}: ${scalar(x)}`;
    }).join('');
  }
  return ` ${scalar(v)}`;
}
function scalar(x) {
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  const s = String(x ?? '');
  if (s === '' || /^[\s\-?:,[\]{}#&*!|>'"%@`]|: |#|^\d|^(true|false|null|yes|no)$/i.test(s) || s.includes('\n')) return JSON.stringify(s);
  return s;
}

function schemaFromExample(ex) {
  if (Array.isArray(ex)) return { type: 'array', items: ex.length ? schemaFromExample(ex[0]) : {} };
  if (ex === null) return { nullable: true };
  if (typeof ex === 'object') return { type: 'object', properties: Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, schemaFromExample(v)])) };
  if (typeof ex === 'number') return { type: Number.isInteger(ex) ? 'integer' : 'number' };
  if (typeof ex === 'boolean') return { type: 'boolean' };
  return { type: 'string' };
}
const tryJson = (s) => {
  try { return s && s.trim() ? JSON.parse(s.replace(/…/g, '')) : undefined; } catch { return undefined; }
};

export function openApi(p) {
  const paths = {};
  const usesBearer = p.apis.some((a) => /OAuth|JWT/.test(a.auth || ''));
  const usesKey = p.apis.some((a) => a.auth === 'API key');
  for (const a of p.apis) {
    const op = { summary: a.summary || '', tags: a.tag ? [a.tag] : undefined, operationId: `${a.method.toLowerCase()}${a.path.replace(/[{}]/g, '').split('/').filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('')}` };
    if (!op.tags) delete op.tags;
    const reqs = (a.requirementIds || []).map((id) => byId(p.requirements, id)?.code).filter(Boolean);
    if (reqs.length) op.description = `Implements ${reqs.join(', ')}`;
    if ((a.params || []).length) op.parameters = a.params.filter((x) => x.name).map((x) => ({ name: x.name, in: x.in || 'query', required: x.in === 'path' ? true : Boolean(x.required), description: x.desc || '', schema: { type: x.type || 'string' } }));
    const reqEx = tryJson(a.request);
    if (reqEx !== undefined) op.requestBody = { required: true, content: { 'application/json': { schema: schemaFromExample(reqEx), example: reqEx } } };
    const resEx = tryJson(a.response);
    op.responses = {};
    for (const rc of (a.codes || []).filter((x) => x.code)) {
      op.responses[rc.code] = { description: rc.desc || 'Response' };
      if (/^2/.test(rc.code) && resEx !== undefined) op.responses[rc.code].content = { 'application/json': { schema: schemaFromExample(resEx), example: resEx } };
    }
    if (!Object.keys(op.responses).length) op.responses['200'] = { description: 'OK' };
    if (a.auth === 'None') op.security = [];
    else if (a.auth === 'API key') op.security = [{ apiKey: [] }];
    else if (/OAuth|JWT/.test(a.auth || '')) op.security = [{ bearerAuth: [] }];
    (paths[a.path] ||= {})[a.method.toLowerCase()] = op;
  }
  const doc = {
    openapi: '3.0.3',
    info: { title: `${p.meta.name || 'Project'} API`, version: p.meta.version || '0.1', description: p.meta.summary || '' },
    paths,
  };
  const schemes = {};
  if (usesBearer) schemes.bearerAuth = { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' };
  if (usesKey) schemes.apiKey = { type: 'apiKey', in: 'header', name: 'X-API-Key' };
  const schemas = Object.fromEntries(p.entities.map((e) => [e.name, entitySchema(e)]));
  doc.components = { schemas, ...(Object.keys(schemes).length ? { securitySchemes: schemes } : {}) };
  return `${yaml(doc).trimStart()}\n`;
}

const JSON_TYPE = { string: 'string', text: 'string', int: 'integer', decimal: 'number', boolean: 'boolean', date: 'string', datetime: 'string', uuid: 'string', email: 'string', enum: 'string', json: 'object' };
const FORMAT = { date: 'date', datetime: 'date-time', uuid: 'uuid', email: 'email' };
function entitySchema(e) {
  const props = {};
  for (const f of e.fields || []) {
    if (!f.name) continue;
    props[f.name] = { type: JSON_TYPE[f.type] || 'string' };
    if (FORMAT[f.type]) props[f.name].format = FORMAT[f.type];
    if (f.desc) props[f.name].description = f.desc;
  }
  const required = (e.fields || []).filter((f) => f.required && f.name).map((f) => f.name);
  return { type: 'object', ...(e.description ? { description: e.description } : {}), properties: props, ...(required.length ? { required } : {}) };
}
export function jsonSchemas(p) {
  return JSON.stringify(Object.fromEntries(p.entities.map((e) => [e.name, { $schema: 'https://json-schema.org/draft/2020-12/schema', title: e.name, ...entitySchema(e) }])), null, 2);
}

// ---------- SQL DDL ----------
const SQL = { string: 'VARCHAR(255)', text: 'TEXT', int: 'INTEGER', decimal: 'DECIMAL(18,2)', boolean: 'BOOLEAN', date: 'DATE', datetime: 'TIMESTAMP', uuid: 'UUID', email: 'VARCHAR(320)', enum: 'VARCHAR(50)', json: 'JSONB' };
const snake = (s) => String(s || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toLowerCase();

export function sqlDdl(p) {
  const out = [`-- ${p.meta.name || 'Project'} — logical data model (PostgreSQL dialect)`, `-- Generated by BA Builder. Review with the development team before use.`, ''];
  const fks = [];
  for (const e of p.entities) {
    const t = snake(e.name);
    const cols = (e.fields || []).filter((f) => f.name).map((f) => `  ${snake(f.name)} ${SQL[f.type] || 'VARCHAR(255)'}${f.required || f.pk ? ' NOT NULL' : ''}${f.unique && !f.pk ? ' UNIQUE' : ''}`);
    const pk = (e.fields || []).filter((f) => f.pk).map((f) => snake(f.name));
    if (pk.length) cols.push(`  PRIMARY KEY (${pk.join(', ')})`);
    if (e.description) out.push(`-- ${e.description}`);
    out.push(`CREATE TABLE ${t} (\n${cols.join(',\n')}\n);`, '');
    for (const f of (e.fields || []).filter((x) => x.fk && x.name)) {
      const target = p.entities.find((x) => x.name === f.fk);
      const tpk = target?.fields?.find((x) => x.pk)?.name || 'id';
      fks.push(`ALTER TABLE ${t} ADD CONSTRAINT fk_${t}_${snake(f.name)} FOREIGN KEY (${snake(f.name)}) REFERENCES ${snake(f.fk)} (${snake(tpk)});`);
    }
  }
  if (fks.length) out.push('-- Foreign keys', ...fks, '');
  return out.join('\n');
}

/** Requirements traceability matrix rows (used by the view, doc and CSV). */
export function rtmRows(p) {
  return p.requirements.map((r) => {
    const stories = p.stories.filter((s) => (s.requirementIds || []).includes(r.id));
    const ucs = p.usecases.filter((u) => (u.requirementIds || []).includes(r.id));
    const tests = p.tests.filter((t) => (t.requirementIds || []).includes(r.id) || (t.storyIds || []).some((sid) => stories.some((s) => s.id === sid)));
    const apis = p.apis.filter((a) => (a.requirementIds || []).includes(r.id));
    const rules = p.rules.filter((b) => (b.requirementIds || []).includes(r.id));
    return {
      r,
      objectives: (r.objectiveIds || []).map((id) => byId(p.objectives, id)?.code).filter(Boolean),
      parents: (r.parentIds || []).map((id) => byId(p.requirements, id)?.code).filter(Boolean),
      source: nameOf(p.stakeholders, r.source),
      stories: stories.map((s) => s.code), usecases: ucs.map((u) => u.code), tests: tests.map((t) => `${t.code} (${t.status})`),
      apis: apis.map((a) => `${a.method} ${a.path}`), rules: rules.map((b) => b.code),
      covered: tests.length > 0,
    };
  });
}
export function rtmCsv(p) {
  return csv(['Requirement', 'Title', 'Type', 'Priority', 'Status', 'Source', 'Objectives', 'Derived from', 'Use cases', 'Stories', 'Business rules', 'APIs', 'Tests'],
    rtmRows(p).map((x) => [x.r.code, x.r.title, x.r.type, x.r.priority, x.r.status, x.source, x.objectives.join('; '), x.parents.join('; '), x.usecases.join('; '), x.stories.join('; '), x.rules.join('; '), x.apis.join('; '), x.tests.join('; ')]));
}
