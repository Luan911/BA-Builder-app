// Diagram generators: Mermaid code built from project data, plus a plain-English
// description of each diagram that can be read aloud. Always valid by construction.
import { byId, actorName } from '../model.js';
import { PHASES } from '../sdlc.js';
import { stepTargets, describeActor } from '../rules.js';

// Labels are always quoted; inner double quotes become single quotes (renders cleanly in SVG text).
const q = (s) => `"${String(s ?? '').replace(/["“”]/g, "'").replace(/[\r\n]+/g, ' ').replace(/[<>]/g, ' ').trim() || ' '}"`;
const nid = (prefix, s) => `${prefix}_${String(s ?? '').replace(/[^A-Za-z0-9]/g, '_') || 'x'}`;
const ident = (s) => String(s ?? '').trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'Unnamed';
const joinWords = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const CLASSES = [
  'classDef start fill:#dcfce7,stroke:#16a34a,color:#14532d',
  'classDef finish fill:#fee2e2,stroke:#dc2626,color:#7f1d1d',
  'classDef decision fill:#fef3c7,stroke:#d97706,color:#78350f',
  'classDef task fill:#eef2ff,stroke:#4f46e5,color:#1e1b4b',
];

// ---------------- Process flow (swimlanes) ----------------
export function processFlow(p, proc, { lanes = true } = {}) {
  const steps = proc?.steps || [];
  const lines = ['flowchart TD'];
  const node = (s) => {
    const id = nid('S', s.code);
    if (s.type === 'start') return `${id}([${q(s.label)}]):::start`;
    if (s.type === 'end') return `${id}([${q(s.label)}]):::finish`;
    if (s.type === 'decision') return `${id}{${q(s.label)}}:::decision`;
    return `${id}[${q(s.label)}]:::task`;
  };
  if (lanes) {
    const laneIds = [...new Set(steps.map((s) => s.actorId || ''))];
    for (const lane of laneIds) {
      lines.push(`  subgraph ${nid('L', lane || 'none')}[${q(lane ? describeActor(p, lane) : 'Unassigned')}]`);
      lines.push('    direction TB');
      for (const s of steps.filter((x) => (x.actorId || '') === lane)) lines.push(`    ${node(s)}`);
      lines.push('  end');
    }
  } else {
    for (const s of steps) lines.push(`  ${node(s)}`);
  }
  const codes = new Set(steps.map((s) => s.code));
  steps.forEach((s, i) => {
    const from = nid('S', s.code);
    if (s.type === 'decision') {
      if (s.yes && codes.has(s.yes)) lines.push(`  ${from} -->|Yes| ${nid('S', s.yes)}`);
      if (s.no && codes.has(s.no)) lines.push(`  ${from} -->|No| ${nid('S', s.no)}`);
    } else {
      for (const t of stepTargets(steps, i)) if (codes.has(t)) lines.push(`  ${from} --> ${nid('S', t)}`);
    }
  });
  lines.push(...CLASSES.map((c) => `  ${c}`));
  return lines.join('\n');
}

export function describeProcess(p, proc) {
  const steps = proc?.steps || [];
  if (!steps.length) return `The process "${proc?.name || 'untitled'}" has no steps yet.`;
  const actors = [...new Set(steps.map((s) => describeActor(p, s.actorId)))];
  const byCode = Object.fromEntries(steps.map((s) => [s.code, s]));
  const out = [
    `This process flow shows "${proc.name}". It has ${plural(steps.length, 'step')}, carried out by ${joinWords(actors)}.`,
  ];
  if (proc.description) out.push(proc.description);
  steps.forEach((s, i) => {
    const who = describeActor(p, s.actorId);
    if (s.type === 'start') out.push(`It starts when: ${s.label}.`);
    else if (s.type === 'end') out.push(`One possible outcome is: ${s.label}.`);
    else if (s.type === 'decision') {
      const y = byCode[s.yes];
      const n = byCode[s.no];
      out.push(`Then a decision: ${s.label.replace(/\?$/, '')}? If yes, ${y ? y.label : 'the path is not defined'}. If no, ${n ? n.label : 'the path is not defined'}.`);
    } else out.push(`Next, ${who === 'System' ? 'the system' : `the ${who}`} will: ${s.label}.`);
  });
  const decisions = steps.filter((s) => s.type === 'decision').length;
  const ends = steps.filter((s) => s.type === 'end').length;
  out.push(`In total there ${decisions === 1 ? 'is one decision point' : `are ${decisions} decision points`} and ${plural(ends, 'possible outcome')}.`);
  return out.join(' ');
}

// ---------------- Sequence ----------------
export function sequence(p, proc) {
  const steps = proc?.steps || [];
  const lines = ['sequenceDiagram', '  autonumber'];
  const used = [...new Set(steps.map((s) => s.actorId || 'sys'))];
  const pid = (id) => nid('P', id);
  for (const a of used) {
    lines.push(a === 'sys' || !byId(p.actors, a) ? `  participant ${pid(a)} as ${describeActor(p, a).replace(/[;:#]/g, ' ')}` : `  actor ${pid(a)} as ${actorName(p, a).replace(/[;:#]/g, ' ')}`);
  }
  const ints = [...new Set(steps.map((s) => s.integrationId).filter((id) => byId(p.integrations, id)))];
  for (const i of ints) lines.push(`  participant ${pid(i)} as ${byId(p.integrations, i).name.replace(/[;:#]/g, ' ')}`);
  const msg = (s) => String(s || '').replace(/[;#]/g, ',').replace(/:/g, ' -');
  const byCode = Object.fromEntries(steps.map((s) => [s.code, s]));
  let prev = steps[0]?.actorId || 'sys';
  for (const s of steps) {
    const a = s.actorId || 'sys';
    if (s.type === 'start') {
      lines.push(`  Note over ${pid(a)}: ${msg(s.label)}`);
    } else if (s.type === 'end') {
      lines.push(`  Note over ${pid(a)}: End - ${msg(s.label)}`);
    } else if (s.type === 'decision') {
      const y = byCode[s.yes];
      const n = byCode[s.no];
      lines.push(`  alt ${msg(s.label)} Yes`);
      lines.push(`    Note over ${pid(a)}: Go to ${s.yes || '?'} - ${msg(y?.label || 'undefined')}`);
      lines.push(`  else No`);
      lines.push(`    Note over ${pid(a)}: Go to ${s.no || '?'} - ${msg(n?.label || 'undefined')}`);
      lines.push('  end');
    } else {
      lines.push(`  ${pid(prev)}->>${pid(a)}: ${msg(s.label)}`);
      if (s.integrationId && byId(p.integrations, s.integrationId)) {
        const it = byId(p.integrations, s.integrationId);
        lines.push(`  ${pid(a)}->>+${pid(it.id)}: ${msg(it.protocol || 'Request')} request`);
        lines.push(`  ${pid(it.id)}-->>-${pid(a)}: Response`);
      }
    }
    prev = a;
  }
  return lines.join('\n');
}

export function describeSequence(p, proc) {
  const steps = proc?.steps || [];
  if (!steps.length) return 'There are no steps to show in the sequence diagram yet.';
  const parts = [...new Set(steps.map((s) => describeActor(p, s.actorId)))];
  const ints = [...new Set(steps.map((s) => byId(p.integrations, s.integrationId)?.name).filter(Boolean))];
  const out = [
    `This sequence diagram shows the messages exchanged during "${proc.name}" between ${joinWords([...parts, ...ints])}, in time order from top to bottom.`,
  ];
  let prev = describeActor(p, steps[0].actorId);
  for (const s of steps) {
    const who = describeActor(p, s.actorId);
    if (s.type === 'task') {
      out.push(prev === who ? `The ${who} performs: ${s.label}.` : `The ${prev} passes control to the ${who} to: ${s.label}.`);
      const it = byId(p.integrations, s.integrationId);
      if (it) out.push(`The ${who} calls ${it.name} using ${it.protocol || 'an interface'} and waits for the response.`);
    } else if (s.type === 'decision') out.push(`An alternative path is taken depending on: ${s.label}`);
    prev = who;
  }
  return out.join(' ');
}

// ---------------- ERD ----------------
const CARD = { 'one-to-one': '||--||', 'one-to-many': '||--o{', 'many-to-one': '}o--||', 'many-to-many': '}o--o{' };
const CARD_WORDS = {
  'one-to-one': (a, b) => `Each ${a} has exactly one ${b}`,
  'one-to-many': (a, b) => `One ${a} can have many ${b} records`,
  'many-to-one': (a, b) => `Many ${a} records belong to one ${b}`,
  'many-to-many': (a, b) => `Many ${a} records relate to many ${b} records`,
};

export function erd(p) {
  const lines = ['erDiagram'];
  for (const e of p.entities) {
    lines.push(`  ${ident(e.name)} {`);
    for (const f of e.fields) {
      const keys = [f.pk && 'PK', f.fk && 'FK', f.unique && !f.pk && 'UK'].filter(Boolean).join(', ');
      const comment = f.rule ? ` ${q(f.rule)}` : '';
      lines.push(`    ${ident(f.type || 'string')} ${ident(f.name)}${keys ? ` ${keys}` : ''}${comment}`);
    }
    lines.push('  }');
  }
  const pairs = new Set();
  for (const r of p.relationships) {
    const a = byId(p.entities, r.fromId);
    const b = byId(p.entities, r.toId);
    if (!a || !b) continue;
    pairs.add(`${a.name}|${b.name}`);
    lines.push(`  ${ident(a.name)} ${CARD[r.cardinality] || CARD['one-to-many']} ${ident(b.name)} : ${q(r.label || 'relates to')}`);
  }
  // Infer relationships from foreign keys that are not already drawn.
  const names = new Set(p.entities.map((e) => e.name));
  for (const e of p.entities) {
    for (const f of e.fields) {
      if (!f.fk || !names.has(f.fk)) continue;
      if (pairs.has(`${f.fk}|${e.name}`) || pairs.has(`${e.name}|${f.fk}`)) continue;
      pairs.add(`${f.fk}|${e.name}`);
      lines.push(`  ${ident(f.fk)} ||--o{ ${ident(e.name)} : ${q(f.name)}`);
    }
  }
  if (lines.length === 1) lines.push('  NO_ENTITIES_YET { string add_entities_in_data_model }');
  return lines.join('\n');
}

export function describeErd(p) {
  if (!p.entities.length) return 'The data model has no entities yet.';
  const out = [`The data model has ${plural(p.entities.length, 'entity')}: ${joinWords(p.entities.map((e) => e.name))}.`];
  for (const e of p.entities) {
    const pk = e.fields.filter((f) => f.pk).map((f) => f.name);
    out.push(`${e.name} ${pk.length ? `is identified by ${joinWords(pk)}` : 'has no primary key yet'} and holds ${plural(e.fields.length - pk.length, 'other field')}.`);
  }
  for (const r of p.relationships) {
    const a = byId(p.entities, r.fromId)?.name;
    const b = byId(p.entities, r.toId)?.name;
    if (a && b) out.push(`${(CARD_WORDS[r.cardinality] || CARD_WORDS['one-to-many'])(a, b)}${r.label ? ` — the ${a} ${r.label} the ${b}` : ''}.`);
  }
  return out.join(' ');
}

// ---------------- Architecture ----------------
const LAYERS = [
  ['client', 'Clients'],
  ['gateway', 'Edge / Gateway'],
  ['service', 'Services'],
  ['queue', 'Messaging'],
  ['datastore', 'Data'],
  ['external', 'External systems'],
];

export function deriveComponents(p) {
  if (p.components.length) return { components: p.components, derived: false };
  const comps = [];
  const add = (c) => (comps.push(c), c);
  const app = add({ id: 'd_app', name: `${p.meta.name || 'Application'} UI`, type: 'client', tech: 'Web', connectsTo: ['d_api'] });
  add({ id: 'd_api', name: 'Application API', type: 'service', tech: '', connectsTo: ['d_db', ...p.integrations.map((i) => `d_${i.id}`)] });
  add({ id: 'd_db', name: 'Database', type: 'datastore', tech: p.entities.map((e) => e.name).join(', '), connectsTo: [] });
  for (const i of p.integrations) add({ id: `d_${i.id}`, name: i.name, type: 'external', tech: i.protocol, connectsTo: [] });
  void app;
  return { components: comps, derived: true };
}

export function architecture(p) {
  const { components } = deriveComponents(p);
  const lines = ['flowchart LR'];
  const shape = (c) => {
    const label = q(c.tech ? `${c.name} (${c.tech})` : c.name);
    const id = nid('C', c.id);
    switch (c.type) {
      case 'client': return `${id}([${label}])`;
      case 'gateway': return `${id}{{${label}}}`;
      case 'datastore': return `${id}[(${label})]`;
      case 'queue': return `${id}>${label}]`;
      case 'external': return `${id}[[${label}]]`;
      default: return `${id}[${label}]`;
    }
  };
  if (p.actors.length) {
    lines.push(`  subgraph LAYER_users[${q('Users')}]`);
    for (const a of p.actors) lines.push(`    ${nid('U', a.id)}((${q(a.name)}))`);
    lines.push('  end');
  }
  for (const [type, title] of LAYERS) {
    const inLayer = components.filter((c) => c.type === type);
    if (!inLayer.length) continue;
    lines.push(`  subgraph LAYER_${type}[${q(title)}]`);
    for (const c of inLayer) lines.push(`    ${shape(c)}`);
    lines.push('  end');
  }
  const ids = new Set(components.map((c) => c.id));
  const clients = components.filter((c) => c.type === 'client');
  if (p.actors.length && clients.length) {
    for (const a of p.actors) {
      // Link each actor to the client used by them: match by name, otherwise the first client.
      const match = clients.find((c) => c.name.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])) || clients[0];
      lines.push(`  ${nid('U', a.id)} --> ${nid('C', match.id)}`);
    }
  }
  for (const c of components) for (const t of c.connectsTo) if (ids.has(t)) lines.push(`  ${nid('C', c.id)} --> ${nid('C', t)}`);
  lines.push('  classDef ext fill:#f1f5f9,stroke:#64748b,color:#0f172a');
  return lines.join('\n');
}

export function describeArchitecture(p) {
  const { components, derived } = deriveComponents(p);
  const out = [];
  if (derived) out.push('No components have been defined yet, so this is a standard architecture derived from the requirements and integrations.');
  const groups = LAYERS.map(([t, title]) => [title, components.filter((c) => c.type === t).map((c) => c.name)]).filter(([, n]) => n.length);
  out.push(`The architecture has ${plural(components.length, 'component')}, organised in ${plural(groups.length, 'layer')}.`);
  for (const [title, names] of groups) out.push(`${title}: ${joinWords(names)}.`);
  for (const c of components) {
    const to = c.connectsTo.map((id) => components.find((x) => x.id === id)?.name).filter(Boolean);
    if (to.length) out.push(`${c.name} connects to ${joinWords(to)}.`);
  }
  return out.join(' ');
}

// ---------------- Use case ----------------
export function useCase(p) {
  const lines = ['flowchart LR'];
  const reqs = p.requirements.filter((r) => r.status !== 'Rejected');
  for (const a of p.actors) lines.push(`  ${nid('A', a.id)}((${q(a.name)}))`);
  lines.push(`  subgraph SYSTEM[${q(p.meta.name || 'System')}]`);
  for (const r of reqs) lines.push(`    ${nid('R', r.id)}([${q(`${r.code} ${r.title}`)}])`);
  lines.push('  end');
  for (const r of reqs) if (byId(p.actors, r.actorId)) lines.push(`  ${nid('A', r.actorId)} --- ${nid('R', r.id)}`);
  return lines.join('\n');
}

export function describeUseCase(p) {
  const reqs = p.requirements.filter((r) => r.status !== 'Rejected');
  if (!p.actors.length) return 'No actors are defined yet, so there are no use cases to describe.';
  const out = [`The use case diagram shows ${plural(p.actors.length, 'type')} of user and what each can do with ${p.meta.name || 'the system'}.`];
  for (const a of p.actors) {
    const mine = reqs.filter((r) => r.actorId === a.id).map((r) => r.title.toLowerCase());
    out.push(mine.length ? `The ${a.name} can ${joinWords(mine)}.` : `The ${a.name} has no use cases assigned yet.`);
  }
  return out.join(' ');
}

// ---------------- Lifecycle ----------------
export function lifecycle(p, ev) {
  const lines = ['flowchart LR'];
  for (const ph of ev.phases) {
    const status = ph.approved ? 'Approved' : ph === ev.current ? `In progress ${ph.readiness}%` : 'Not started';
    lines.push(`  ${nid('PH', ph.phase.id)}[${q(`${ph.phase.order}. ${ph.phase.short} - ${status}`)}]:::${ph.approved ? 'done' : ph === ev.current ? 'now' : 'todo'}`);
  }
  for (let i = 0; i < PHASES.length - 1; i++) lines.push(`  ${nid('PH', PHASES[i].id)} --> ${nid('PH', PHASES[i + 1].id)}`);
  lines.push('  classDef done fill:#dcfce7,stroke:#16a34a,color:#14532d');
  lines.push('  classDef now fill:#e0e7ff,stroke:#4f46e5,color:#1e1b4b,stroke-width:2px');
  lines.push('  classDef todo fill:#f8fafc,stroke:#cbd5e1,color:#475569');
  return lines.join('\n');
}

export function describeLifecycle(p, ev) {
  const done = ev.phases.filter((x) => x.approved).map((x) => x.phase.name);
  return [
    `The project follows ${PHASES.length} SDLC phases in order: ${joinWords(PHASES.map((x) => x.name))}.`,
    done.length ? `Approved so far: ${joinWords(done)}.` : 'No phase has been approved yet.',
    `The current phase is ${ev.current.phase.name}, which is ${ev.current.readiness}% ready for its gate.`,
    `Overall project readiness is ${ev.score}%.`,
  ].join(' ');
}

// ---------------- Roadmap ----------------
export function roadmap(p) {
  const dated = p.releases.filter((r) => r.start && r.end && r.start <= r.end);
  const lines = ['gantt', '  dateFormat YYYY-MM-DD', `  title ${(p.meta.name || 'Release roadmap').replace(/[:#;]/g, ' ')}`, '  section Releases'];
  dated.forEach((r, i) => lines.push(`  ${r.name.replace(/[:#;]/g, ' ')} :r${i + 1}, ${r.start}, ${r.end}`));
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.initiation.targetDate || '')) {
    lines.push('  section Milestones');
    lines.push(`  Target go-live :milestone, m1, ${p.initiation.targetDate}, 0d`);
  }
  if (!dated.length && lines.length === 4) lines.push(`  Add releases with dates :r0, ${new Date().toISOString().slice(0, 10)}, 1d`);
  return lines.join('\n');
}

export function describeRoadmap(p) {
  const dated = p.releases.filter((r) => r.start && r.end);
  if (!dated.length) return 'No releases with dates have been planned yet.';
  const out = [`The roadmap has ${plural(dated.length, 'release')}.`];
  for (const r of dated) out.push(`${r.name} runs from ${r.start} to ${r.end}${r.goal ? `, with the goal: ${r.goal}` : ''}.`);
  if (p.initiation.targetDate) out.push(`The target go-live date is ${p.initiation.targetDate}.`);
  return out.join(' ');
}

// ---------------- registry ----------------
export const DIAGRAM_DEFS = [
  { id: 'process', title: 'Process flow', perProcess: true, phase: 'design' },
  { id: 'sequence', title: 'Sequence', perProcess: true, phase: 'design' },
  { id: 'erd', title: 'Data model (ERD)', phase: 'design' },
  { id: 'architecture', title: 'Architecture', phase: 'design' },
  { id: 'usecase', title: 'Use cases', phase: 'requirements' },
  { id: 'lifecycle', title: 'SDLC lifecycle', phase: 'initiation' },
  { id: 'roadmap', title: 'Release roadmap', phase: 'build' },
];

/** Build one diagram: returns { code, description, title }. */
export function buildDiagram(p, ev, id, processId, opts = {}) {
  const proc = byId(p.processes, processId) || p.processes[0];
  switch (id) {
    case 'process': return { title: `Process flow — ${proc?.name || 'none'}`, code: processFlow(p, proc, { lanes: opts.lanes !== false }), description: describeProcess(p, proc) };
    case 'sequence': return { title: `Sequence — ${proc?.name || 'none'}`, code: sequence(p, proc), description: describeSequence(p, proc) };
    case 'erd': return { title: 'Data model (ERD)', code: erd(p), description: describeErd(p) };
    case 'architecture': return { title: 'Architecture', code: architecture(p), description: describeArchitecture(p) };
    case 'usecase': return { title: 'Use cases', code: useCase(p), description: describeUseCase(p) };
    case 'lifecycle': return { title: 'SDLC lifecycle', code: lifecycle(p, ev), description: describeLifecycle(p, ev) };
    case 'roadmap': return { title: 'Release roadmap', code: roadmap(p), description: describeRoadmap(p) };
    default: return null;
  }
}

/** Every diagram in the project (one process/sequence pair per process). */
export function allDiagrams(p, ev, opts = {}) {
  const out = [];
  for (const d of DIAGRAM_DEFS) {
    if (d.perProcess) {
      for (const proc of p.processes) out.push({ id: `${d.id}-${proc.id}`, kind: d.id, file: `${d.id}_${proc.name}`, ...buildDiagram(p, ev, d.id, proc.id, opts) });
    } else out.push({ id: d.id, kind: d.id, file: d.id, ...buildDiagram(p, ev, d.id, undefined, opts) });
  }
  return out;
}
