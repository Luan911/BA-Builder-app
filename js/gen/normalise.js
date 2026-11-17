// Normalisation assistant: finds likely 1NF / 2NF / 3NF problems in the logical data model and
// turns each into a concrete, reviewable change (new entity, moved attributes, foreign key,
// relationship). The app cannot know the business's real functional dependencies, so the
// checks read the clues a model gives (keys, names, types) and the analyst confirms or dismisses
// each suggestion. A manual split covers dependencies only the analyst knows about.

// ---------- names ----------
/** "customerName" / "customer_name" / "Customer Name" → ["customer", "name"]. */
export function words(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}
const cap = (w) => (w ? w[0].toUpperCase() + w.slice(1) : '');
export const pascal = (ws) => ws.map(cap).join('');
const camel = (ws) => (ws.length ? ws[0] + ws.slice(1).map(cap).join('') : '');
const snake = (ws) => ws.join('_');
/** Name new attributes in the same style the entity already uses. */
const styler = (e) => ((e.fields || []).some((f) => /_/.test(f.name)) ? snake : camel);
const ID_WORDS = ['id', 'code', 'no', 'number', 'key', 'ref'];
const startsWith = (ws, stem) => stem.length && ws.length > stem.length && stem.every((w, i) => ws[i] === w);
/** "customerId" → ["customer"]; anything that is not id-like → null. */
const idStem = (ws) => (ws.length > 1 && ID_WORDS.includes(ws[ws.length - 1]) ? ws.slice(0, -1) : null);
export function singular(w) {
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ss|us|is)$/.test(w)) return w;
  if (/(ches|shes|xes|ses)$/.test(w)) return w.replace(/es$/, '');
  return w.replace(/s$/, '');
}
// first words that describe a field rather than name a separate thing
const GENERIC = new Set(['is', 'has', 'can', 'date', 'time', 'created', 'updated', 'modified', 'deleted', 'first', 'last', 'middle', 'full', 'total', 'sub', 'max', 'min', 'num', 'number', 'home', 'work', 'mobile', 'primary', 'secondary', 'start', 'end', 'due', 'valid', 'current', 'previous', 'next', 'new', 'old', 'net', 'gross', 'base', 'display', 'short', 'long', 'internal', 'external', 'approved', 'submitted', 'checked', 'storage', 'reference', 'ref', 'id', 'type', 'status', 'kind', 'unit', 'average', 'avg', 'expected', 'actual', 'planned', 'billing', 'shipping', 'delivery', 'postal', 'physical', 'line', 'amount', 'repayment', 'interest']);

export const findEntity = (p, name) => p.entities.find((e) => e.name.toLowerCase() === String(name).toLowerCase() || pascal(words(e.name)).toLowerCase() === pascal(words(name)).toLowerCase());
const pkOf = (e) => (e.fields || []).filter((f) => f.pk);

// ---------- analysis ----------
/**
 * Problems in one entity, worst first. Each issue: { id, form: '1NF' | '2NF' | '3NF', title, text, fields, fix }.
 * fix: { type: 'addKey' } | { type: 'extract', ... } | { type: 'remove', field } | null
 */
export function analyseEntity(p, e) {
  const fields = (e.fields || []).filter((f) => f.name);
  const pks = fields.filter((f) => f.pk);
  const style = styler(e);
  const own = words(e.name);
  const out = [];
  const claimed = new Set(); // fields already explained by an earlier issue

  // 1NF — a key, and one atomic value per attribute
  if (!pks.length) out.push({ id: 'nokey', form: '1NF', title: 'No primary key', text: `Nothing identifies one ${e.name} from another, so duplicate rows are possible. Add a primary key.`, fields: [], fix: { type: 'addKey', name: style(['id']) } });
  const groups = new Map();
  for (const f of fields) {
    const m = f.name.match(/^(.*?[A-Za-z])[_\s-]?(\d+)$/);
    if (!m || f.pk) continue;
    const stem = words(m[1]).join(' ');
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem).push(f);
  }
  for (const [stem, list] of groups) {
    if (list.length < 2) continue;
    const sw = stem.split(' ');
    const child = pascal([...own, ...sw.slice(0, -1), singular(sw[sw.length - 1])]);
    list.forEach((f) => claimed.add(f.name));
    out.push({ id: `repeat:${stem}`, form: '1NF', title: `Repeating group: ${list.map((f) => f.name).join(', ')}`, text: `Numbered columns hold a list in one row (and cap it at ${list.length}). Each value becomes its own row in a child table.`, fields: list.map((f) => f.name), fix: { type: 'extract', mode: 'repeat', target: child, move: list.map((f) => f.name), value: style(sw), valueType: list[0].type || 'string' } });
  }
  for (const f of fields) {
    if (f.pk || claimed.has(f.name)) continue;
    const ws = words(f.name);
    const listy = f.type === 'json' || ws.includes('list') || ws.includes('csv') || (ws[ws.length - 1] === 'ids' && ws.length > 1);
    if (!listy) continue;
    claimed.add(f.name);
    const base = ws.filter((w) => w !== 'list' && w !== 'csv');
    const one = base.length ? [...base.slice(0, -1), singular(base[base.length - 1])] : ['value'];
    out.push({ id: `multi:${f.name}`, form: '1NF', title: `Multi-valued attribute: ${f.name}`, text: `${f.name} can hold several values in one field (${f.type === 'json' ? 'JSON' : 'a list'}), which cannot be searched, validated or joined reliably. Store one value per row in a child table.`, fields: [f.name], fix: { type: 'extract', mode: 'repeat', target: pascal([...own, ...one]), move: [f.name], value: style(one), valueType: ws[ws.length - 1] === 'ids' ? 'uuid' : 'string' } });
  }

  // 2NF — with a composite key, nothing may depend on only part of it
  if (pks.length >= 2) {
    for (const k of pks) {
      const stem = idStem(words(k.name));
      if (!stem) continue;
      const dep = fields.filter((f) => !f.pk && !claimed.has(f.name) && startsWith(words(f.name), stem));
      if (!dep.length) continue;
      dep.forEach((f) => claimed.add(f.name));
      const target = findEntity(p, pascal(stem))?.name || pascal(stem);
      out.push({ id: `partial:${k.name}`, form: '2NF', title: `Partial dependency on ${k.name}`, text: `The key is (${pks.map((x) => x.name).join(', ')}), but ${dep.map((f) => f.name).join(', ')} depend${dep.length === 1 ? 's' : ''} only on ${k.name}. The same ${stem.join(' ')} details would repeat on every row. Move them to ${target}.`, fields: dep.map((f) => f.name), fix: { type: 'extract', mode: 'lookup', target, key: k.name, keyType: k.type || 'uuid', fk: k.name, stem, move: dep.map((f) => f.name) } });
    }
  }

  // 3NF — no attribute may depend on another non-key attribute
  for (const f of fields) {
    if (f.pk) continue;
    const stem = f.fk ? words(f.fk) : idStem(words(f.name));
    if (!stem || !stem.length) continue;
    if (!f.fk && (startsWith(own, stem) || stem.join() === own.join())) continue; // e.g. orderNo on OrderForm is the row's own number
    const fstem = idStem(words(f.name)) || stem; // prefix used by the copied attributes, e.g. "customer"
    const dep = fields.filter((g) => g !== f && !g.pk && !g.fk && !claimed.has(g.name) && !idStem(words(g.name)) && (startsWith(words(g.name), fstem) || startsWith(words(g.name), stem)));
    if (!dep.length) continue;
    dep.forEach((g) => claimed.add(g.name));
    const existing = f.fk ? findEntity(p, f.fk) : findEntity(p, pascal(fstem));
    const target = existing?.name || pascal(fstem);
    out.push({ id: `transitive:${f.name}`, form: '3NF', title: `Transitive dependency through ${f.name}`, text: `${dep.map((g) => g.name).join(', ')} describe${dep.length === 1 ? 's' : ''} the ${fstem.join(' ')}, not the ${e.name}: they depend on ${f.name}, which is not the key. ${existing ? `${existing.name} already exists, so keep only the foreign key here.` : `Move them to a new ${target} entity.`}`, fields: dep.map((g) => g.name), fix: { type: 'extract', mode: 'lookup', target, key: existing ? pkOf(existing)[0]?.name || 'id' : pks.length === 1 && pks[0].name !== 'id' ? f.name : style(['id']), keyType: f.type || 'uuid', fk: f.name, stem: fstem, move: dep.map((g) => g.name) } });
  }
  // attributes that share a prefix naming another thing, with no key for it yet (e.g. branchName, branchCity)
  const prefix = new Map();
  for (const f of fields) {
    if (f.pk || f.fk || claimed.has(f.name)) continue;
    const ws = words(f.name);
    if (ws.length < 2 || GENERIC.has(ws[0]) || ws[0] === own[0] || ID_WORDS.includes(ws[ws.length - 1])) continue;
    if (!prefix.has(ws[0])) prefix.set(ws[0], []);
    prefix.get(ws[0]).push(f);
  }
  for (const [w, list] of prefix) {
    if (list.length < 2) continue;
    list.forEach((f) => claimed.add(f.name));
    const existing = findEntity(p, pascal([w]));
    const target = existing?.name || pascal([w]);
    out.push({ id: `group:${w}`, form: '3NF', title: `Attributes of another thing: ${list.map((f) => f.name).join(', ')}`, text: `These describe a ${w}, not the ${e.name}. If one ${w} is used by many ${e.name} rows, its details repeat and can disagree. Give ${target} its own entity and keep a foreign key here. (Dismiss this if each ${e.name} really has its own ${w} details.)`, fields: list.map((f) => f.name), fix: { type: 'extract', mode: 'lookup', target, key: existing ? pkOf(existing)[0]?.name || 'id' : style(['id']), keyType: 'uuid', fk: style([w, 'id']), newFk: true, stem: [w], move: list.map((f) => f.name) } });
  }
  // stored calculations depend on other attributes too
  const has = (re) => fields.some((f) => re.test(words(f.name).join(' ')));
  for (const f of fields) {
    if (f.pk || claimed.has(f.name)) continue;
    const ws = words(f.name);
    let why = '';
    if (ws.includes('age') && has(/\b(birth|dob)\b/)) why = 'it can be calculated from the date of birth';
    else if ((ws.includes('total') || ws.includes('subtotal')) && has(/\b(price|quantity|qty|amount)\b/) && ws.join(' ') !== 'amount') why = 'it can be calculated from the other amounts';
    if (why) out.push({ id: `derived:${f.name}`, form: '3NF', title: `Derived value: ${f.name}`, text: `${f.name} depends on other attributes (${why}), so it can go stale. Calculate it when needed, or document why it is stored (e.g. a snapshot at a point in time).`, fields: [f.name], fix: { type: 'remove', field: f.name } });
  }
  const dismissed = new Set(e.normIgnore || []);
  return out.filter((i) => !dismissed.has(i.id));
}

/** Highest normal form the entity reaches given the open issues: 0, 1, 2 or 3. */
export function normalForm(issues) {
  if (issues.some((i) => i.form === '1NF')) return 0;
  if (issues.some((i) => i.form === '2NF')) return 1;
  if (issues.some((i) => i.form === '3NF')) return 2;
  return 3;
}

export function analyseModel(p) {
  return p.entities.map((e) => { const issues = analyseEntity(p, e); return { entity: e, issues, nf: normalForm(issues) }; });
}

// ---------- applying changes ----------
const uidLocal = (pre) => `${pre}_${Math.random().toString(36).slice(2, 10)}`;
function link(p, from, to, label) {
  if (p.relationships.some((r) => (r.from === from.id && r.to === to.id) || (r.from === to.id && r.to === from.id))) return;
  p.relationships.push({ id: uidLocal('rel'), from: from.id, to: to.id, card: 'one-to-many', label });
}
function newEntity(p, name, source, keyField) {
  const e = { id: uidLocal('ent'), name, area: source.area || '', description: `Created when normalising ${source.name}.`, classification: source.classification || 'Internal', fields: [{ name: keyField.name, type: keyField.type || 'uuid', pk: true, required: true, unique: true }] };
  p.entities.push(e);
  return e;
}

/** Apply one fix to the project (mutates it). Returns a short description of what changed. */
export function applyFix(p, entityId, fix) {
  const src = p.entities.find((e) => e.id === entityId);
  if (!src || !fix) return '';
  const style = styler(src);
  if (fix.type === 'addKey') {
    let name = fix.name;
    while (src.fields.some((f) => f.name === name)) name = `${name}_`;
    src.fields.unshift({ name, type: 'uuid', pk: true, required: true, unique: true });
    return `Added primary key ${name} to ${src.name}.`;
  }
  if (fix.type === 'remove') {
    src.fields = src.fields.filter((f) => f.name !== fix.field);
    return `Removed ${fix.field} from ${src.name}; calculate it when needed.`;
  }
  if (fix.type !== 'extract') return '';
  const moving = src.fields.filter((f) => fix.move.includes(f.name));
  if (fix.mode === 'repeat') {
    // child table: one row per value, pointing back to the parent
    const parentKey = pkOf(src)[0] || { name: 'id', type: 'uuid' };
    const fkName = style([...words(src.name), 'id']);
    let child = findEntity(p, fix.target);
    if (!child) child = newEntity(p, fix.target, src, { name: style(['id']), type: 'uuid' });
    if (!child.fields.some((f) => f.name === fkName)) child.fields.push({ name: fkName, type: parentKey.type || 'uuid', required: true, fk: src.name });
    if (!child.fields.some((f) => f.name === fix.value)) child.fields.push({ name: fix.value, type: fix.valueType || 'string', required: true, desc: `One value per row (was ${moving.map((f) => f.name).join(', ')} on ${src.name})` });
    if (fix.move.length > 1) child.fields.push({ name: style(['position']), type: 'int', desc: 'Order of the value, if it matters' });
    src.fields = src.fields.filter((f) => !fix.move.includes(f.name));
    link(p, src, child, 'has');
    return `Moved ${fix.move.join(', ')} from ${src.name} into ${child.name} (one row per value).`;
  }
  // lookup: move the dependent attributes to the entity they describe, keep a foreign key here
  let target = findEntity(p, fix.target);
  const created = !target;
  if (!target) target = newEntity(p, fix.target, src, { name: fix.key, type: fix.keyType });
  const moved = [];
  for (const f of moving) {
    const rest = startsWith(words(f.name), fix.stem || []) ? words(f.name).slice(fix.stem.length) : words(f.name);
    let name = rest.length ? style(rest) : f.name;
    // the target may already hold it, maybe under a longer name (customerName ↔ Customer.fullName)
    const same = !created && target.fields.find((x) => x.name === name || (rest.length && words(x.name).slice(-rest.length).join(' ') === rest.join(' ')));
    if (same) { moved.push(`${f.name} (already in ${target.name} as ${same.name})`); continue; }
    if (target.fields.some((x) => x.name === name)) name = f.name;
    target.fields.push({ ...f, name, pk: false, unique: false, fk: f.fk || '' });
    moved.push(name === f.name ? f.name : `${f.name} → ${name}`);
  }
  src.fields = src.fields.filter((f) => !fix.move.includes(f.name));
  let fk = src.fields.find((f) => f.name === fix.fk);
  if (!fk) { fk = { name: fix.fk, type: (pkOf(target)[0] || {}).type || 'uuid', required: true }; src.fields.push(fk); }
  fk.fk = target.name;
  link(p, target, src, 'is used by');
  return `${created ? 'Created' : 'Updated'} ${target.name}: moved ${moved.join(', ')}. ${src.name}.${fk.name} now references ${target.name}.`;
}

/** Manual split: move chosen attributes to a (new or existing) entity they really depend on. */
export function manualSplit(p, entityId, { target, move, keyName, many = false }) {
  const src = p.entities.find((e) => e.id === entityId);
  if (!src || !target || !move.length) return '';
  const style = styler(src);
  const existing = findEntity(p, target);
  if (many) {
    // one source row has many target rows (e.g. an order has many order lines): the target points back
    let child = existing;
    if (!child) child = newEntity(p, pascal(words(target)), src, { name: style(['id']), type: 'uuid' });
    const fkName = style([...words(src.name), 'id']);
    if (!child.fields.some((f) => f.name === fkName)) child.fields.push({ name: fkName, type: (pkOf(src)[0] || {}).type || 'uuid', required: true, fk: src.name });
    const moved = src.fields.filter((f) => move.includes(f.name));
    for (const f of moved) if (!child.fields.some((x) => x.name === f.name)) child.fields.push({ ...f, pk: false, unique: false });
    src.fields = src.fields.filter((f) => !move.includes(f.name));
    link(p, src, child, 'has');
    return `Moved ${move.join(', ')} to ${child.name}; each ${src.name} can now have many ${child.name} rows.`;
  }
  const key = existing ? pkOf(existing)[0]?.name || 'id' : keyName || style(['id']);
  return applyFix(p, entityId, { type: 'extract', mode: 'lookup', target: existing?.name || pascal(words(target)), key, keyType: 'uuid', fk: style([...words(target), 'id']), stem: words(target), move });
}

/** Apply every suggestion (except removals of derived values) until the model is in 3NF or nothing changes. */
export function applyAll(p, entityIds = null) {
  const log = [];
  for (let guard = 0; guard < 200; guard++) {
    const ents = p.entities.filter((e) => !entityIds || entityIds.includes(e.id) || e.description?.startsWith('Created when normalising'));
    let did = false;
    for (const e of ents) {
      const issue = analyseEntity(p, e).find((i) => i.fix && i.fix.type !== 'remove');
      if (!issue) continue;
      const msg = applyFix(p, e.id, issue.fix);
      if (msg) { log.push(msg); did = true; break; }
    }
    if (!did) break;
  }
  return log;
}

/** A small, deliberately unnormalised table for learning and testing. */
export function practiceEntity() {
  return {
    name: 'OrderForm', area: 'Practice', classification: 'Internal', description: 'Practice table: everything from a paper order form in one place. Normalise it to 3NF.',
    fields: [
      { name: 'orderNo', type: 'string' }, { name: 'orderDate', type: 'date' },
      { name: 'customerId', type: 'uuid' }, { name: 'customerName', type: 'string' }, { name: 'customerEmail', type: 'email' },
      { name: 'branchName', type: 'string' }, { name: 'branchCity', type: 'string' },
      { name: 'product1', type: 'string' }, { name: 'product2', type: 'string' }, { name: 'product3', type: 'string' },
      { name: 'tags', type: 'json' }, { name: 'quantity', type: 'int' }, { name: 'unitPrice', type: 'decimal' }, { name: 'orderTotal', type: 'decimal' },
    ],
  };
}
