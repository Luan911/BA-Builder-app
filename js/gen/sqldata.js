// SQL workbench support: a SQLite schema from the data model, realistic sample rows that respect
// keys and foreign keys, and example queries (SELECT, WHERE, ORDER BY, JOIN, GROUP BY, data checks)
// built from the project's own entities. Pure functions — the browser runs them with sql.js.

const qi = (s) => `"${String(s).replace(/"/g, '""')}"`;
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const TYPE = { int: 'INTEGER', decimal: 'REAL', boolean: 'INTEGER' };
const pkOf = (e) => (e.fields || []).filter((f) => f.name && f.pk);

/** Entities ordered so that referenced tables come first (cycles are tolerated). */
export function tableOrder(p) {
  const byName = new Map(p.entities.map((e) => [e.name, e]));
  const out = [], seen = new Set(), busy = new Set();
  const visit = (e) => {
    if (seen.has(e) || busy.has(e)) return;
    busy.add(e);
    for (const f of e.fields || []) { const t = f.fk && byName.get(f.fk); if (t && t !== e) visit(t); }
    busy.delete(e); seen.add(e); out.push(e);
  };
  p.entities.forEach(visit);
  return out;
}

/** CREATE TABLE statements in SQLite syntax. */
export function sqliteSchema(p) {
  const byName = new Map(p.entities.map((e) => [e.name, e]));
  return tableOrder(p).map((e) => {
    const fields = (e.fields || []).filter((f) => f.name);
    const pks = pkOf(e);
    const cols = fields.map((f) => `  ${qi(f.name)} ${TYPE[f.type] || 'TEXT'}${f.required || f.pk ? ' NOT NULL' : ''}${f.unique && !f.pk ? ' UNIQUE' : ''}`);
    if (pks.length) cols.push(`  PRIMARY KEY (${pks.map((f) => qi(f.name)).join(', ')})`);
    for (const f of fields) {
      const t = f.fk && byName.get(f.fk);
      const tk = t && pkOf(t);
      if (tk && tk.length === 1) cols.push(`  FOREIGN KEY (${qi(f.name)}) REFERENCES ${qi(t.name)} (${qi(tk[0].name)})`);
    }
    return `CREATE TABLE ${qi(e.name)} (\n${cols.join(',\n')}\n);`;
  });
}

// ---------- sample data ----------
const FIRST = ['Thandi', 'Ravi', 'Ana', 'Sipho', 'Emma', 'Lerato', 'Johan', 'Aisha', 'Kabelo', 'Mia', 'Pieter', 'Zanele'];
const LAST = ['Nkosi', 'Naidoo', 'Smith', 'Dlamini', 'van Wyk', 'Mokoena', 'Pillay', 'Botha', 'Khumalo', 'Jacobs'];
const CITY = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Gqeberha', 'Bloemfontein'];
/** Small deterministic random generator so the sample data is the same every time. */
function rng(seed) { let x = seed % 2147483647 || 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; }
const pick = (r, list) => list[Math.floor(r() * list.length)];
const words = (n) => String(n || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

function valueFor(f, e, i, r) {
  const n = words(f.name);
  const enumVals = String(f.desc || '').split(/[,/]| or /).map((s) => s.trim()).filter((s) => s && s.length < 30 && !/\d{3,}/.test(s));
  if (f.type === 'uuid' || (f.pk && /\bid\b/.test(n))) return `${e.name.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
  if (f.type === 'boolean' || /^(is|has|can) /.test(n)) return r() > 0.35 ? 1 : 0;
  if (f.type === 'int') return /age/.test(n) ? 18 + Math.floor(r() * 50) : /month|term/.test(n) ? pick(r, [12, 24, 36, 48, 60]) : /score/.test(n) ? 450 + Math.floor(r() * 400) : /qty|quantity|count/.test(n) ? 1 + Math.floor(r() * 9) : Math.floor(r() * 100);
  if (f.type === 'decimal') return Math.round((/price|amount|total|balance|salary|income/.test(n) ? 500 + r() * 120000 : r() * 1000) * 100) / 100;
  if (f.type === 'date') { if (/birth|dob/.test(n)) return `19${70 + Math.floor(r() * 30)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`; return `2026-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`; }
  if (f.type === 'datetime') return `2026-${String(1 + Math.floor(r() * 11)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')} ${String(8 + Math.floor(r() * 10)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00`;
  if (f.type === 'email' || /email/.test(n)) return `${pick(r, FIRST).toLowerCase()}.${pick(r, LAST).toLowerCase().replace(/\s/g, '')}${i}@example.com`;
  if (f.type === 'enum' || /status|kind|type|category/.test(n)) return enumVals.length > 1 ? pick(r, enumVals) : pick(r, /status/.test(n) ? ['Draft', 'Submitted', 'Approved', 'Declined'] : ['A', 'B', 'C']);
  if (f.type === 'json') return JSON.stringify({ note: 'sample' });
  if (/full name|^name$|customer name/.test(n)) return `${pick(r, FIRST)} ${pick(r, LAST)}`;
  if (/first name/.test(n)) return pick(r, FIRST);
  if (/last name|surname/.test(n)) return pick(r, LAST);
  if (/city|town/.test(n)) return pick(r, CITY);
  if (/phone|mobile|cell/.test(n)) return `08${Math.floor(r() * 10)} ${String(Math.floor(r() * 1000)).padStart(3, '0')} ${String(Math.floor(r() * 10000)).padStart(4, '0')}`;
  if (/id number|national/.test(n)) return String(Math.floor(r() * 1e13)).padStart(13, '0');
  if (/ref|code|number|key/.test(n)) return `${f.name.slice(0, 3).toUpperCase()}${100000 + Math.floor(r() * 900000)}`;
  return `${f.name} ${i + 1}`;
}

/** Sample rows per entity: { [entityName]: rows[] }. Foreign keys point at real parent rows. */
export function sampleRows(p, perTable = 8) {
  const r = rng(20261123);
  const out = {};
  const byName = new Map(p.entities.map((e) => [e.name, e]));
  for (const e of tableOrder(p)) {
    const fields = (e.fields || []).filter((f) => f.name);
    const rows = [];
    const keys = new Set();
    const n = Math.max(1, Math.round(perTable * (fields.some((f) => f.fk) ? 1.5 : 1)));
    for (let i = 0; i < n; i++) {
      const row = {};
      for (const f of fields) {
        const parent = f.fk && byName.get(f.fk);
        const pk = parent && pkOf(parent)[0];
        if (pk && out[parent.name]?.length) row[f.name] = pick(r, out[parent.name])[pk.name];
        else row[f.name] = !f.required && !f.pk && !f.unique && r() < 0.08 ? null : valueFor(f, e, i, r);
      }
      const key = pkOf(e).map((f) => row[f.name]).join('|');
      if (pkOf(e).length && keys.has(key)) continue; // composite keys can collide
      keys.add(key);
      rows.push(row);
    }
    out[e.name] = rows;
  }
  return out;
}

export function insertStatements(p, data) {
  const lines = [];
  for (const e of tableOrder(p)) {
    const fields = (e.fields || []).filter((f) => f.name);
    for (const row of data[e.name] || []) lines.push(`INSERT INTO ${qi(e.name)} (${fields.map((f) => qi(f.name)).join(', ')}) VALUES (${fields.map((f) => lit(row[f.name])).join(', ')});`);
  }
  return lines;
}

/** Example queries that teach SQL using this project's tables. */
export function exampleQueries(p) {
  const ents = p.entities.filter((e) => (e.fields || []).some((f) => f.name));
  if (!ents.length) return [];
  const out = [];
  const first = ents[0];
  const col = (e, re) => (e.fields || []).find((f) => f.name && re.test(f.type || '') && !f.pk);
  out.push({ name: `All rows of ${first.name}`, purpose: 'SELECT * returns every column; LIMIT keeps the result small.', sql: `SELECT *\nFROM ${qi(first.name)}\nLIMIT 10;` });
  const num = ents.map((e) => [e, col(e, /^(decimal|int)$/)]).find(([, f]) => f);
  if (num) out.push({ name: `Filter and sort ${num[0].name} by ${num[1].name}`, purpose: 'WHERE keeps the matching rows; ORDER BY … DESC sorts from high to low.', sql: `SELECT *\nFROM ${qi(num[0].name)}\nWHERE ${qi(num[1].name)} > ${num[1].type === 'decimal' ? 10000 : 10}\nORDER BY ${qi(num[1].name)} DESC;` });
  const en = ents.map((e) => [e, (e.fields || []).find((f) => f.type === 'enum' || /status/i.test(f.name))]).find(([, f]) => f);
  if (en) out.push({ name: `Count ${en[0].name} by ${en[1].name}`, purpose: 'GROUP BY works like a pivot table: one row per value, with COUNT(*) per group.', sql: `SELECT ${qi(en[1].name)}, COUNT(*) AS total\nFROM ${qi(en[0].name)}\nGROUP BY ${qi(en[1].name)}\nORDER BY total DESC;` });
  for (const child of ents) {
    const fk = (child.fields || []).find((f) => f.fk && ents.some((e) => e.name === f.fk));
    if (!fk) continue;
    const parent = ents.find((e) => e.name === fk.fk);
    const pk = pkOf(parent)[0];
    if (!pk) continue;
    const label = (parent.fields || []).find((f) => /name|title/i.test(f.name) && !f.pk) || pk;
    out.push({ name: `Join ${child.name} to ${parent.name}`, purpose: `INNER JOIN combines rows that match on the key: each ${child.name} with its ${parent.name}.`, sql: `SELECT p.${qi(label.name)}, c.*\nFROM ${qi(child.name)} c\nINNER JOIN ${qi(parent.name)} p ON p.${qi(pk.name)} = c.${qi(fk.name)}\nLIMIT 20;` });
    out.push({ name: `How many ${child.name} rows per ${parent.name}`, purpose: 'JOIN + GROUP BY: a segment report, e.g. customers by number of orders.', sql: `SELECT p.${qi(pk.name)}, p.${qi(label.name)}, COUNT(c.${qi(fk.name)}) AS ${qi(`${child.name.toLowerCase()}_count`)}\nFROM ${qi(parent.name)} p\nLEFT JOIN ${qi(child.name)} c ON c.${qi(fk.name)} = p.${qi(pk.name)}\nGROUP BY p.${qi(pk.name)}, p.${qi(label.name)}\nORDER BY 3 DESC;` });
    out.push({ name: `${parent.name} with no ${child.name}`, purpose: 'A data-quality check: LEFT JOIN … WHERE child IS NULL finds parents with nothing linked.', sql: `SELECT p.*\nFROM ${qi(parent.name)} p\nLEFT JOIN ${qi(child.name)} c ON c.${qi(fk.name)} = p.${qi(pk.name)}\nWHERE c.${qi(fk.name)} IS NULL;` });
    break;
  }
  const req = ents.map((e) => [e, (e.fields || []).find((f) => f.required && !f.pk && !f.fk)]).find(([, f]) => f);
  if (req) out.push({ name: `Missing required ${req[1].name}`, purpose: 'Validate a requirement against data: rows that break a "required" rule.', sql: `SELECT *\nFROM ${qi(req[0].name)}\nWHERE ${qi(req[1].name)} IS NULL OR TRIM(${qi(req[1].name)}) = '';` });
  const uq = ents.map((e) => [e, (e.fields || []).find((f) => f.unique && !f.pk)]).find(([, f]) => f);
  if (uq) out.push({ name: `Duplicate ${uq[1].name} values`, purpose: 'HAVING filters groups: values that appear more than once break a uniqueness rule.', sql: `SELECT ${qi(uq[1].name)}, COUNT(*) AS times\nFROM ${qi(uq[0].name)}\nGROUP BY ${qi(uq[1].name)}\nHAVING COUNT(*) > 1;` });
  return out;
}
