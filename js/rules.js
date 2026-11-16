// Rules engine: every decision about what is right, wrong or missing is made here,
// deterministically, from the project data. No AI.
import { PHASES, PHASE_BY_ID } from './sdlc.js';
import { byId, riskRating, actorName } from './model.js';

// Words that make a requirement untestable (based on IEEE 29148 guidance on unbounded terms).
const AMBIGUOUS = [
  'fast', 'quick', 'quickly', 'slow', 'easy', 'easily', 'simple', 'user-friendly', 'user friendly',
  'intuitive', 'seamless', 'seamlessly', 'flexible', 'robust', 'efficient', 'efficiently', 'adequate',
  'appropriate', 'as appropriate', 'as needed', 'if possible', 'where possible', 'etc', 'and/or',
  'some', 'several', 'many', 'few', 'minimal', 'maximise', 'maximize', 'minimise', 'minimize',
  'optimal', 'state-of-the-art', 'approximately', 'roughly', 'tbd', 'tbc', 'normally',
  'usually', 'generally', 'reasonable', 'sufficient', 'modern', 'nice', 'better', 'improved',
  'support', 'handle',
];
// "support"/"handle" are only flagged when they are the main verb ("shall support ...").
const VAGUE_VERBS = ['support', 'handle'];
const AMBIGUOUS_RE = new RegExp(
  `\\b(${AMBIGUOUS.filter((w) => !VAGUE_VERBS.includes(w))
    .map((w) => w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
    .join('|')})\\b`,
  'i'
);
const VAGUE_VERB_RE = /\b(shall|must|will)\s+(support|handle)\b/i;

export function findAmbiguous(text) {
  const found = new Set();
  const s = String(text || '');
  const re = new RegExp(AMBIGUOUS_RE.source, 'gi');
  let m;
  while ((m = re.exec(s))) found.add(m[1].toLowerCase());
  const v = s.match(VAGUE_VERB_RE);
  if (v) found.add(`${v[1].toLowerCase()} ${v[2].toLowerCase()}`);
  return [...found];
}

const hasNumber = (s) => /\d/.test(String(s || ''));
const filled = (s) => String(s ?? '').trim().length > 0;
const activeReqs = (p) => p.requirements.filter((r) => r.status !== 'Rejected');
const label = (item, fallback) => item.code || item.name || item.title || fallback;

/** Next step code for a process step (explicit `next`, otherwise the following step). */
export function stepTargets(steps, i) {
  const s = steps[i];
  if (s.type === 'end') return [];
  if (s.type === 'decision') return [s.yes, s.no].filter(Boolean);
  const implicit = steps[i + 1]?.code;
  return [s.next || implicit].filter(Boolean);
}

// Rule shape: { id, phase, section, severity, audience, title, why, check(p) -> [{ message, ref? }] }
//   severity: 'error' blocks the phase gate, 'warning' should be fixed, 'info' is advice.
//   audience: who has to act -> 'client', 'dev' or 'ba'.
export const RULES = [
  // ---------------- Initiation ----------------
  {
    id: 'I-NAME', phase: 'initiation', section: 'project', severity: 'error', audience: 'ba',
    title: 'Project name and code are set',
    why: 'Every document and file is labelled with them.',
    check: (p) => (filled(p.meta.name) && filled(p.meta.code) ? [] : [{ message: 'Give the project a name and a short code (e.g. CAB).' }]),
  },
  {
    id: 'I-PROBLEM', phase: 'initiation', section: 'project', severity: 'error', audience: 'client',
    title: 'Problem statement is written',
    why: 'Without the problem, nobody can judge whether the solution is right.',
    check: (p) => (String(p.initiation.problem).trim().length >= 30 ? [] : [{ message: 'Describe the business problem in at least one full sentence, with facts or numbers if possible.' }]),
  },
  {
    id: 'I-VISION', phase: 'initiation', section: 'project', severity: 'warning', audience: 'client',
    title: 'Vision is stated',
    why: 'A one-line vision keeps every later decision pointed the same way.',
    check: (p) => (filled(p.initiation.vision) ? [] : [{ message: 'Add a one-sentence vision of what success looks like.' }]),
  },
  {
    id: 'I-OBJ', phase: 'initiation', section: 'objectives', severity: 'error', audience: 'client',
    title: 'At least one business objective',
    why: 'Requirements must trace back to an objective.',
    check: (p) => (p.objectives.length ? [] : [{ message: 'Add the business objectives this project must achieve.' }]),
  },
  {
    id: 'I-KPI', phase: 'initiation', section: 'objectives', severity: 'error', audience: 'client',
    title: 'Objectives are measurable',
    why: 'An objective without a KPI and a target cannot be proven.',
    check: (p) =>
      p.objectives.flatMap((o) => {
        if (!filled(o.kpi) || !filled(o.target)) return [{ message: `${label(o)} needs a KPI and a target.`, ref: o.id }];
        if (!hasNumber(o.target)) return [{ message: `${label(o)} target "${o.target}" has no number to measure against.`, ref: o.id }];
        return [];
      }),
  },
  {
    id: 'I-SCOPE-IN', phase: 'initiation', section: 'project', severity: 'error', audience: 'client',
    title: 'In-scope items are listed',
    why: 'Defines exactly what will be delivered.',
    check: (p) => (p.initiation.scopeIn.length ? [] : [{ message: 'List what is in scope.' }]),
  },
  {
    id: 'I-SCOPE-OUT', phase: 'initiation', section: 'project', severity: 'warning', audience: 'client',
    title: 'Out-of-scope items are listed',
    why: 'Writing down what is NOT included is the best protection against scope creep.',
    check: (p) => (p.initiation.scopeOut.length ? [] : [{ message: 'List what is explicitly out of scope.' }]),
  },
  {
    id: 'I-SPONSOR', phase: 'initiation', section: 'project', severity: 'error', audience: 'client',
    title: 'Sponsor is identified',
    why: 'The sponsor owns the outcome and approves the charter.',
    check: (p) => (byId(p.stakeholders, p.meta.sponsor) ? [] : [{ message: 'Choose the project sponsor (add them as a stakeholder first).' }]),
  },
  {
    id: 'I-APPROVER', phase: 'initiation', section: 'stakeholders', severity: 'error', audience: 'client',
    title: 'Approvers are identified',
    why: 'Each phase gate needs someone with authority to sign it off.',
    check: (p) => (p.stakeholders.some((s) => s.approver) ? [] : [{ message: 'Mark at least one stakeholder as an approver.' }]),
  },
  {
    id: 'I-RACI', phase: 'initiation', section: 'stakeholders', severity: 'warning', audience: 'ba',
    title: 'Exactly one person is Accountable',
    why: 'RACI: one "A" per project avoids decisions falling between people.',
    check: (p) => {
      if (!p.stakeholders.length) return [{ message: 'Add the stakeholders and their RACI roles.' }];
      const a = p.stakeholders.filter((s) => s.raci === 'A').length;
      if (a === 1) return [];
      return [{ message: a === 0 ? 'No stakeholder is marked Accountable (A).' : `${a} stakeholders are marked Accountable (A); there should be one.` }];
    },
  },
  {
    id: 'I-ACTORS', phase: 'initiation', section: 'stakeholders', severity: 'error', audience: 'ba',
    title: 'Users / actors are identified',
    why: 'User stories, use cases and process lanes are built from the actors.',
    check: (p) => (p.actors.length ? [] : [{ message: 'Add the types of users (actors) who will use the system.' }]),
  },
  {
    id: 'I-DATE', phase: 'initiation', section: 'project', severity: 'warning', audience: 'client',
    title: 'Target date is set',
    why: 'Planning releases needs a deadline.',
    check: (p) => (filled(p.initiation.targetDate) ? [] : [{ message: 'Set the target go-live date.' }]),
  },
  {
    id: 'I-RISKS', phase: 'initiation', section: 'raid', severity: 'warning', audience: 'ba',
    title: 'Initial risks are logged',
    why: 'Every project has risks; an empty log means they have not been looked for.',
    check: (p) => (p.risks.length ? [] : [{ message: 'Log at least the top project risks.' }]),
  },

  // ---------------- Requirements ----------------
  {
    id: 'R-ANY', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Functional requirements exist',
    why: 'Nothing can be designed, built or tested without them.',
    check: (p) => (activeReqs(p).length ? [] : [{ message: 'Add the functional requirements.' }]),
  },
  {
    id: 'R-CODES', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Requirement IDs are unique',
    why: 'Traceability breaks if two requirements share an ID.',
    check: (p) => {
      const seen = new Map();
      const out = [];
      for (const r of p.requirements) {
        const c = String(r.code || '').trim();
        if (!c) out.push({ message: `"${r.title || 'Untitled'}" has no ID.`, ref: r.id });
        else if (seen.has(c)) out.push({ message: `ID ${c} is used more than once.`, ref: r.id });
        seen.set(c, true);
      }
      return out;
    },
  },
  {
    id: 'R-SHALL', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Requirements use "shall"',
    why: '"Shall" marks a binding requirement; "should", "may" or "will" are read as optional.',
    check: (p) =>
      activeReqs(p).flatMap((r) => {
        const s = String(r.statement || '');
        if (!filled(s)) return [{ message: `${label(r)} has no requirement statement.`, ref: r.id }];
        if (/\b(shall|must)\b/i.test(s)) return [];
        return [{ message: `${label(r)} does not use "shall" — rewrite as "The system shall ...".`, ref: r.id }];
      }),
  },
  {
    id: 'R-AMBIG', phase: 'requirements', section: 'requirements', severity: 'warning', audience: 'ba',
    title: 'No ambiguous words',
    why: 'Words like "fast" or "easy" cannot be tested. Replace them with numbers or exact behaviour.',
    check: (p) => [
      ...activeReqs(p).flatMap((r) => {
        const w = findAmbiguous(r.statement);
        return w.length ? [{ message: `${label(r)} uses vague wording: ${w.map((x) => `"${x}"`).join(', ')}.`, ref: r.id }] : [];
      }),
      ...p.nfrs.flatMap((n) => {
        const w = findAmbiguous(`${n.statement} ${n.target}`);
        return w.length && !hasNumber(n.target) ? [{ message: `${label(n)} uses vague wording: ${w.map((x) => `"${x}"`).join(', ')}.`, ref: n.id }] : [];
      }),
    ],
  },
  {
    id: 'R-COMPOUND', phase: 'requirements', section: 'requirements', severity: 'warning', audience: 'ba',
    title: 'One requirement per statement',
    why: 'A statement with two "shall"s should be split so each part can be traced and tested.',
    check: (p) =>
      activeReqs(p).flatMap((r) => {
        const n = (String(r.statement).match(/\bshall\b/gi) || []).length;
        return n > 1 ? [{ message: `${label(r)} contains ${n} "shall" clauses — consider splitting it.`, ref: r.id }] : [];
      }),
  },
  {
    id: 'R-ACTOR', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Every requirement has an actor',
    why: 'User stories need to know who the requirement is for.',
    check: (p) =>
      activeReqs(p).flatMap((r) => (byId(p.actors, r.actorId) ? [] : [{ message: `${label(r)} has no actor (user type).`, ref: r.id }])),
  },
  {
    id: 'R-BENEFIT', phase: 'requirements', section: 'requirements', severity: 'warning', audience: 'client',
    title: 'Every requirement states its benefit',
    why: 'The "so that" explains the value and helps prioritise.',
    check: (p) => activeReqs(p).flatMap((r) => (filled(r.benefit) ? [] : [{ message: `${label(r)} has no benefit ("so that ...").`, ref: r.id }])),
  },
  {
    id: 'R-PRIORITY', phase: 'requirements', section: 'requirements', severity: 'warning', audience: 'client',
    title: 'Every requirement has a MoSCoW priority',
    why: 'The client decides priority; the team plans releases from it.',
    check: (p) => activeReqs(p).flatMap((r) => (filled(r.priority) ? [] : [{ message: `${label(r)} has no priority.`, ref: r.id }])),
  },
  {
    id: 'R-MUST-SHARE', phase: 'requirements', section: 'requirements', severity: 'warning', audience: 'client',
    title: 'Must-haves are no more than 60%',
    why: 'DSDM guidance: if more than ~60% is "Must", there is no contingency when things slip.',
    check: (p) => {
      const list = activeReqs(p);
      if (list.length < 4) return [];
      const must = list.filter((r) => r.priority === 'Must').length;
      const pct = Math.round((must / list.length) * 100);
      return pct > 60 ? [{ message: `${pct}% of requirements are "Must" — agree which can move to "Should" or "Could".` }] : [];
    },
  },
  {
    id: 'R-AC', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba', alsoGates: ['test'],
    title: 'Every requirement has acceptance criteria',
    why: 'Acceptance criteria are how the client and testers know a requirement is done.',
    check: (p) =>
      activeReqs(p).flatMap((r) => {
        if (r.acceptance.length) return [];
        return [{ message: `${label(r)} has no acceptance criteria (Given / When / Then).`, ref: r.id }];
      }),
  },
  {
    id: 'R-GWT', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Acceptance criteria are complete',
    why: 'Each scenario needs a Given, a When and a Then to be testable.',
    check: (p) =>
      activeReqs(p).flatMap((r) =>
        r.acceptance
          .map((ac, i) => (filled(ac.given) && filled(ac.when) && filled(ac.then) ? null : { message: `${label(r)} scenario ${i + 1} is missing Given, When or Then.`, ref: r.id }))
          .filter(Boolean)
      ),
  },
  {
    id: 'R-TRACE', phase: 'requirements', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Every requirement traces to an objective',
    why: 'A requirement that serves no objective is scope creep.',
    check: (p) =>
      activeReqs(p).flatMap((r) =>
        r.objectiveIds.some((id) => byId(p.objectives, id)) ? [] : [{ message: `${label(r)} is not linked to any business objective.`, ref: r.id }]
      ),
  },
  {
    id: 'R-OBJ-COVER', phase: 'requirements', section: 'objectives', severity: 'warning', audience: 'ba',
    title: 'Every objective is covered by requirements',
    why: 'An objective with no requirements will not be achieved.',
    check: (p) =>
      p.objectives.flatMap((o) =>
        activeReqs(p).some((r) => r.objectiveIds.includes(o.id)) ? [] : [{ message: `${label(o)} "${o.title}" has no requirements delivering it.`, ref: o.id }]
      ),
  },
  {
    id: 'R-SOURCE', phase: 'requirements', section: 'requirements', severity: 'info', audience: 'ba',
    title: 'Requirements record their source',
    why: 'Knowing who asked for a requirement tells you who to ask when it changes.',
    check: (p) => activeReqs(p).flatMap((r) => (byId(p.stakeholders, r.source) ? [] : [{ message: `${label(r)} has no source stakeholder.`, ref: r.id }])),
  },
  {
    id: 'R-NFR-ANY', phase: 'requirements', section: 'nfrs', severity: 'warning', audience: 'dev',
    title: 'Non-functional requirements exist',
    why: 'Performance, security and availability targets shape the architecture.',
    check: (p) => (p.nfrs.length ? [] : [{ message: 'Add non-functional requirements (performance, availability, security...).' }]),
  },
  {
    id: 'R-NFR-MEASURE', phase: 'requirements', section: 'nfrs', severity: 'error', audience: 'dev', alsoGates: ['test'],
    title: 'Non-functional requirements are measurable',
    why: 'An NFR needs a metric and a target value to be tested.',
    check: (p) =>
      p.nfrs.flatMap((n) => {
        if (!filled(n.metric) || !filled(n.target)) return [{ message: `${label(n)} needs a metric and a target.`, ref: n.id }];
        if (!hasNumber(n.target) && !/\b(pass|passed|no |zero|none|all|100)\b/i.test(n.target))
          return [{ message: `${label(n)} target "${n.target}" is not measurable.`, ref: n.id }];
        return [];
      }),
  },
  {
    id: 'R-COMPLIANCE', phase: 'requirements', section: 'nfrs', severity: 'warning', audience: 'dev',
    title: 'Compliance standards have matching NFRs',
    why: 'Each selected standard must be turned into a testable requirement.',
    check: (p) => {
      const out = [];
      const cats = new Set(p.nfrs.map((n) => n.category));
      const privacy = ['POPIA', 'GDPR', 'HIPAA'].filter((c) => p.meta.compliance.includes(c));
      if (privacy.length && !cats.has('Privacy') && !cats.has('Compliance'))
        out.push({ message: `${privacy.join(', ')} selected but there is no Privacy / Compliance NFR.` });
      if (['PCI-DSS', 'SOC 2', 'ISO 27001'].some((c) => p.meta.compliance.includes(c)) && !cats.has('Security'))
        out.push({ message: 'A security standard is selected but there is no Security NFR.' });
      if (p.meta.compliance.includes('WCAG 2.2') && !cats.has('Accessibility'))
        out.push({ message: 'WCAG 2.2 is selected but there is no Accessibility NFR.' });
      return out;
    },
  },
  {
    id: 'R-SECURITY', phase: 'requirements', section: 'nfrs', severity: 'warning', audience: 'dev',
    title: 'Security is specified',
    why: 'Systems that hold personal data need explicit security requirements.',
    check: (p) => {
      const personal = p.entities.some((e) => e.fields.some((f) => /email|mobile|phone|name|id_?number|address|birth/i.test(f.name)));
      if (!personal) return [];
      return p.nfrs.some((n) => n.category === 'Security') ? [] : [{ message: 'The data model holds personal data but there is no Security NFR (authentication, encryption, audit).' }];
    },
  },
  {
    id: 'R-RULES-LINK', phase: 'requirements', section: 'rules', severity: 'warning', audience: 'ba',
    title: 'Business rules are linked to requirements',
    why: 'Developers find rules through the requirements that use them.',
    check: (p) =>
      p.rules.flatMap((b) => (b.requirementIds.some((id) => byId(p.requirements, id)) ? [] : [{ message: `${label(b)} is not linked to any requirement.`, ref: b.id }])),
  },
  {
    id: 'R-RULE-VALUES', phase: 'requirements', section: 'rules', severity: 'warning', audience: 'client',
    title: 'Business rules are exact',
    why: 'Rules must give exact values so they can be coded and tested.',
    check: (p) =>
      p.rules.flatMap((b) => {
        const w = findAmbiguous(b.statement);
        return w.length ? [{ message: `${label(b)} uses vague wording: ${w.map((x) => `"${x}"`).join(', ')}.`, ref: b.id }] : [];
      }),
  },
  {
    id: 'R-QUESTIONS', phase: 'requirements', section: 'decisions', severity: 'warning', audience: 'client',
    title: 'Client questions are answered',
    why: 'Open questions are unknowns that can change the requirements.',
    check: (p) =>
      p.questions
        .filter((q) => q.status !== 'Answered' && q.askedOf === 'Client')
        .map((q) => ({ message: `${label(q)}: "${q.question}" is still open${q.due ? ` (due ${q.due})` : ''}.`, ref: q.id })),
  },
  {
    id: 'R-OVERDUE', phase: 'requirements', section: 'decisions', severity: 'error', audience: 'client',
    title: 'No overdue questions',
    why: 'Overdue answers block analysis and delay the whole plan.',
    check: (p, ctx) =>
      p.questions
        .filter((q) => q.status !== 'Answered' && q.due && q.due < ctx.today)
        .map((q) => ({ message: `${label(q)} was due ${q.due} and is still unanswered.`, ref: q.id })),
  },

  // ---------------- Design ----------------
  {
    id: 'D-ENTITIES', phase: 'design', section: 'entities', severity: 'error', audience: 'dev',
    title: 'Data entities are defined',
    why: 'The data model drives the database and the API.',
    check: (p) => (p.entities.length ? [] : [{ message: 'Add the main data entities (e.g. Customer, Order).' }]),
  },
  {
    id: 'D-PK', phase: 'design', section: 'entities', severity: 'error', audience: 'dev',
    title: 'Every entity has a primary key',
    why: 'Without a key, records cannot be identified or related.',
    check: (p) => p.entities.flatMap((e) => (e.fields.some((f) => f.pk) ? [] : [{ message: `${e.name || 'An entity'} has no primary key field.`, ref: e.id }])),
  },
  {
    id: 'D-FIELDS', phase: 'design', section: 'entities', severity: 'error', audience: 'dev',
    title: 'Fields have names and types',
    why: 'The data dictionary must be complete for developers.',
    check: (p) =>
      p.entities.flatMap((e) =>
        e.fields.filter((f) => !filled(f.name) || !filled(f.type)).map(() => ({ message: `${e.name} has a field with no name or type.`, ref: e.id }))
      ),
  },
  {
    id: 'D-FK', phase: 'design', section: 'entities', severity: 'error', audience: 'dev',
    title: 'Foreign keys point to real entities',
    why: 'A foreign key to a missing entity breaks the data model.',
    check: (p) => {
      const names = new Set(p.entities.map((e) => e.name));
      return p.entities.flatMap((e) =>
        e.fields.filter((f) => filled(f.fk) && !names.has(f.fk)).map((f) => ({ message: `${e.name}.${f.name} references "${f.fk}", which does not exist.`, ref: e.id }))
      );
    },
  },
  {
    id: 'D-REL', phase: 'design', section: 'entities', severity: 'error', audience: 'dev',
    title: 'Relationships are valid',
    why: 'Each relationship must join two existing entities.',
    check: (p) =>
      p.relationships.flatMap((r) =>
        byId(p.entities, r.fromId) && byId(p.entities, r.toId) ? [] : [{ message: 'A relationship points to a deleted entity.', ref: r.id }]
      ),
  },
  {
    id: 'D-ISOLATED', phase: 'design', section: 'entities', severity: 'warning', audience: 'dev',
    title: 'No isolated entities',
    why: 'An entity with no relationships is usually a modelling gap.',
    check: (p) => {
      if (p.entities.length < 2) return [];
      return p.entities
        .filter((e) => !p.relationships.some((r) => r.fromId === e.id || r.toId === e.id) && !e.fields.some((f) => filled(f.fk)) && !p.entities.some((o) => o.fields.some((f) => f.fk === e.name)))
        .map((e) => ({ message: `${e.name} is not related to any other entity.`, ref: e.id }));
    },
  },
  {
    id: 'D-PROCESS', phase: 'design', section: 'processes', severity: 'error', audience: 'ba',
    title: 'Business processes are mapped',
    why: 'Process flows show the client how the system will work day to day.',
    check: (p) => (p.processes.length ? [] : [{ message: 'Map at least one business process (steps, decisions, outcomes).' }]),
  },
  {
    id: 'D-START-END', phase: 'design', section: 'processes', severity: 'error', audience: 'ba',
    title: 'Every process has a start and an end',
    why: 'A process without a clear start and end cannot be followed or tested.',
    check: (p) =>
      p.processes.flatMap((pr) => {
        const out = [];
        if (!pr.steps.some((s) => s.type === 'start')) out.push({ message: `"${pr.name}" has no start step.`, ref: pr.id });
        if (!pr.steps.some((s) => s.type === 'end')) out.push({ message: `"${pr.name}" has no end step.`, ref: pr.id });
        return out;
      }),
  },
  {
    id: 'D-LINKS', phase: 'design', section: 'processes', severity: 'error', audience: 'ba',
    title: 'Process steps link correctly',
    why: 'Every decision needs a Yes and a No path; every link must point to a real step.',
    check: (p) =>
      p.processes.flatMap((pr) => {
        const codes = new Set(pr.steps.map((s) => s.code));
        const out = [];
        pr.steps.forEach((s, i) => {
          if (s.type === 'decision') {
            if (!s.yes || !s.no) out.push({ message: `"${pr.name}" ${s.code} (${s.label}) needs both a Yes and a No path.`, ref: pr.id });
          }
          for (const t of [s.next, s.yes, s.no].filter(Boolean)) {
            if (!codes.has(t)) out.push({ message: `"${pr.name}" ${s.code} points to step ${t}, which does not exist.`, ref: pr.id });
          }
          if (s.type !== 'end' && s.type !== 'decision' && !stepTargets(pr.steps, i).length)
            out.push({ message: `"${pr.name}" ${s.code} (${s.label}) is a dead end — link it to a next step or make it an end.`, ref: pr.id });
        });
        return out;
      }),
  },
  {
    id: 'D-REACH', phase: 'design', section: 'processes', severity: 'warning', audience: 'ba',
    title: 'Every step can be reached',
    why: 'A step that cannot be reached from the start is never performed.',
    check: (p) =>
      p.processes.flatMap((pr) => {
        const start = pr.steps.findIndex((s) => s.type === 'start');
        if (start < 0) return [];
        const idx = new Map(pr.steps.map((s, i) => [s.code, i]));
        const seen = new Set();
        const stack = [start];
        while (stack.length) {
          const i = stack.pop();
          if (seen.has(i)) continue;
          seen.add(i);
          for (const t of stepTargets(pr.steps, i)) if (idx.has(t)) stack.push(idx.get(t));
        }
        return pr.steps.filter((_, i) => !seen.has(i)).map((s) => ({ message: `"${pr.name}" ${s.code} (${s.label}) cannot be reached from the start.`, ref: pr.id }));
      }),
  },
  {
    id: 'D-STEP-ACTOR', phase: 'design', section: 'processes', severity: 'warning', audience: 'ba',
    title: 'Every step has an owner',
    why: 'Swimlanes and sequence diagrams need to know who performs each step.',
    check: (p) =>
      p.processes.flatMap((pr) =>
        pr.steps.filter((s) => !s.actorId).map((s) => ({ message: `"${pr.name}" ${s.code} (${s.label}) has no actor.`, ref: pr.id }))
      ),
  },
  {
    id: 'D-INTEGRATION', phase: 'design', section: 'integrations', severity: 'error', audience: 'dev',
    title: 'Integrations are fully specified',
    why: 'Developers need the protocol, direction and authentication for every external system.',
    check: (p) =>
      p.integrations.flatMap((i) => {
        const miss = [];
        if (!filled(i.protocol)) miss.push('protocol');
        if (!filled(i.direction)) miss.push('direction');
        if (!filled(i.auth)) miss.push('authentication method');
        if (!filled(i.dataExchanged)) miss.push('data exchanged');
        return miss.length ? [{ message: `${i.name} is missing: ${miss.join(', ')}.`, ref: i.id }] : [];
      }),
  },
  {
    id: 'D-INT-OWNER', phase: 'design', section: 'integrations', severity: 'warning', audience: 'client',
    title: 'Every integration has an owner',
    why: 'Someone must provide access, test environments and support for each external system.',
    check: (p) => p.integrations.flatMap((i) => (byId(p.stakeholders, i.owner) ? [] : [{ message: `${i.name} has no owner contact.`, ref: i.id }])),
  },
  {
    id: 'D-COMPONENTS', phase: 'design', section: 'components', severity: 'warning', audience: 'dev',
    title: 'Architecture components are defined',
    why: 'Without components the architecture diagram is only a generic guess.',
    check: (p) => (p.components.length ? [] : [{ message: 'Define the architecture components (apps, services, databases, external systems).' }]),
  },
  {
    id: 'D-COMP-LINKS', phase: 'design', section: 'components', severity: 'warning', audience: 'dev',
    title: 'Components are connected',
    why: 'An unconnected component is either missing a link or not needed.',
    check: (p) =>
      p.components
        .filter((c) => !c.connectsTo.length && !p.components.some((o) => o.connectsTo.includes(c.id)))
        .map((c) => ({ message: `${c.name} is not connected to anything.`, ref: c.id })),
  },
  {
    id: 'D-INT-COMP', phase: 'design', section: 'components', severity: 'info', audience: 'dev',
    title: 'Integrations appear in the architecture',
    why: 'Each external system should be a component so its connections are visible.',
    check: (p) => {
      if (!p.components.length) return [];
      const names = p.components.map((c) => c.name.toLowerCase());
      return p.integrations
        .filter((i) => !names.includes(i.name.toLowerCase()))
        .map((i) => ({ message: `${i.name} is an integration but not an architecture component.`, ref: i.id }));
    },
  },

  // ---------------- Build ----------------
  {
    id: 'B-RELEASES', phase: 'build', section: 'releases', severity: 'error', audience: 'ba',
    title: 'Releases are planned',
    why: 'The team needs to know what is being built first.',
    check: (p) => (p.releases.length ? [] : [{ message: 'Plan at least one release.' }]),
  },
  {
    id: 'B-MUST-RELEASE', phase: 'build', section: 'requirements', severity: 'error', audience: 'ba',
    title: 'Every Must-have is in a release',
    why: 'A Must-have with no release will not be delivered.',
    check: (p) =>
      activeReqs(p)
        .filter((r) => r.priority === 'Must' && !byId(p.releases, r.releaseId))
        .map((r) => ({ message: `${label(r)} is a Must-have but is not assigned to a release.`, ref: r.id })),
  },
  {
    id: 'B-DATES', phase: 'build', section: 'releases', severity: 'warning', audience: 'ba',
    title: 'Release dates are valid',
    why: 'Each release needs a start before its end, and should finish before the target date.',
    check: (p) =>
      p.releases.flatMap((r) => {
        if (!r.start || !r.end) return [{ message: `${r.name} needs a start and end date.`, ref: r.id }];
        if (r.start > r.end) return [{ message: `${r.name} ends before it starts.`, ref: r.id }];
        if (p.initiation.targetDate && r.end > p.initiation.targetDate) return [{ message: `${r.name} ends after the target date (${p.initiation.targetDate}).`, ref: r.id }];
        return [];
      }),
  },
  {
    id: 'B-DOR', phase: 'build', section: 'requirements', severity: 'warning', audience: 'ba',
    title: 'Stories meet the Definition of Ready',
    why: 'Only ready stories should enter a sprint.',
    check: (p) =>
      activeReqs(p)
        .filter((r) => r.priority !== "Won't")
        .flatMap((r) => {
          const miss = dorGaps(p, r);
          return miss.length ? [{ message: `${label(r)} is not ready: ${miss.join(', ')}.`, ref: r.id }] : [];
        }),
  },
  {
    id: 'B-DEPS', phase: 'build', section: 'raid', severity: 'warning', audience: 'client',
    title: 'Dependencies have owners and dates',
    why: 'An unowned dependency is a hidden risk to the schedule.',
    check: (p, ctx) =>
      p.dependencies.flatMap((d) => {
        if (!byId(p.stakeholders, d.owner) || !d.due) return [{ message: `${label(d)} needs an owner and a due date.`, ref: d.id }];
        if (d.due < ctx.today) return [{ message: `${label(d)} was due ${d.due} — confirm it has been met.`, ref: d.id }];
        return [];
      }),
  },

  // ---------------- RAID (continuous, checked from Initiation) ----------------
  {
    id: 'K-MITIGATE', phase: 'initiation', section: 'raid', severity: 'warning', audience: 'ba',
    title: 'Risks have a mitigation and owner',
    why: 'A risk without a mitigation or owner is just a worry.',
    check: (p) =>
      p.risks
        .filter((r) => r.status !== 'Closed')
        .flatMap((r) => (filled(r.mitigation) && byId(p.stakeholders, r.owner) ? [] : [{ message: `${label(r)} needs a mitigation and an owner.`, ref: r.id }])),
  },
  {
    id: 'K-HIGH', phase: 'requirements', section: 'raid', severity: 'error', audience: 'client',
    title: 'High risks are being actively managed',
    why: 'A high risk (score 15+) left "Open" with no mitigation can stop the project.',
    check: (p) =>
      p.risks
        .filter((r) => riskRating(r) === 'High' && r.status === 'Open' && !filled(r.mitigation))
        .map((r) => ({ message: `${label(r)} is High and has no mitigation.`, ref: r.id })),
  },
  {
    id: 'K-ASSUME', phase: 'design', section: 'raid', severity: 'info', audience: 'client',
    title: 'Assumptions are validated',
    why: 'An assumption that turns out false becomes an issue.',
    check: (p) => p.assumptions.filter((a) => !a.validated).map((a) => ({ message: `${label(a)} has not been validated yet: "${a.text}".`, ref: a.id })),
  },
  {
    id: 'K-DECISIONS', phase: 'initiation', section: 'decisions', severity: 'info', audience: 'ba',
    title: 'Decisions record rationale and owner',
    why: 'Future teams need to know why a decision was taken and by whom.',
    check: (p) =>
      p.decisions.flatMap((d) => (filled(d.rationale) && filled(d.owner) ? [] : [{ message: `${label(d)} needs a rationale and an owner.`, ref: d.id }])),
  },
  {
    id: 'Q-DELIVERY', phase: 'design', section: 'decisions', severity: 'warning', audience: 'dev',
    title: 'Delivery-team questions are answered',
    why: 'Technical unknowns must be resolved before build starts.',
    check: (p) =>
      p.questions
        .filter((q) => q.status !== 'Answered' && q.askedOf === 'Delivery')
        .map((q) => ({ message: `${label(q)}: "${q.question}" is still open.`, ref: q.id })),
  },
];

// Rules that check items in a list only apply once the list has something in it.
// (The "is the list empty?" question is asked by a separate rule.) Not-applicable
// rules are left out of the score so an empty project cannot look "ready".
const hasReqs = (p) => activeReqs(p).length > 0;
const APPLIES = {
  'I-KPI': (p) => p.objectives.length > 0,
  'R-CODES': (p) => p.requirements.length > 0,
  'R-SHALL': hasReqs, 'R-AMBIG': (p) => hasReqs(p) || p.nfrs.length > 0, 'R-COMPOUND': hasReqs, 'R-ACTOR': hasReqs,
  'R-BENEFIT': hasReqs, 'R-PRIORITY': hasReqs, 'R-AC': hasReqs, 'R-GWT': hasReqs, 'R-TRACE': hasReqs, 'R-SOURCE': hasReqs,
  'R-MUST-SHARE': (p) => activeReqs(p).length >= 4,
  'R-OBJ-COVER': (p) => p.objectives.length > 0,
  'R-NFR-MEASURE': (p) => p.nfrs.length > 0,
  'R-COMPLIANCE': (p) => p.meta.compliance.length > 0,
  'R-SECURITY': (p) => p.entities.length > 0,
  'R-RULES-LINK': (p) => p.rules.length > 0, 'R-RULE-VALUES': (p) => p.rules.length > 0,
  'D-PK': (p) => p.entities.length > 0, 'D-FIELDS': (p) => p.entities.length > 0, 'D-FK': (p) => p.entities.length > 0,
  'D-ISOLATED': (p) => p.entities.length > 1, 'D-REL': (p) => p.relationships.length > 0,
  'D-START-END': (p) => p.processes.length > 0, 'D-LINKS': (p) => p.processes.length > 0,
  'D-REACH': (p) => p.processes.length > 0, 'D-STEP-ACTOR': (p) => p.processes.length > 0,
  'D-INTEGRATION': (p) => p.integrations.length > 0, 'D-INT-OWNER': (p) => p.integrations.length > 0,
  'D-COMP-LINKS': (p) => p.components.length > 0, 'D-INT-COMP': (p) => p.components.length > 0 && p.integrations.length > 0,
  'B-MUST-RELEASE': hasReqs, 'B-DOR': hasReqs, 'B-DATES': (p) => p.releases.length > 0,
  'B-DEPS': (p) => p.dependencies.length > 0,
  'K-MITIGATE': (p) => p.risks.length > 0, 'K-HIGH': (p) => p.risks.length > 0,
  'K-ASSUME': (p) => p.assumptions.length > 0, 'K-DECISIONS': (p) => p.decisions.length > 0,
};
for (const r of RULES) if (APPLIES[r.id]) r.applies = APPLIES[r.id];

export function dorGaps(p, r) {
  const miss = [];
  if (!byId(p.actors, r.actorId)) miss.push('no actor');
  if (!filled(r.benefit)) miss.push('no benefit');
  if (!r.acceptance.length) miss.push('no acceptance criteria');
  if (!filled(r.priority)) miss.push('no priority');
  if (!r.objectiveIds.some((id) => byId(p.objectives, id))) miss.push('no objective');
  if (!byId(p.releases, r.releaseId)) miss.push('no release');
  return miss;
}

const WEIGHT = { error: 3, warning: 2, info: 1 };
const SEV_ORDER = { error: 0, warning: 1, info: 2 };

/** Run every rule. Returns results plus a readiness score and per-phase gate status. */
export function evaluate(p, opts = {}) {
  const ctx = { today: opts.today || new Date().toISOString().slice(0, 10) };
  const results = RULES.map((rule) => {
    let issues = [];
    let na = false;
    try {
      na = rule.applies ? !rule.applies(p) : false;
      issues = na ? [] : rule.check(p, ctx) || [];
    } catch (err) {
      issues = [{ message: `Check could not run: ${err.message}` }];
    }
    return { rule, issues, na, passed: !na && issues.length === 0 };
  });
  const scored = results.filter((r) => !r.na);

  const issues = results
    .flatMap(({ rule, issues }) => issues.map((i) => ({ ...i, rule })))
    .sort((a, b) => PHASE_BY_ID[a.rule.phase].order - PHASE_BY_ID[b.rule.phase].order || SEV_ORDER[a.rule.severity] - SEV_ORDER[b.rule.severity]);

  const total = scored.reduce((s, r) => s + WEIGHT[r.rule.severity], 0);
  const passed = scored.reduce((s, r) => s + (r.passed ? WEIGHT[r.rule.severity] : 0), 0);
  // Not-applicable rules still count against the score as "not done yet" for the
  // phases that are already open, so the score grows as real content is added.
  const pending = results.filter((r) => r.na).reduce((s, r) => s + WEIGHT[r.rule.severity], 0);
  const score = total + pending ? Math.round((passed / (total + pending)) * 100) : 0;

  const phases = PHASES.map((ph, i) => {
    const gateRules = scored.filter((r) => r.rule.phase === ph.id || (r.rule.alsoGates || []).includes(ph.id));
    const naRules = results.filter((r) => r.na && (r.rule.phase === ph.id || (r.rule.alsoGates || []).includes(ph.id)));
    const errors = gateRules.filter((r) => r.rule.severity === 'error' && !r.passed);
    const warnings = gateRules.filter((r) => r.rule.severity === 'warning' && !r.passed);
    const gate = p.gates?.[ph.id] || {};
    const checklist = ph.checklist.map((c) => ({ ...c, done: Boolean(gate.checklist?.[c.id]) }));
    const checklistDone = checklist.every((c) => c.done);
    const prevApproved = i === 0 || Boolean(p.gates?.[PHASES[i - 1].id]?.approved);
    const w = gateRules.reduce((s, r) => s + WEIGHT[r.rule.severity], 0) + naRules.reduce((s, r) => s + WEIGHT[r.rule.severity], 0);
    const pw = gateRules.reduce((s, r) => s + (r.passed ? WEIGHT[r.rule.severity] : 0), 0);
    const listPct = checklist.length ? checklist.filter((c) => c.done).length / checklist.length : 1;
    const checkPct = w ? pw / w : listPct;
    return {
      phase: ph,
      rules: gateRules,
      errors,
      warnings,
      checklist,
      checklistDone,
      prevApproved,
      approved: Boolean(gate.approved),
      approvedBy: gate.approvedBy || '',
      approvedOn: gate.approvedOn || '',
      canApprove: prevApproved && errors.length === 0 && checklistDone && !gate.approved,
      readiness: Math.round((checkPct * 0.8 + listPct * 0.2) * 100),
    };
  });

  const current = phases.find((ph) => !ph.approved) || phases[phases.length - 1];

  return { results, issues, score, phases, current, ctx };
}

/** Group outstanding issues into who needs to act, current phase first. */
export function nextActions(evaluation, limit = 8) {
  const curOrder = evaluation.current.phase.order;
  const relevant = evaluation.issues.filter((i) => PHASE_BY_ID[i.rule.phase].order <= curOrder + 1 && i.rule.severity !== 'info');
  const pick = (aud) => relevant.filter((i) => i.rule.audience === aud).slice(0, limit);
  return { client: pick('client'), dev: pick('dev'), ba: pick('ba') };
}

export function issuesBySection(evaluation) {
  const map = {};
  for (const i of evaluation.issues) {
    if (i.rule.severity === 'info') continue;
    map[i.rule.section] = (map[i.rule.section] || 0) + 1;
  }
  return map;
}

export function describeActor(p, id) {
  return id === 'sys' ? 'System' : actorName(p, id) || 'Unassigned';
}
