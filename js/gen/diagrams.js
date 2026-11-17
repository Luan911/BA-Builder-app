// Diagram generators: Mermaid source built from project data, always in sync.
import { byId, nameOf, rice, wsjf } from '../model.js';
import { estimate, daysBetween } from '../estimate.js';

const q = (s) => `"${String(s ?? '').replace(/["“”]/g, "'").replace(/[\r\n]+/g, ' ').replace(/[<>{}[\]|#;]/g, ' ').trim() || ' '}"`;
const id = (pre, s) => `${pre}_${String(s ?? '').replace(/[^A-Za-z0-9]/g, '_') || 'x'}`;
const word = (s) => String(s ?? '').replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() || 'Item';
export { id as nodeId };
const ident = (s) => String(s ?? '').replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'Unnamed';

// Above these sizes diagrams switch to a condensed view: Mermaid's layout time grows
// much faster than the number of boxes, and a 60-second freeze helps nobody.
export const LIMITS = { traceNodes: 150, traceSummaryReqs: 80, modelEntities: 25, erdMax: 70, classMax: 40, partReqs: 40, partEntities: 20, focusNodes: 120, docReqs: 8, docEntities: 5 };

/** For very big data models: keep the most-connected entities. Returns { list, hidden }. */
function topEntities(p, max) {
  if (p.entities.length <= max) return { list: p.entities, hidden: 0 };
  const degree = new Map(p.entities.map((e) => [e.id, 0]));
  for (const r of p.relationships) for (const k of [r.from, r.to]) if (degree.has(k)) degree.set(k, degree.get(k) + 1);
  const keep = new Set([...p.entities].sort((a, b) => degree.get(b.id) - degree.get(a.id)).slice(0, max).map((e) => e.id));
  return { list: p.entities.filter((e) => keep.has(e.id)), hidden: p.entities.length - keep.size };
}

const STYLE = [
  'classDef start fill:#0d2416,stroke:#22c55e,stroke-width:2px,color:#f2f2f2',
  'classDef finish fill:#2a0e0e,stroke:#ef4444,stroke-width:2px,color:#f2f2f2',
  'classDef decision fill:#1a0b0b,stroke:#ef4444,color:#f2f2f2',
  'classDef task fill:#0d2416,stroke:#22c55e,color:#f2f2f2',
  'classDef sub fill:#111111,stroke:#4ade80,stroke-dasharray:4 3,color:#f2f2f2',
  'classDef pain stroke:#ef4444,stroke-width:3px',
];

// ---------- Process (BPMN-style swimlanes) ----------
export function processDiagram(p, pr, { lanes = true, direction = 'LR' } = {}) {
  const steps = (pr?.steps || []).filter((s) => s.id);
  const L = [`flowchart ${direction}`];
  const node = (s) => {
    const n = id('S', s.id);
    if (s.kind === 'start') return `${n}((${q(s.label || 'Start')})):::start`;
    if (s.kind === 'end') return `${n}(((${q(s.label || 'End')}))):::finish`;
    if (s.kind === 'decision') return `${n}{${q(s.label)}}:::decision`;
    if (s.kind === 'subprocess') return `${n}[[${q(s.label)}]]:::sub`;
    return `${n}(${q(s.label)}):::task`;
  };
  if (lanes) {
    const names = [...new Set(steps.map((s) => s.lane || 'Unassigned'))];
    for (const lane of names) {
      L.push(`  subgraph ${id('L', lane)}[${q(lane)}]`, '    direction LR');
      for (const s of steps.filter((x) => (x.lane || 'Unassigned') === lane)) L.push(`    ${node(s)}`);
      L.push('  end');
    }
  } else steps.forEach((s) => L.push(`  ${node(s)}`));
  const has = new Set(steps.map((s) => s.id));
  steps.forEach((s, i) => {
    const from = id('S', s.id);
    if (s.kind === 'end') return;
    if (s.kind === 'decision') {
      if (has.has(s.yes)) L.push(`  ${from} -->|Yes| ${id('S', s.yes)}`);
      if (has.has(s.no)) L.push(`  ${from} -->|No| ${id('S', s.no)}`);
      return;
    }
    const targets = String(s.next || steps[i + 1]?.id || '').split(/[,\s]+/).filter((t) => has.has(t));
    targets.forEach((t) => L.push(`  ${from} --> ${id('S', t)}`));
  });
  const pains = steps.filter((s) => s.pain).map((s) => id('S', s.id));
  if (pains.length) L.push(`  class ${pains.join(',')} pain`);
  L.push(...STYLE.map((c) => `  ${c}`));
  return L.join('\n');
}

// ---------- Use case diagram ----------
export function useCaseDiagram(p) {
  const L = ['flowchart LR'];
  const used = new Set(p.usecases.flatMap((u) => [u.primary, ...(u.secondary || [])]).filter(Boolean));
  const actors = p.personas.filter((a) => used.has(a.id));
  const humans = actors.filter((a) => a.kind !== 'System');
  const systems = actors.filter((a) => a.kind === 'System');
  humans.forEach((a) => L.push(`  ${id('A', a.id)}[${q(`👤 ${a.name}`)}]`));
  L.push(`  subgraph SYS[${q(p.meta.name || 'System')}]`, '    direction TB');
  p.usecases.forEach((u) => L.push(`    ${id('U', u.id)}([${q(`${u.code} ${u.name}`)}])`));
  L.push('  end');
  systems.forEach((a) => L.push(`  ${id('A', a.id)}[${q(`⚙ ${a.name}`)}]`));
  for (const u of p.usecases) {
    if (u.primary) L.push(`  ${id('A', u.primary)} --- ${id('U', u.id)}`);
    for (const s of u.secondary || []) L.push(`  ${id('U', u.id)} --- ${id('A', s)}`);
    for (const inc of u.includes || []) if (byId(p.usecases, inc)) L.push(`  ${id('U', u.id)} -.->|include| ${id('U', inc)}`);
  }
  L.push('  classDef default fill:#0d2416,stroke:#22c55e,color:#f2f2f2');
  if (!p.usecases.length) L.push(`  EMPTY[${q('Add use cases to draw this diagram')}]`);
  return L.join('\n');
}

// ---------- Sequence diagram from a use case main flow ----------
export function sequenceDiagram(p, uc) {
  const L = ['sequenceDiagram', '  autonumber'];
  if (!uc) return `${L.join('\n')}\n  participant S as System\n  Note over S: Add a use case with steps`;
  const primary = byId(p.personas, uc.primary);
  const others = (uc.secondary || []).map((x) => byId(p.personas, x)).filter(Boolean);
  L.push(`  actor P as ${word(primary?.name || 'User')}`, `  participant S as ${word(p.meta.name || 'System')}`);
  others.forEach((o, i) => L.push(`  participant O${i} as ${word(o.name)}`));
  const pname = (primary?.name || 'user').toLowerCase();
  for (const raw of uc.main || []) {
    const step = String(raw).replace(/[:;#]/g, ' ').trim();
    const low = step.toLowerCase();
    const oi = others.findIndex((o) => low.includes(o.name.toLowerCase()));
    if (oi >= 0) {
      L.push(`  S->>O${oi}: ${step}`, `  O${oi}-->>S: response`);
    } else if (low.startsWith('system')) L.push(`  S-->>P: ${step}`);
    else if (low.startsWith(pname) || !low.startsWith('system')) L.push(`  P->>S: ${step}`);
  }
  for (const a of uc.alt || []) L.push(`  Note over P,S: Alt ${String(a).replace(/[:;#]/g, ' ').slice(0, 90)}`);
  return L.join('\n');
}

// ---------- ERD ----------
const CARD = { 'one-to-one': '||--||', 'one-to-many': '||--o{', 'many-to-many': '}o--o{', 'zero-or-one-to-many': '|o--o{' };
export function erd(p, only = null, { compact: keysOnly = false, stubs = true } = {}) {
  const L = ['erDiagram'];
  const compact = keysOnly || (!only && p.entities.length > LIMITS.modelEntities);
  const { list: ents, hidden } = only ? { list: stubs ? withNeighbours(p, only) : only, hidden: 0 } : topEntities(p, LIMITS.erdMax);
  const isStub = (e) => only && !only.includes(e);
  if (hidden) L.push(`  MORE_ENTITIES_NOT_SHOWN { string hidden_${hidden}_entities "see the data dictionary" }`);
  for (const e of ents) {
    L.push(`  ${ident(e.name)} {`);
    const fields = (e.fields || []).filter((f) => f.name);
    if (isStub(e)) { L.push(`    string other_area "${word(e.area || 'other part of the model')}"`, '  }'); continue; }
    const shown = compact ? fields.filter((f) => f.pk || f.fk || f.unique) : fields;
    if (compact && shown.length < fields.length) L.push(`    string more_${fields.length - shown.length}_fields`);
    for (const f of shown) {
      const keys = [f.pk && 'PK', f.fk && 'FK', f.unique && !f.pk && 'UK'].filter(Boolean).join(', ');
      L.push(`    ${ident(f.type || 'string')} ${ident(f.name)}${keys ? ` ${keys}` : ''}`);
    }
    L.push('  }');
  }
  const pairs = new Set();
  for (const r of p.relationships) {
    const a = byId(ents, r.from), b = byId(ents, r.to);
    if (!a || !b) continue;
    pairs.add(`${a.name}>${b.name}`);
    L.push(`  ${ident(a.name)} ${CARD[r.card] || '||--o{'} ${ident(b.name)} : ${q(r.label || 'relates to')}`);
  }
  for (const e of ents) for (const f of isStub(e) ? [] : e.fields || []) {
    if (f.fk && ents.some((x) => x.name === f.fk) && !pairs.has(`${f.fk}>${e.name}`)) {
      pairs.add(`${f.fk}>${e.name}`);
      L.push(`  ${ident(f.fk)} ||--o{ ${ident(e.name)} : ${q(f.name)}`);
    }
  }
  if (!p.entities.length) L.push('  NO_ENTITIES_YET { string add_entities }');
  return L.join('\n');
}

// ---------- Class diagram ----------
export function classDiagram(p, only = null, { compact: keysOnly = false, stubs = true } = {}) {
  const L = ['classDiagram'];
  const compact = keysOnly || (!only && p.entities.length > LIMITS.modelEntities);
  const { list: ents, hidden } = only ? { list: stubs ? withNeighbours(p, only) : only, hidden: 0 } : topEntities(p, LIMITS.classMax);
  if (hidden) L.push(`  class More_${hidden}_entities_not_shown`, `  note for More_${hidden}_entities_not_shown "Showing the ${ents.length} most-connected entities. The data dictionary lists all of them."`);
  for (const e of ents) {
    if (only && !only.includes(e)) { L.push(`  class ${ident(e.name)}`, `  <<${ident(e.area || 'other_area')}>> ${ident(e.name)}`); continue; }
    L.push(`  class ${ident(e.name)} {`);
    const fields = (e.fields || []).filter((f) => f.name);
    const shown = compact ? fields.filter((f) => f.pk || f.fk) : fields;
    for (const f of shown) L.push(`    ${f.pk ? '+' : '-'}${ident(f.type || 'string')} ${ident(f.name)}`);
    if (compact && shown.length < fields.length) L.push(`    -more_${fields.length - shown.length}_attributes`);
    L.push('  }');
    const st = p.states.find((s) => s.entity === e.id);
    if (st) L.push(`  <<stateful>> ${ident(e.name)}`);
  }
  const MULT = { 'one-to-one': ['"1"', '"1"'], 'one-to-many': ['"1"', '"*"'], 'many-to-many': ['"*"', '"*"'], 'zero-or-one-to-many': ['"0..1"', '"*"'] };
  for (const r of p.relationships) {
    const a = byId(ents, r.from), b = byId(ents, r.to);
    if (!a || !b) continue;
    const [m1, m2] = MULT[r.card] || MULT['one-to-many'];
    L.push(`  ${ident(a.name)} ${m1} --> ${m2} ${ident(b.name)} : ${word(r.label || 'has')}`);
  }
  if (!p.entities.length) L.push('  class Empty');
  return L.join('\n');
}

// ---------- State machine ----------
export function stateDiagram(p, sm) {
  const L = ['stateDiagram-v2'];
  if (!sm) return `${L[0]}\n  [*] --> AddAStateMachine`;
  const names = [...new Set([sm.initial, ...(sm.transitions || []).flatMap((t) => [t.from, t.to])].filter(Boolean))];
  const sid = (n) => `st${names.indexOf(n)}`;
  names.forEach((n) => L.push(`  state ${q(n)} as ${sid(n)}`));
  if (sm.initial) L.push(`  [*] --> ${sid(sm.initial)}`);
  for (const t of sm.transitions || []) {
    if (!t.from || !t.to) continue;
    const label = [t.event, t.guard && `[${t.guard}]`].filter(Boolean).join(' ').replace(/[:;#]/g, ' ').replace(/[[\]]/g, (c) => (c === '[' ? '(' : ')'));
    L.push(`  ${sid(t.from)} --> ${sid(t.to)}${label ? ` : ${label}` : ''}`);
  }
  for (const f of sm.finals || []) if (names.includes(f)) L.push(`  ${sid(f)} --> [*]`);
  return L.join('\n');
}

// ---------- System context (C4 level 1 style) ----------
export function contextDiagram(p) {
  const L = ['flowchart LR'];
  const humans = p.personas.filter((a) => a.kind !== 'System');
  humans.forEach((a) => L.push(`  ${id('H', a.id)}[${q(`👤 ${a.name}`)}]:::person`));
  L.push(`  SYS[${q(`${p.meta.name || 'The solution'}`)}]:::sys`);
  humans.forEach((a) => L.push(`  ${id('H', a.id)} -->|uses| SYS`));
  const ext = new Map();
  for (const i of p.integrations) ext.set(i.system, i);
  for (const a of p.personas.filter((x) => x.kind === 'System')) if (!ext.has(a.name)) ext.set(a.name, { system: a.name, direction: 'Two-way', protocol: '' });
  [...ext.values()].forEach((i, n) => {
    const x = `X${n}`;
    L.push(`  ${x}[${q(`⚙ ${i.system}`)}]:::ext`);
    const lab = q([i.protocol, i.frequency].filter(Boolean).join(' · ') || 'integrates');
    if (i.direction === 'Inbound') L.push(`  ${x} -->|${lab}| SYS`);
    else if (i.direction === 'Two-way') L.push(`  SYS <-->|${lab}| ${x}`);
    else L.push(`  SYS -->|${lab}| ${x}`);
  });
  L.push('  classDef person fill:#2a0e0e,stroke:#ef4444,color:#f2f2f2', '  classDef sys fill:#22c55e,stroke:#15803d,color:#000000,font-weight:bold', '  classDef ext fill:#111111,stroke:#8c8c8c,color:#f2f2f2');
  return L.join('\n');
}

// ---------- Stakeholder power / interest grid ----------
const LV = { High: 0.82, Medium: 0.5, Low: 0.18 };
const jitter = (i) => ((i * 37) % 11) / 100 - 0.05;
export function stakeholderMap(p) {
  const L = ['quadrantChart', '  title Stakeholder power / interest', '  x-axis Low interest --> High interest', '  y-axis Low power --> High power',
    '  quadrant-1 Manage closely', '  quadrant-2 Keep satisfied', '  quadrant-3 Monitor', '  quadrant-4 Keep informed'];
  const seen = new Set();
  p.stakeholders.forEach((s, i) => {
    let n = word(s.name).slice(0, 28);
    while (seen.has(n)) n += ' ';
    seen.add(n);
    const x = Math.min(0.97, Math.max(0.03, (LV[s.interest] ?? 0.5) + jitter(i)));
    const y = Math.min(0.97, Math.max(0.03, (LV[s.power] ?? 0.5) + jitter(i + 3)));
    L.push(`  ${n}: [${x.toFixed(2)}, ${y.toFixed(2)}]`);
  });
  return L.join('\n');
}

// ---------- Value vs effort (prioritisation) ----------
export function valueEffort(p) {
  const L = ['quadrantChart', '  title Value vs effort', '  x-axis Low effort --> High effort', '  y-axis Low value --> High value',
    '  quadrant-1 Major projects', '  quadrant-2 Quick wins', '  quadrant-3 Fill-ins', '  quadrant-4 Thankless tasks'];
  const scored = p.stories.filter((s) => +s.jobSize || +s.effort);
  const maxV = Math.max(1, ...scored.map((s) => (+s.bv || 0) + (+s.tc || 0) + (+s.rr || 0)));
  const maxE = Math.max(1, ...scored.map((s) => +s.jobSize || +s.effort || 0));
  scored.forEach((s) => {
    const v = ((+s.bv || 0) + (+s.tc || 0) + (+s.rr || 0)) / maxV;
    const e = (+s.jobSize || +s.effort || 0) / maxE;
    L.push(`  ${word(s.code)}: [${Math.min(0.97, Math.max(0.03, e * 0.94)).toFixed(2)}, ${Math.min(0.97, Math.max(0.03, v * 0.94)).toFixed(2)}]`);
  });
  if (!scored.length) L.push('  Add WSJF scores: [0.5, 0.5]');
  return L.join('\n');
}

// ---------- Roadmap (Gantt) ----------
export function roadmap(p) {
  const L = ['gantt', `  title ${word(p.meta.name || 'Roadmap')}`, '  dateFormat YYYY-MM-DD', '  axisFormat %b %Y'];
  const rels = p.releases.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.start || '') && /^\d{4}-\d{2}-\d{2}$/.test(r.end || ''));
  if (!rels.length) return `${L.join('\n')}\n  section Plan\n  Add releases with dates :a1, 2027-01-01, 30d`;
  L.push('  section Releases');
  rels.forEach((r, i) => L.push(`  ${word(r.name).slice(0, 60)} :r${i}, ${r.start}, ${r.end}`));
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.charter.deadline || '')) L.push('  section Milestones', `  Target date :milestone, m1, ${p.charter.deadline}, 0d`);
  return L.join('\n');
}

// ---------- Delivery schedule (from the cost & time estimate) ----------
export function schedule(p) {
  const e = estimate(p);
  const L = ['gantt', `  title ${word(`${p.meta.name || 'Project'} delivery schedule`)}`, '  dateFormat YYYY-MM-DD', '  axisFormat %d %b', '  excludes weekends'];
  const dated = e.phases.filter((ph) => ph.start && ph.end);
  if (!dated.length) return `${L.join('\n')}\n  section Plan\n  Add work items and a start date :a1, 2027-01-04, 5d`;
  L.push('  section Phases');
  dated.forEach((ph, i) => L.push(`  ${word(ph.phase)} ${ph.days}d :${e.late && i === dated.length - 1 ? 'crit, ' : ''}ph${i}, ${ph.start}, ${daysBetween(ph.start, ph.end) + 1}d`));
  if (e.deadline && /^\d{4}-\d{2}-\d{2}$/.test(e.deadline)) L.push('  section Milestones', `  Target date :milestone, m1, ${e.deadline}, 0d`);
  return L.join('\n');
}

// ---------- Scope mind map ----------
export function mindmap(p) {
  const t = (s) => word(s).slice(0, 60);
  const L = ['mindmap', `  root((${t(p.meta.code || p.meta.name || 'Project')}))`];
  if (p.objectives.length) { L.push('    Objectives'); p.objectives.forEach((o) => L.push(`      ${t(o.title)}`)); }
  if (p.charter.scopeIn.length) { L.push('    In scope'); p.charter.scopeIn.forEach((s) => L.push(`      ${t(s)}`)); }
  if (p.charter.scopeOut.length) { L.push('    Out of scope'); p.charter.scopeOut.forEach((s) => L.push(`      ${t(s)}`)); }
  const epics = [...new Set(p.stories.map((s) => s.epic).filter(Boolean))];
  if (epics.length) { L.push('    Epics'); epics.forEach((e) => L.push(`      ${t(e)}`)); }
  if (p.personas.length) { L.push('    Users and systems'); p.personas.forEach((x) => L.push(`      ${t(x.name)}`)); }
  if (L.length === 2) L.push('    Add objectives and scope');
  return L.join('\n');
}

// ---------- Traceability graph ----------
export function traceGraph(p, { full = false } = {}) {
  const total = p.objectives.length + p.requirements.length + p.stories.length + p.tests.length;
  if (!full && total > LIMITS.traceNodes) return traceSummary(p);
  const L = ['flowchart LR'];
  p.objectives.forEach((o) => L.push(`  ${id('O', o.id)}[${q(`${o.code} ${o.title}`)}]:::obj`));
  p.requirements.forEach((r) => L.push(`  ${id('R', r.id)}[${q(`${r.code} ${r.title}`)}]:::req`));
  p.stories.forEach((s) => L.push(`  ${id('U', s.id)}[${q(s.code)}]:::story`));
  p.tests.forEach((t) => L.push(`  ${id('T', t.id)}[${q(`${t.code} ${t.status}`)}]:::${t.status === 'Passed' ? 'pass' : t.status === 'Failed' ? 'fail' : 'test'}`));
  for (const r of p.requirements) {
    (r.objectiveIds || []).forEach((o) => byId(p.objectives, o) && L.push(`  ${id('O', o)} --> ${id('R', r.id)}`));
    (r.parentIds || []).forEach((x) => byId(p.requirements, x) && L.push(`  ${id('R', x)} --> ${id('R', r.id)}`));
  }
  for (const s of p.stories) (s.requirementIds || []).forEach((r) => byId(p.requirements, r) && L.push(`  ${id('R', r)} --> ${id('U', s.id)}`));
  for (const t of p.tests) {
    (t.requirementIds || []).forEach((r) => byId(p.requirements, r) && L.push(`  ${id('R', r)} -.-> ${id('T', t.id)}`));
    (t.storyIds || []).forEach((s) => byId(p.stories, s) && L.push(`  ${id('U', s)} -.-> ${id('T', t.id)}`));
  }
  L.push('  classDef obj fill:#2a0e0e,stroke:#ef4444,color:#f2f2f2', '  classDef req fill:#0d2416,stroke:#22c55e,color:#f2f2f2', '  classDef story fill:#111111,stroke:#4ade80,color:#f2f2f2', '  classDef test fill:#111111,stroke:#8c8c8c,color:#f2f2f2', '  classDef pass fill:#22c55e,stroke:#15803d,color:#000000', '  classDef fail fill:#ef4444,stroke:#b91c1c,color:#000000');
  return L.join('\n');
}

/** Condensed trace graph for big projects: objectives → requirements, with story and test counts in each box. */
function traceSummary(p) {
  const L = ['flowchart LR'];
  const live = p.requirements.filter((r) => r.status !== 'Rejected');
  const rank = { Must: 0, Should: 1, Could: 2, "Won't": 3 };
  const reqs = [...live].sort((a, b) => (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4)).slice(0, LIMITS.traceSummaryReqs);
  const shown = new Set(reqs.map((r) => r.id));
  L.push(`  NOTE[${q(`Large project: showing ${reqs.length} of ${live.length} requirements (Must first) with story and test counts. Use Traceability for the full matrix.`)}]:::note`);
  p.objectives.forEach((o) => L.push(`  ${id('O', o.id)}[${q(`${o.code} ${o.title}`.slice(0, 70))}]:::obj`));
  for (const r of reqs) {
    const st = p.stories.filter((s) => (s.requirementIds || []).includes(r.id)).length;
    const tests = p.tests.filter((t) => (t.requirementIds || []).includes(r.id));
    const passed = tests.filter((t) => t.status === 'Passed').length;
    const cls = !tests.length ? 'req' : tests.some((t) => t.status === 'Failed') ? 'fail' : passed === tests.length ? 'pass' : 'req';
    L.push(`  ${id('R', r.id)}[${q(`${r.code} ${r.title}`.slice(0, 60) + ` · ${st} stories · ${passed}/${tests.length} tests`)}]:::${cls}`);
  }
  for (const r of reqs) {
    (r.objectiveIds || []).forEach((o) => byId(p.objectives, o) && L.push(`  ${id('O', o)} --> ${id('R', r.id)}`));
    (r.parentIds || []).forEach((x) => shown.has(x) && L.push(`  ${id('R', x)} --> ${id('R', r.id)}`));
  }
  L.push('  classDef note fill:#141414,stroke:#383838,color:#8c8c8c', '  classDef obj fill:#2a0e0e,stroke:#ef4444,color:#f2f2f2', '  classDef req fill:#0d2416,stroke:#22c55e,color:#f2f2f2', '  classDef pass fill:#22c55e,stroke:#15803d,color:#000000', '  classDef fail fill:#ef4444,stroke:#b91c1c,color:#000000');
  return L.join('\n');
}

// ---------- Splitting big models into readable parts ----------
const chunk = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** One trace graph per objective (split into parts if an objective has many requirements), plus unlinked ones. */
export function traceParts(p, { size = LIMITS.partReqs, summary = false } = {}) {
  const live = p.requirements.filter((r) => r.status !== 'Rejected');
  const groups = p.objectives.map((o) => [`${o.code} ${o.title}`, [o], live.filter((r) => (r.objectiveIds || []).includes(o.id))]);
  const unlinked = live.filter((r) => !(r.objectiveIds || []).some((x) => byId(p.objectives, x)));
  if (unlinked.length) groups.push(['Not linked to an objective', [], unlinked]);
  const out = [];
  for (const [name, objs, reqs] of groups) {
    if (!reqs.length) continue;
    const parts = chunk(reqs, size);
    parts.forEach((part, i) => {
      const title = `${name}${parts.length > 1 ? ` (part ${i + 1} of ${parts.length})` : ''}`;
      if (summary) return out.push({ title, code: traceCompact(p, objs, part) });
      const ids = new Set(part.map((r) => r.id));
      const stories = p.stories.filter((s) => (s.requirementIds || []).some((r) => ids.has(r)));
      const sids = new Set(stories.map((s) => s.id));
      const tests = p.tests.filter((t) => (t.requirementIds || []).some((r) => ids.has(r)) || (t.storyIds || []).some((s) => sids.has(s)));
      const sub = { ...p, objectives: objs, requirements: part, stories, tests };
      out.push({ title, code: traceGraph(sub, { full: true }) });
    });
  }
  return out;
}

/** Page-sized trace diagram: objective → requirements, each box showing its story and test counts. */
function traceCompact(p, objs, reqs) {
  // tight spacing and wide labels so a part fits one printed page
  const L = ['%%{init: {"flowchart": {"wrappingWidth": 480, "nodeSpacing": 14, "rankSpacing": 60}}}%%', 'flowchart LR'];
  objs.forEach((o) => L.push(`  ${id('O', o.id)}[${q(`${o.code} ${o.title}`.slice(0, 60))}]:::obj`));
  if (!objs.length) L.push(`  NONE[${q('No objective')}]:::obj`);
  for (const r of reqs) {
    const st = p.stories.filter((s) => (s.requirementIds || []).includes(r.id)).length;
    const tests = p.tests.filter((t) => (t.requirementIds || []).includes(r.id));
    const passed = tests.filter((t) => t.status === 'Passed').length;
    const cls = !tests.length ? 'req' : tests.some((t) => t.status === 'Failed') ? 'fail' : passed === tests.length ? 'pass' : 'req';
    L.push(`  ${id('R', r.id)}[${q(`${r.code} ${r.title}`.slice(0, 55) + ` · ${st} stories · ${passed}/${tests.length} tests passed`)}]:::${cls}`);
    L.push(`  ${objs.length ? id('O', objs[0].id) : 'NONE'} --> ${id('R', r.id)}`);
  }
  L.push('  classDef obj fill:#2a0e0e,stroke:#ef4444,color:#f2f2f2', '  classDef req fill:#0d2416,stroke:#22c55e,color:#f2f2f2', '  classDef pass fill:#22c55e,stroke:#15803d,color:#000000', '  classDef fail fill:#ef4444,stroke:#b91c1c,color:#000000');
  return L.join('\n');
}

/** Entities that are linked by a relationship or foreign key. */
function entityLinks(p) {
  const byName = new Map(p.entities.map((e) => [e.name, e]));
  const links = [];
  for (const r of p.relationships) { const a = byId(p.entities, r.from), b = byId(p.entities, r.to); if (a && b && a !== b) links.push([a, b]); }
  for (const e of p.entities) for (const f of e.fields || []) { const t = f.fk && byName.get(f.fk); if (t && t !== e) links.push([t, e]); }
  return links;
}
function withNeighbours(p, only) {
  const set = new Set(only);
  for (const [a, b] of entityLinks(p)) { if (set.has(a)) set.add(b); if (set.has(b)) set.add(a); }
  return p.entities.filter((e) => set.has(e)); // keeps the original order
}

/**
 * Group entities into readable areas: by the "Area" field when it is used, otherwise by
 * which entities are linked to each other. Big groups are split, keeping linked entities together.
 */
export function modelAreas(p, size = LIMITS.partEntities) {
  const ents = p.entities;
  let groups;
  if (ents.some((e) => (e.area || '').trim())) {
    const m = new Map();
    for (const e of ents) { const k = (e.area || '').trim() || 'Other'; if (!m.has(k)) m.set(k, []); m.get(k).push(e); }
    groups = [...m].map(([name, list]) => ({ name, list }));
  } else {
    const parent = new Map(ents.map((e) => [e, e]));
    const find = (e) => (parent.get(e) === e ? e : (parent.set(e, find(parent.get(e))), parent.get(e)));
    for (const [a, b] of entityLinks(p)) parent.set(find(a), find(b));
    const m = new Map();
    for (const e of ents) { const r = find(e); if (!m.has(r)) m.set(r, []); m.get(r).push(e); }
    const comps = [...m.values()];
    const singles = comps.filter((c) => c.length === 1).flat();
    groups = comps.filter((c) => c.length > 1).sort((a, b) => b.length - a.length).map((list) => ({ name: list[0].name, list }));
    if (singles.length) groups.push({ name: 'Unlinked entities', list: singles });
  }
  // split big groups in breadth-first order so neighbours stay on the same diagram
  const links = entityLinks(p);
  const out = [];
  for (const g of groups) {
    if (g.list.length <= size) { out.push(g); continue; }
    const inG = new Set(g.list), seen = new Set(), order = [];
    for (const start of g.list) {
      if (seen.has(start)) continue;
      const queue = [start]; seen.add(start);
      while (queue.length) {
        const e = queue.shift(); order.push(e);
        for (const [a, b] of links) for (const [x, y] of [[a, b], [b, a]]) if (x === e && inG.has(y) && !seen.has(y)) (seen.add(y), queue.push(y));
      }
    }
    const parts = chunk(order, size);
    parts.forEach((list, i) => out.push({ name: `${g.name} (part ${i + 1} of ${parts.length})`, list }));
  }
  return out;
}

/**
 * Diagrams for documents, sized to fit a printed page: the whole model when it is small;
 * otherwise page-sized parts (key fields only; the data dictionary table lists every field).
 */
export function modelDocDiagrams(p, kind) {
  const build = kind === 'class' ? classDiagram : erd;
  if (p.entities.length <= LIMITS.docEntities * 2 && p.entities.reduce((a, e) => a + (e.fields || []).length, 0) <= 60) return [{ title: '', code: build(p) }];
  const areas = modelAreas(p, LIMITS.docEntities);
  const areaOf = new Map(areas.flatMap((a) => a.list.map((e) => [e, a.name])));
  const links = entityLinks(p);
  // links that leave a part are listed under it in words instead of drawn as extra boxes
  return areas.map((a) => {
    const inA = new Set(a.list);
    const out = [...new Set(links.filter(([x, y]) => inA.has(x) !== inA.has(y)).map(([x, y]) => (inA.has(x) ? `${x.name} → ${y.name} (${areaOf.get(y)})` : `${x.name} (${areaOf.get(x)}) → ${y.name}`)))];
    return { title: a.name, code: build(p, a.list, { compact: true, stubs: false }), note: out.length ? `Links to other parts: ${out.join('; ')}.` : '' };
  });
}
export function traceDocDiagrams(p) {
  const total = p.objectives.length + p.requirements.length + p.stories.length + p.tests.length;
  return total <= 60 ? [{ title: '', code: traceGraph(p) }] : traceParts(p, { size: LIMITS.docReqs, summary: true });
}

// ---------- Focus view: one item and everything linked to it ----------
export const FOCUS_TYPES = {
  objectives: { pre: 'O', label: 'Objective', cls: 'obj', name: (x) => `${x.code} ${x.title}` },
  requirements: { pre: 'R', label: 'Requirement', cls: 'req', name: (x) => `${x.code} ${x.title}` },
  stories: { pre: 'U', label: 'User story', cls: 'story', name: (x) => `${x.code} ${x.iWant || ''}` },
  tests: { pre: 'T', label: 'Test case', cls: 'test', name: (x) => `${x.code} ${x.title} (${x.status || 'Not run'})` },
  usecases: { pre: 'C', label: 'Use case', cls: 'uc', name: (x) => `${x.code} ${x.name}` },
  personas: { pre: 'P', label: 'User / actor', cls: 'person', name: (x) => x.name },
  rules: { pre: 'B', label: 'Business rule', cls: 'rule', name: (x) => `${x.code} ${x.name}` },
  gaps: { pre: 'G', label: 'Gap', cls: 'rule', name: (x) => `${x.code || ''} ${x.area || x.gap || 'Gap'}` },
  apis: { pre: 'A', label: 'API endpoint', cls: 'api', name: (x) => `${x.method} ${x.path}` },
  changes: { pre: 'X', label: 'Change request', cls: 'change', name: (x) => `${x.code} ${x.title}` },
  workItems: { pre: 'W', label: 'Work item', cls: 'work', name: (x) => `${x.code} ${x.item}` },
  entities: { pre: 'E', label: 'Data entity', cls: 'entity', name: (x) => x.name },
  states: { pre: 'M', label: 'State machine', cls: 'entity', name: (x) => x.name },
};

/** Every link in the project, as [collectionA, idA, collectionB, idB, label]. */
export function linkGraph(p) {
  const L = [];
  const add = (ka, a, kb, b, label = '') => { if (a && b && byId(p[ka], a) && byId(p[kb], b)) L.push([ka, a, kb, b, label]); };
  for (const r of p.requirements) {
    (r.objectiveIds || []).forEach((o) => add('objectives', o, 'requirements', r.id, 'supports'));
    (r.parentIds || []).forEach((x) => add('requirements', x, 'requirements', r.id, 'derives'));
  }
  for (const s of p.stories) { (s.requirementIds || []).forEach((r) => add('requirements', r, 'stories', s.id, 'implements')); add('personas', s.asA, 'stories', s.id, 'wants'); }
  for (const t of p.tests) { (t.requirementIds || []).forEach((r) => add('requirements', r, 'tests', t.id, 'tested by')); (t.storyIds || []).forEach((s) => add('stories', s, 'tests', t.id, 'tested by')); }
  for (const u of p.usecases) { (u.requirementIds || []).forEach((r) => add('requirements', r, 'usecases', u.id, 'realised by')); add('personas', u.primary, 'usecases', u.id, 'primary'); (u.secondary || []).forEach((x) => add('personas', x, 'usecases', u.id, 'supports')); }
  for (const k of ['rules', 'gaps', 'apis', 'changes', 'workItems']) for (const x of p[k]) (x.requirementIds || []).forEach((r) => add('requirements', r, k, x.id));
  const ent = new Map(p.entities.map((e) => [e.name, e.id]));
  for (const r of p.relationships) add('entities', r.from, 'entities', r.to, r.label || '');
  for (const e of p.entities) for (const f of e.fields || []) if (f.fk && ent.get(f.fk)) add('entities', ent.get(f.fk), 'entities', e.id, f.name);
  for (const a of p.apis) for (const n of [a.request, a.response]) if (ent.get(n)) add('apis', a.id, 'entities', ent.get(n), 'uses');
  for (const s of p.states) add('entities', s.entity, 'states', s.id, 'lifecycle');
  return L;
}

/** Mermaid for the neighbourhood of one item, up to `depth` links away (nearest first, capped). */
export function focusGraph(p, coll, itemId, depth = 2) {
  const start = `${coll}:${itemId}`;
  if (!FOCUS_TYPES[coll] || !byId(p[coll], itemId)) return `flowchart LR
  A[${q('Pick an item to see everything linked to it')}]`;
  const adj = new Map();
  const links = linkGraph(p);
  for (const [ka, a, kb, b, label] of links) {
    const x = `${ka}:${a}`, y = `${kb}:${b}`;
    if (!adj.has(x)) adj.set(x, []);
    if (!adj.has(y)) adj.set(y, []);
    adj.get(x).push([y, label]); adj.get(y).push([x, label]);
  }
  const dist = new Map([[start, 0]]);
  const queue = [start];
  let truncated = 0;
  while (queue.length) {
    const n = queue.shift();
    if (dist.get(n) >= depth) continue;
    for (const [m] of adj.get(n) || []) {
      if (dist.has(m)) continue;
      if (dist.size >= LIMITS.focusNodes) { truncated++; continue; }
      dist.set(m, dist.get(n) + 1);
      queue.push(m);
    }
  }
  const L = ['flowchart LR'];
  for (const n of dist.keys()) {
    const [k, i] = n.split(':');
    const T = FOCUS_TYPES[k];
    const x = byId(p[k], i);
    L.push(`  ${id(T.pre, i)}[${q(`${T.label}: ${T.name(x)}`.slice(0, 80))}]:::${n === start ? 'focus' : T.cls}`);
  }
  const drawn = new Set();
  for (const [ka, a, kb, b, label] of links) {
    const x = `${ka}:${a}`, y = `${kb}:${b}`;
    if (!dist.has(x) || !dist.has(y) || drawn.has(`${x}>${y}`)) continue;
    drawn.add(`${x}>${y}`);
    L.push(`  ${id(FOCUS_TYPES[ka].pre, a)} -->${label ? `|${word(label)}|` : ''} ${id(FOCUS_TYPES[kb].pre, b)}`);
  }
  if (truncated) L.push(`  MORE[${q(`${truncated} more links not shown, reduce the depth or focus on a linked item`)}]:::note`);
  L.push('  classDef focus fill:#22c55e,stroke:#4ade80,stroke-width:3px,color:#000000', '  classDef obj fill:#2a0e0e,stroke:#ef4444,color:#f2f2f2', '  classDef req fill:#0d2416,stroke:#22c55e,color:#f2f2f2', '  classDef story fill:#111111,stroke:#4ade80,color:#f2f2f2', '  classDef test fill:#111111,stroke:#8c8c8c,color:#f2f2f2', '  classDef uc fill:#0d2416,stroke:#4ade80,color:#f2f2f2', '  classDef person fill:#1a0b0b,stroke:#f87171,color:#f2f2f2', '  classDef rule fill:#141414,stroke:#ef4444,color:#f2f2f2', '  classDef api fill:#0a0a0a,stroke:#22c55e,stroke-dasharray:4 3,color:#f2f2f2', '  classDef change fill:#2a0e0e,stroke:#f87171,color:#f2f2f2', '  classDef work fill:#111111,stroke:#383838,color:#f2f2f2', '  classDef entity fill:#0a0a0a,stroke:#4ade80,color:#f2f2f2', '  classDef note fill:#141414,stroke:#383838,color:#8c8c8c');
  return L.join('\n');
}

// ---------- Decision table → decision tree ----------
export function decisionFlow(p, dt) {
  const L = ['flowchart TD'];
  if (!dt) return `${L[0]}\n  A[${q('Add a decision table')}]`;
  const conds = dt.conditions || [], acts = dt.actions || [];
  (dt.rows || []).forEach((r, i) => {
    const w = String(r.when || '').split(',').map((s) => s.trim());
    const t = String(r.then || '').split(',').map((s) => s.trim());
    const cond = conds.map((c, k) => (w[k] && w[k] !== '-' ? `${c} = ${w[k]}` : null)).filter(Boolean).join(' AND ') || 'Otherwise';
    const act = acts.filter((a, k) => t[k] && t[k] !== '-' && t[k].toUpperCase() !== 'N').join(', ') || 'No action';
    L.push(`  R${i}{${q(`Rule ${i + 1}: ${cond}`)}}:::decision -->|then| A${i}[${q(act)}]:::task`);
    if (i > 0) L.push(`  R${i - 1} -.->|else| R${i}`);
  });
  L.push(...STYLE.slice(2, 4).map((c) => `  ${c}`));
  return L.join('\n');
}

// ---------- registry ----------
export const DIAGRAMS = [
  { id: 'context', title: 'System context', group: 'Architecture', build: (p) => contextDiagram(p), edit: '#/c/integrations' },
  { id: 'process', title: 'Process flow (BPMN-style)', group: 'Process', per: 'processes', build: (p, x, o) => processDiagram(p, x, o), edit: '#/c/processes' },
  { id: 'usecase', title: 'Use case diagram', group: 'Behaviour', build: (p) => useCaseDiagram(p), edit: '#/c/usecases' },
  { id: 'sequence', title: 'Sequence (from use case)', group: 'Behaviour', per: 'usecases', build: (p, x) => sequenceDiagram(p, x), edit: '#/c/usecases' },
  { id: 'state', title: 'State machine', group: 'Behaviour', per: 'states', build: (p, x) => stateDiagram(p, x), edit: '#/c/states' },
  { id: 'erd', title: 'Entity relationship (ERD)', group: 'Data', build: (p) => erd(p), edit: '#/c/entities' },
  { id: 'class', title: 'Class diagram', group: 'Data', build: (p) => classDiagram(p), edit: '#/c/entities' },
  { id: 'erdarea', title: 'ERD', group: 'Data model by area', parts: (p) => { const a = modelAreas(p); return a.length > 1 ? a.map((x) => ({ title: x.name, code: erd(p, x.list) })) : []; }, edit: '#/data' },
  { id: 'decision', title: 'Decision table flow', group: 'Logic', per: 'decisionTables', build: (p, x) => decisionFlow(p, x), edit: '#/c/decisionTables' },
  { id: 'stakeholders', title: 'Stakeholder map', group: 'People', build: (p) => stakeholderMap(p), edit: '#/stakeholders' },
  { id: 'trace', title: 'Traceability graph', group: 'Requirements', build: (p) => traceGraph(p), edit: '#/trace' },
  { id: 'traceobj', title: 'Trace', group: 'Traceability by objective', parts: (p) => (p.objectives.length > 1 || p.requirements.length > LIMITS.partReqs ? traceParts(p) : []), edit: '#/trace' },
  { id: 'priority', title: 'Value vs effort', group: 'Requirements', build: (p) => valueEffort(p), edit: '#/prioritise' },
  { id: 'mindmap', title: 'Scope mind map', group: 'Strategy', build: (p) => mindmap(p), edit: '#/charter' },
  { id: 'roadmap', title: 'Release roadmap', group: 'Planning', build: (p) => roadmap(p), edit: '#/c/releases' },
  { id: 'schedule', title: 'Delivery schedule (estimate)', group: 'Planning', build: (p) => schedule(p), edit: '#/estimate' },
];

/** Every generated diagram instance: one per item for "per" diagrams. */
export function allDiagrams(p) {
  const out = [];
  for (const d of DIAGRAMS) {
    if (d.parts) d.parts(p).forEach((x, i) => out.push({ key: `${d.id}:${i + 1}`, def: d, title: `${d.title} — ${x.title}`, code: x.code }));
    else if (d.per) for (const x of p[d.per]) out.push({ key: `${d.id}:${x.id}`, def: d, title: `${d.title} — ${x.name || x.code}`, code: d.build(p, x, {}) });
    else out.push({ key: d.id, def: d, title: d.title, code: d.build(p) });
  }
  for (const c of p.diagrams) out.push({ key: `custom:${c.id}`, def: { id: 'custom', group: 'Custom' }, title: c.name, code: c.code });
  return out;
}

export { rice, wsjf, nameOf };
