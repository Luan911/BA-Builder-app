// Editor pages: which collections each page edits, their fields, table columns and guidance.
import {
  PRIORITIES, REQ_STATUSES, NFR_CATEGORIES, STAKEHOLDER_SIDES, RACI, LEVELS, STEP_TYPES, FIELD_TYPES,
  CARDINALITIES, COMPONENT_TYPES, PROTOCOLS, DIRECTIONS, RISK_STATUSES, QUESTION_STATUSES,
  byId, actorName, stakeholderName, releaseName, riskScore, riskRating, uid, nextCode, storyFor, today,
} from '../model.js';
import { esc } from './dom.js';

const opt = {
  actors: (p) => p.actors.map((a) => ({ value: a.id, label: a.name })),
  stepActors: (p) => [{ value: 'sys', label: 'System' }, ...p.actors.map((a) => ({ value: a.id, label: a.name }))],
  stakeholders: (p) => p.stakeholders.map((s) => ({ value: s.id, label: `${s.name}${s.role ? ` — ${s.role}` : ''}` })),
  objectives: (p) => p.objectives.map((o) => ({ value: o.id, label: `${o.code} ${o.title}` })),
  releases: (p) => p.releases.map((r) => ({ value: r.id, label: r.name })),
  requirements: (p) => p.requirements.map((r) => ({ value: r.id, label: `${r.code} ${r.title}` })),
  entities: (p) => p.entities.map((e) => ({ value: e.id, label: e.name })),
  entityNames: (p) => p.entities.map((e) => ({ value: e.name, label: e.name })),
  integrations: (p) => p.integrations.map((i) => ({ value: i.id, label: i.name })),
  components: (p, item) => p.components.filter((c) => c.id !== item?.id).map((c) => ({ value: c.id, label: `${c.name} (${c.type})` })),
  stepCodes: (p, ctx) => (ctx?.rows || []).filter((r) => r.code).map((r) => ({ value: r.code, label: `${r.code} ${r.label || ''}`.trim() })),
};

const pill = (text, kind = '') => (text ? `<span class="pill ${kind}">${esc(text)}</span>` : '<span class="muted">—</span>');
const prioKind = { Must: 'err', Should: 'warn', Could: 'info', "Won't": '' };
const short = (s, n = 90) => {
  const t = String(s || '');
  return esc(t.length > n ? `${t.slice(0, n - 1)}…` : t) || '<span class="muted">—</span>';
};

export const PAGES = {
  objectives: {
    title: 'Business objectives',
    icon: 'target',
    phase: 'initiation',
    intro: 'What the business must achieve. Every requirement must trace back to one of these.',
    tips: ['Make each objective measurable: a KPI and a target with a number.', 'Three to five objectives is typical.', 'Ask the sponsor: "How will we know this project succeeded?"'],
    blocks: [
      {
        key: 'objectives', title: 'Objectives', singular: 'objective', prefix: 'OBJ-', pad: 2,
        columns: [
          { label: 'ID', value: (o) => `<b>${esc(o.code)}</b>`, w: '90px' },
          { label: 'Objective', value: (o) => short(o.title) },
          { label: 'KPI', value: (o) => short(o.kpi) },
          { label: 'Target', value: (o) => short(o.target) },
          { label: 'Requirements', value: (o, p) => String(p.requirements.filter((r) => r.objectiveIds.includes(o.id)).length), w: '110px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'title', label: 'Objective', required: true, placeholder: 'e.g. Reduce phone booking workload' },
          { key: 'kpi', label: 'KPI (how it is measured)', required: true, placeholder: 'e.g. Share of bookings made online' },
          { key: 'target', label: 'Target', required: true, placeholder: 'e.g. 60% within 6 months', help: 'Include a number so it can be measured.' },
        ],
      },
    ],
  },

  stakeholders: {
    title: 'Stakeholders & users',
    icon: 'users',
    phase: 'initiation',
    intro: 'Stakeholders are the people who influence or approve the project. Users (actors) are the types of people who will use the system.',
    tips: ['Exactly one person should be Accountable (A) in RACI.', 'Mark everyone who must sign off as an approver.', 'Users become the "As a ..." in user stories and the lanes in process diagrams.'],
    blocks: [
      {
        key: 'stakeholders', title: 'Stakeholders', singular: 'stakeholder', show: [0, 3, 5],
        columns: [
          { label: 'Name', value: (s) => `<b>${esc(s.name)}</b><div class="muted small">${esc(s.role || '')}</div>` },
          { label: 'Organisation', value: (s) => short(s.organisation, 40) },
          { label: 'Side', value: (s) => pill(s.side) },
          { label: 'RACI', value: (s) => pill(s.raci, s.raci === 'A' ? 'accent' : '') , w: '70px' },
          { label: 'Influence / interest', value: (s) => `${esc(s.influence || '—')} / ${esc(s.interest || '—')}` },
          { label: 'Approver', value: (s) => (s.approver ? pill('Approver', 'ok') : '') },
        ],
        fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'role', label: 'Role / title', required: true },
          { key: 'organisation', label: 'Organisation', advanced: true },
          { key: 'side', label: 'Side', type: 'select', options: STAKEHOLDER_SIDES },
          { key: 'raci', label: 'RACI', type: 'select', options: [{ value: 'A', label: 'A — Accountable' }, { value: 'R', label: 'R — Responsible' }, { value: 'C', label: 'C — Consulted' }, { value: 'I', label: 'I — Informed' }] },
          { key: 'email', label: 'Email', advanced: true },
          { key: 'influence', label: 'Influence', type: 'select', options: LEVELS, advanced: true },
          { key: 'interest', label: 'Interest', type: 'select', options: LEVELS, advanced: true },
          { key: 'approver', label: 'Signs off documents and phase gates', type: 'checkbox' },
        ],
        newItem: () => ({ side: 'Client', raci: 'C', influence: 'Medium', interest: 'Medium', approver: false }),
      },
      {
        key: 'actors', title: 'Users (actors)', singular: 'user type', show: [0, 1],
        columns: [
          { label: 'User type', value: (a) => `<b>${esc(a.name)}</b>` },
          { label: 'Description', value: (a) => short(a.description) },
          { label: 'Goals', value: (a) => short(a.goals) },
          { label: 'Requirements', value: (a, p) => String(p.requirements.filter((r) => r.actorId === a.id).length), w: '110px' },
        ],
        fields: [
          { key: 'name', label: 'User type', required: true, placeholder: 'e.g. Patient, Receptionist' },
          { key: 'description', label: 'Description', type: 'textarea', span: 2 },
          { key: 'goals', label: 'Goals', type: 'textarea', span: 2 },
        ],
      },
    ],
  },

  requirements: {
    title: 'Functional requirements',
    icon: 'list',
    phase: 'requirements',
    intro: 'What the system shall do. Each requirement becomes a user story, acceptance tests and a row in the traceability matrix automatically.',
    tips: [
      'Write the statement as "The system shall ..." — one capability per statement.',
      'Avoid vague words like fast, easy, user-friendly, etc. — use numbers and exact behaviour.',
      'Add at least one Given / When / Then scenario; include the unhappy path.',
      'The title should start with a verb: "Book an appointment".',
    ],
    blocks: [
      {
        key: 'requirements', title: 'Requirements', singular: 'requirement', prefix: 'FR-', pad: 3, wide: true, show: [0, 1, 2, 3],
        columns: [
          { label: 'ID', value: (r) => `<b>${esc(r.code)}</b>`, w: '86px' },
          { label: 'Requirement', value: (r) => `<b>${esc(r.title)}</b>` },
          { label: 'Priority', value: (r) => pill(r.priority, prioKind[r.priority]), w: '90px' },
          { label: 'Tests', value: (r) => (r.acceptance.length ? pill(`${r.acceptance.length}`, 'ok') : pill('0', 'err')), w: '70px' },
          { label: 'Release', value: (r, p) => short(releaseName(p, r.releaseId), 28), w: '150px' },
          { label: 'Status', value: (r) => pill(r.status), w: '100px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'title', label: 'Title (starts with a verb)', required: true, placeholder: 'e.g. Book an appointment' },
          { key: 'statement', label: 'Requirement statement', type: 'textarea', required: true, span: 2, placeholder: 'The system shall ...' },
          { key: 'actorId', label: 'User (As a ...)', type: 'select', options: opt.actors, required: true },
          { key: 'benefit', label: 'Benefit (so that ...)', placeholder: 'e.g. my appointment is confirmed without phoning' },
          { key: 'priority', label: 'Priority (MoSCoW)', type: 'select', options: PRIORITIES, required: true },
          { key: 'status', label: 'Status', type: 'select', options: REQ_STATUSES, blank: false, advanced: true },
          { key: 'source', label: 'Source (who asked)', type: 'select', options: opt.stakeholders, advanced: true },
          { key: 'releaseId', label: 'Release', type: 'select', options: opt.releases, advanced: true },
          { key: 'objectiveIds', label: 'Supports objectives', type: 'multiselect', options: opt.objectives, span: 2, emptyText: 'Add business objectives first.' },
          {
            key: 'acceptance', label: 'Acceptance criteria (Given / When / Then)', type: 'repeater', addLabel: 'Add scenario',
            grid: 'minmax(110px,0.8fr) 1fr 1fr 1fr 92px',
            emptyText: 'No scenarios yet. Add the happy path and at least one unhappy path.',
            columns: [
              { key: 'title', label: 'Scenario', placeholder: 'Happy path' },
              { key: 'given', label: 'Given', type: 'textarea', placeholder: 'a patient is signed in' },
              { key: 'when', label: 'When', type: 'textarea', placeholder: 'they confirm the booking' },
              { key: 'then', label: 'Then', type: 'textarea', placeholder: 'a confirmation number is shown' },
            ],
            newRow: () => ({ id: uid('ac') }),
          },
          { key: 'notes', label: 'Notes', type: 'textarea', span: 2, advanced: true },
        ],
        newItem: () => ({ status: 'Proposed', objectiveIds: [], acceptance: [], statement: 'The system shall ' }),
      },
    ],
  },

  nfrs: {
    title: 'Non-functional requirements',
    icon: 'gauge',
    phase: 'requirements',
    intro: 'How well the system must work: speed, availability, security, privacy, accessibility. Each one needs a metric and a target so it can be tested.',
    tips: ['Good: "Page load time (95th percentile) < 2 seconds on 4G".', 'Each selected compliance standard needs a matching NFR.', 'Systems holding personal data need Security and Privacy NFRs.'],
    blocks: [
      {
        key: 'nfrs', title: 'Quality requirements (non-functional)', singular: 'quality requirement', prefix: 'NFR-', pad: 3, show: [1, 2, 4],
        columns: [
          { label: 'ID', value: (n) => `<b>${esc(n.code)}</b>`, w: '96px' },
          { label: 'Category', value: (n) => pill(n.category), w: '130px' },
          { label: 'Requirement', value: (n) => short(n.statement) },
          { label: 'Metric', value: (n) => short(n.metric, 50) },
          { label: 'Target', value: (n) => short(n.target, 40) },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'category', label: 'Category', type: 'select', options: NFR_CATEGORIES, required: true },
          { key: 'statement', label: 'Requirement', type: 'textarea', span: 2, required: true, placeholder: 'The booking pages shall load within ...' },
          { key: 'metric', label: 'Metric (what is measured)', required: true, placeholder: 'e.g. Page load time (95th percentile)' },
          { key: 'target', label: 'Target', required: true, placeholder: 'e.g. < 2 seconds' },
          { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
        ],
        newItem: () => ({ category: 'Performance', priority: 'Must' }),
      },
    ],
  },

  rules: {
    title: 'Business rules',
    icon: 'scale',
    phase: 'requirements',
    intro: 'Policies and calculations the system must enforce, with exact values. Link each rule to the requirements that use it.',
    tips: ['Use exact values: "at most 2 future appointments", not "a few".', 'One rule per line makes testing straightforward.'],
    blocks: [
      {
        key: 'rules', title: 'Business rules', singular: 'business rule', prefix: 'BR-', pad: 2,
        columns: [
          { label: 'ID', value: (b) => `<b>${esc(b.code)}</b>`, w: '80px' },
          { label: 'Rule', value: (b) => short(b.statement, 140) },
          { label: 'Applies to', value: (b, p) => b.requirementIds.map((id) => byId(p.requirements, id)?.code).filter(Boolean).map((c) => pill(c)).join(' ') || '<span class="muted">—</span>' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'statement', label: 'Rule', type: 'textarea', span: 2, required: true },
          { key: 'requirementIds', label: 'Applies to requirements', type: 'multiselect', options: opt.requirements, span: 2, emptyText: 'Add requirements first.' },
        ],
        newItem: () => ({ requirementIds: [] }),
      },
    ],
  },

  entities: {
    title: 'Data model',
    icon: 'database',
    phase: 'design',
    intro: 'The information the system stores. This generates the data dictionary and the ERD.',
    tips: ['Every entity needs one primary key (PK).', 'Foreign keys (FK) must reference an existing entity.', 'Write validation rules developers can code, e.g. "E.164 format".'],
    blocks: [
      {
        key: 'entities', title: 'Entities', singular: 'entity', wide: true, show: [0, 1],
        columns: [
          { label: 'Entity', value: (e) => `<b>${esc(e.name)}</b><div class="muted small">${short(e.description, 80)}</div>` },
          { label: 'Fields', value: (e) => esc(e.fields.map((f) => f.name + (f.pk ? ' (PK)' : f.fk ? ' (FK)' : '')).join(', ')) || '<span class="muted">—</span>' },
          { label: 'Keys', value: (e) => (e.fields.some((f) => f.pk) ? pill('PK', 'ok') : pill('No PK', 'err')), w: '90px' },
        ],
        fields: [
          { key: 'name', label: 'Entity name (singular)', required: true, placeholder: 'e.g. Appointment' },
          { key: 'description', label: 'Description' },
          {
            key: 'fields', label: 'Fields', type: 'repeater', addLabel: 'Add field',
            grid: 'minmax(120px,1fr) 110px 46px 60px 56px minmax(110px,0.8fr) minmax(130px,1.2fr) 92px',
            columns: [
              { key: 'name', label: 'Field', placeholder: 'e.g. email' },
              { key: 'type', label: 'Type', type: 'select', options: FIELD_TYPES, blank: false },
              { key: 'pk', label: 'PK', type: 'checkbox' },
              { key: 'required', label: 'Req.', type: 'checkbox' },
              { key: 'unique', label: 'Uniq.', type: 'checkbox' },
              { key: 'fk', label: 'References', type: 'select', options: opt.entityNames },
              { key: 'rule', label: 'Validation', placeholder: 'e.g. Valid email address' },
            ],
            newRow: (rows) => (rows.length ? { type: 'string' } : { name: 'id', type: 'uuid', pk: true, required: true, unique: true }),
          },
        ],
        newItem: () => ({ fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true, fk: '', rule: '' }] }),
      },
      {
        key: 'relationships', title: 'Relationships', singular: 'relationship',
        columns: [
          { label: 'From', value: (r, p) => esc(byId(p.entities, r.fromId)?.name || '?') },
          { label: 'Cardinality', value: (r) => pill(r.cardinality) },
          { label: 'To', value: (r, p) => esc(byId(p.entities, r.toId)?.name || '?') },
          { label: 'Meaning', value: (r) => short(r.label) },
        ],
        fields: [
          { key: 'fromId', label: 'From entity', type: 'select', options: opt.entities, required: true },
          { key: 'cardinality', label: 'Cardinality', type: 'select', options: CARDINALITIES, required: true },
          { key: 'toId', label: 'To entity', type: 'select', options: opt.entities, required: true },
          { key: 'label', label: 'Meaning (verb)', placeholder: 'e.g. books' },
        ],
        newItem: () => ({ cardinality: 'one-to-many' }),
      },
    ],
  },

  processes: {
    title: 'Business processes',
    icon: 'workflow',
    phase: 'design',
    intro: 'Step-by-step flows. These generate swimlane process diagrams and sequence diagrams.',
    tips: ['Start with one Start step and finish with at least one End step.', 'Decisions need both a Yes and a No path.', 'If "Next" is empty, the step continues to the row below it.', 'Pick an external system on a step to show the call in the sequence diagram.'],
    blocks: [
      {
        key: 'processes', title: 'Processes', singular: 'process', wide: true, show: [0, 1],
        columns: [
          { label: 'Process', value: (pr) => `<b>${esc(pr.name)}</b><div class="muted small">${short(pr.description, 100)}</div>` },
          { label: 'Steps', value: (pr) => String(pr.steps.length), w: '80px' },
          { label: 'Decisions', value: (pr) => String(pr.steps.filter((s) => s.type === 'decision').length), w: '90px' },
          { label: 'Lanes', value: (pr, p) => esc([...new Set(pr.steps.map((s) => (s.actorId === 'sys' ? 'System' : actorName(p, s.actorId)) || '?'))].join(', ')) },
        ],
        fields: [
          { key: 'name', label: 'Process name', required: true, placeholder: 'e.g. Book an appointment online' },
          { key: 'description', label: 'Description' },
          {
            key: 'steps', label: 'Steps', type: 'repeater', addLabel: 'Add step', refreshOn: ['type', 'code', 'label'],
            grid: '62px 104px minmax(150px,1.6fr) minmax(110px,1fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(110px,1fr) 92px',
            columns: [
              { key: 'code', label: 'Step', placeholder: 'S1' },
              { key: 'type', label: 'Type', type: 'select', options: STEP_TYPES, blank: false },
              { key: 'label', label: 'Description', placeholder: 'e.g. Choose doctor and date' },
              { key: 'actorId', label: 'Who', type: 'select', options: opt.stepActors },
              { key: 'next', label: 'Next', type: 'select', options: opt.stepCodes, blank: '(row below)', enabled: (r) => r.type === 'start' || r.type === 'task' || !r.type },
              { key: 'yes', label: 'If yes', type: 'select', options: opt.stepCodes, enabled: (r) => r.type === 'decision' },
              { key: 'no', label: 'If no', type: 'select', options: opt.stepCodes, enabled: (r) => r.type === 'decision' },
              { key: 'integrationId', label: 'Calls system', type: 'select', options: opt.integrations, enabled: (r) => r.type === 'task' || !r.type },
            ],
            newRow: (rows) => {
              let n = 0;
              for (const r of rows) n = Math.max(n, parseInt(String(r.code || '').replace(/\D/g, ''), 10) || 0);
              return { code: `S${n + 1}`, type: rows.length ? 'task' : 'start' };
            },
          },
        ],
        newItem: () => ({ steps: [{ code: 'S1', type: 'start', label: '' }] }),
      },
    ],
  },

  integrations: {
    title: 'Integrations',
    icon: 'plug',
    phase: 'design',
    intro: 'Every external system the solution talks to. Developers need the protocol, direction, data and authentication for each.',
    tips: ['Name an owner for each system — they provide access and test environments.', 'Record authentication (API key, OAuth 2.0, mutual TLS ...).'],
    blocks: [
      {
        key: 'integrations', title: 'Integrations', singular: 'integration', show: [0, 2, 3],
        columns: [
          { label: 'System', value: (i) => `<b>${esc(i.name)}</b><div class="muted small">${short(i.purpose, 80)}</div>` },
          { label: 'Direction', value: (i) => pill(i.direction), w: '110px' },
          { label: 'Protocol', value: (i) => pill(i.protocol), w: '120px' },
          { label: 'Auth', value: (i) => (i.auth ? short(i.auth, 30) : pill('Missing', 'err')) },
          { label: 'Owner', value: (i, p) => short(stakeholderName(p, i.owner), 30) },
        ],
        fields: [
          { key: 'name', label: 'System name', required: true },
          { key: 'purpose', label: 'Purpose', required: true },
          { key: 'direction', label: 'Direction', type: 'select', options: DIRECTIONS, required: true },
          { key: 'protocol', label: 'Protocol', type: 'select', options: PROTOCOLS, required: true },
          { key: 'dataExchanged', label: 'Data exchanged', required: true, span: 2 },
          { key: 'auth', label: 'Authentication', required: true, placeholder: 'e.g. OAuth 2.0 client credentials' },
          { key: 'owner', label: 'Owner', type: 'select', options: opt.stakeholders },
        ],
        newItem: () => ({ direction: 'Outbound', protocol: 'REST' }),
      },
    ],
  },

  components: {
    title: 'Architecture',
    icon: 'layers',
    phase: 'design',
    intro: 'The building blocks of the solution and how they connect. This generates the architecture diagram.',
    tips: ['Include every external system as an "external" component.', 'Connect each component to the ones it calls.'],
    blocks: [
      {
        key: 'components', title: 'Architecture components', singular: 'component', show: [0, 1, 3],
        columns: [
          { label: 'Component', value: (c) => `<b>${esc(c.name)}</b>` },
          { label: 'Type', value: (c) => pill(c.type), w: '110px' },
          { label: 'Technology', value: (c) => short(c.tech, 40) },
          { label: 'Connects to', value: (c, p) => esc(c.connectsTo.map((id) => byId(p.components, id)?.name).filter(Boolean).join(', ')) || '<span class="muted">—</span>' },
        ],
        fields: [
          { key: 'name', label: 'Name', required: true },
          { key: 'type', label: 'Type', type: 'select', options: COMPONENT_TYPES, required: true },
          { key: 'tech', label: 'Technology', placeholder: 'e.g. Node.js, PostgreSQL' },
          { key: 'connectsTo', label: 'Connects to', type: 'multiselect', options: opt.components, span: 2, emptyText: 'Add other components first.' },
        ],
        newItem: () => ({ type: 'service', connectsTo: [] }),
      },
    ],
  },

  releases: {
    title: 'Releases',
    icon: 'calendar',
    phase: 'build',
    intro: 'Plan what is delivered when. Assign requirements to releases on the requirement form.',
    tips: ['Every Must-have needs a release.', 'Finish the last release before the target go-live date.'],
    blocks: [
      {
        key: 'releases', title: 'Releases', singular: 'release', show: [0, 1, 2],
        columns: [
          { label: 'Release', value: (r) => `<b>${esc(r.name)}</b><div class="muted small">${short(r.goal, 90)}</div>` },
          { label: 'Start', value: (r) => esc(r.start || '—'), w: '110px' },
          { label: 'End', value: (r) => esc(r.end || '—'), w: '110px' },
          { label: 'Requirements', value: (r, p) => esc(p.requirements.filter((q) => q.releaseId === r.id).map((q) => q.code).join(', ')) || '<span class="muted">—</span>' },
        ],
        fields: [
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Release 1 - Core booking' },
          { key: 'goal', label: 'Goal', span: 2 },
          { key: 'start', label: 'Start date', type: 'date' },
          { key: 'end', label: 'End date', type: 'date' },
        ],
      },
    ],
  },

  raid: {
    title: 'RAID log',
    icon: 'alert',
    phase: 'initiation',
    intro: 'Risks, Assumptions, Issues/constraints and Dependencies — reviewed throughout the project (Monitoring & Controlling).',
    tips: ['Risk score = likelihood × impact (1–5 each). 15+ is High.', 'Every open risk needs a mitigation and an owner.', 'Validate assumptions early — a wrong assumption becomes an issue.'],
    blocks: [
      {
        key: 'risks', title: 'Risks', singular: 'risk', prefix: 'R-', pad: 2, show: [1, 2, 4],
        columns: [
          { label: 'ID', value: (r) => `<b>${esc(r.code)}</b>`, w: '70px' },
          { label: 'Risk', value: (r) => short(r.description, 110) },
          { label: 'Score', value: (r) => pill(`${riskScore(r)} ${riskRating(r)}`, riskRating(r) === 'High' ? 'err' : riskRating(r) === 'Medium' ? 'warn' : 'ok'), w: '110px' },
          { label: 'Mitigation', value: (r) => (r.mitigation ? short(r.mitigation, 70) : pill('Missing', 'err')) },
          { label: 'Status', value: (r) => pill(r.status), w: '100px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'status', label: 'Status', type: 'select', options: RISK_STATUSES, blank: false },
          { key: 'description', label: 'Risk', type: 'textarea', span: 2, required: true, placeholder: 'There is a risk that ... which would cause ...' },
          { key: 'likelihood', label: 'Likelihood (1-5)', type: 'number', min: 1, max: 5, required: true },
          { key: 'impact', label: 'Impact (1-5)', type: 'number', min: 1, max: 5, required: true },
          { key: 'mitigation', label: 'Mitigation', type: 'textarea', span: 2 },
          { key: 'owner', label: 'Owner', type: 'select', options: opt.stakeholders },
        ],
        newItem: () => ({ likelihood: 3, impact: 3, status: 'Open' }),
      },
      {
        key: 'assumptions', title: 'Assumptions', singular: 'assumption', prefix: 'A-', pad: 2, show: [1, 3],
        columns: [
          { label: 'ID', value: (a) => `<b>${esc(a.code)}</b>`, w: '70px' },
          { label: 'Assumption', value: (a) => short(a.text, 140) },
          { label: 'Owner', value: (a, p) => short(stakeholderName(p, a.owner), 30) },
          { label: 'Validated', value: (a) => (a.validated ? pill('Yes', 'ok') : pill('No', 'warn')), w: '100px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'owner', label: 'Owner', type: 'select', options: opt.stakeholders },
          { key: 'text', label: 'Assumption', type: 'textarea', span: 2, required: true },
          { key: 'validated', label: 'Validated (confirmed true)', type: 'checkbox' },
        ],
      },
      {
        key: 'constraints', title: 'Constraints', singular: 'constraint', prefix: 'C-', pad: 2, show: [1],
        columns: [
          { label: 'ID', value: (c) => `<b>${esc(c.code)}</b>`, w: '70px' },
          { label: 'Constraint', value: (c) => short(c.text, 160) },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'text', label: 'Constraint', type: 'textarea', span: 2, required: true },
        ],
      },
      {
        key: 'dependencies', title: 'Dependencies', singular: 'dependency', prefix: 'DEP-', pad: 2, show: [1, 3],
        columns: [
          { label: 'ID', value: (d) => `<b>${esc(d.code)}</b>`, w: '86px' },
          { label: 'Dependency', value: (d) => short(d.text, 110) },
          { label: 'Owner', value: (d, p) => short(stakeholderName(p, d.owner), 30) },
          { label: 'Due', value: (d) => esc(d.due || '—'), w: '110px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'due', label: 'Due date', type: 'date' },
          { key: 'text', label: 'Dependency', type: 'textarea', span: 2, required: true },
          { key: 'owner', label: 'Owner', type: 'select', options: opt.stakeholders },
        ],
      },
    ],
  },

  decisions: {
    title: 'Decisions & questions',
    icon: 'chat',
    phase: 'initiation',
    intro: 'Record every decision with its reason, and track open questions until they are answered.',
    tips: ['A decision without a rationale will be re-debated later.', 'Give every question an owner and a due date.', '"Asked of" decides whether it appears under client or delivery-team actions.'],
    blocks: [
      {
        key: 'questions', title: 'Open questions', singular: 'question', prefix: 'Q-', pad: 2, show: [1, 2, 4],
        columns: [
          { label: 'ID', value: (q) => `<b>${esc(q.code)}</b>`, w: '70px' },
          { label: 'Question', value: (q) => `${short(q.question, 110)}${q.answer ? `<div class="muted small">Answer: ${short(q.answer, 90)}</div>` : ''}` },
          { label: 'Asked of', value: (q) => pill(q.askedOf), w: '100px' },
          { label: 'Due', value: (q) => esc(q.due || '—'), w: '110px' },
          { label: 'Status', value: (q) => pill(q.status, q.status === 'Answered' ? 'ok' : 'warn'), w: '110px' },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'status', label: 'Status', type: 'select', options: QUESTION_STATUSES, blank: false },
          { key: 'question', label: 'Question', type: 'textarea', span: 2, required: true },
          { key: 'askedOf', label: 'Asked of', type: 'select', options: ['Client', 'Delivery'], blank: false },
          { key: 'owner', label: 'Owner', type: 'select', options: opt.stakeholders },
          { key: 'due', label: 'Due date', type: 'date' },
          { key: 'answer', label: 'Answer', type: 'textarea', span: 2 },
        ],
        newItem: () => ({ askedOf: 'Client', status: 'Open' }),
      },
      {
        key: 'decisions', title: 'Decisions', singular: 'decision', prefix: 'D-', pad: 2, show: [1, 2],
        columns: [
          { label: 'ID', value: (d) => `<b>${esc(d.code)}</b>`, w: '70px' },
          { label: 'Date', value: (d) => esc(d.date || '—'), w: '110px' },
          { label: 'Decision', value: (d) => `${short(d.decision, 110)}${d.rationale ? `<div class="muted small">Why: ${short(d.rationale, 90)}</div>` : ''}` },
          { label: 'Owner', value: (d, p) => short(stakeholderName(p, d.owner) || d.owner, 30) },
        ],
        fields: [
          { key: 'code', label: 'ID', required: true },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'decision', label: 'Decision', type: 'textarea', span: 2, required: true },
          { key: 'rationale', label: 'Rationale (why)', type: 'textarea', span: 2 },
          { key: 'owner', label: 'Decided by', type: 'select', options: opt.stakeholders },
        ],
        newItem: () => ({ date: today() }),
      },
    ],
  },
};

/** Defaults for a new item: next code plus the block's own defaults. */
export function newItemFor(block, p) {
  const base = block.newItem ? block.newItem(p) : {};
  const item = { id: uid(block.key.slice(0, 3)), ...base };
  if (block.prefix) item.code = nextCode(p[block.key], block.prefix, block.pad || 3);
  return item;
}

export { opt };
