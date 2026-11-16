// Document generators: deterministic templates filled from project data.
// Structures follow common industry practice (PMBOK charter, BABOK BRD,
// IEEE 29148 SRS, ISTQB-style test plan, RAID log, phase-gate report).
import {
  byId, actorName, stakeholderName, releaseName, storyFor, storyCode, testCasesFor,
  riskScore, riskRating, today, slug,
} from '../model.js';
import { PHASES, PHASE_BY_ID, PLC_STAGES, METHODOLOGY_NOTES, DEFINITION_OF_READY, DEFINITION_OF_DONE, SEVERITY_DEFINITIONS } from '../sdlc.js';
import { dorGaps, describeActor } from '../rules.js';

// ---------- markdown helpers ----------
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '-';
export function table(headers, rows) {
  if (!rows.length) return '_None recorded._\n';
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n') + '\n';
}
const list = (items, empty = '_None recorded._') => (items.length ? items.map((i) => `- ${i}`).join('\n') : empty) + '\n';
const or = (v, fallback = '_Not yet provided._') => (String(v ?? '').trim() ? v : fallback);
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (headers, rows) => [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';

const active = (p) => p.requirements.filter((r) => r.status !== 'Rejected');
const objectiveCodes = (p, r) => r.objectiveIds.map((id) => byId(p.objectives, id)?.code).filter(Boolean).join(', ');
const rulesFor = (p, r) => p.rules.filter((b) => b.requirementIds.includes(r.id));

function docControl(p, title, ev, phaseId) {
  const approved = ev?.phases.find((x) => x.phase.id === phaseId)?.approved;
  return [
    `# ${title}`,
    `**${or(p.meta.name, 'Untitled project')}**${p.meta.client ? ` · ${p.meta.client}` : ''}`,
    '',
    table(
      ['Project code', 'Version', 'Status', 'Date', 'Prepared by', 'Methodology'],
      [[p.meta.code, p.meta.version, approved ? 'Approved' : 'Draft for review', today(), p.meta.preparedBy, p.meta.methodology]]
    ),
  ].join('\n');
}

function approvals(p) {
  const approvers = p.stakeholders.filter((s) => s.approver);
  return table(
    ['Name', 'Role', 'Organisation', 'Signature', 'Date'],
    approvers.map((s) => [s.name, s.role, s.organisation, '', ''])
  );
}

function stakeholderTable(p) {
  return table(
    ['Name', 'Role', 'Organisation', 'Side', 'RACI', 'Influence', 'Interest', 'Approver'],
    p.stakeholders.map((s) => [s.name, s.role, s.organisation, s.side, s.raci, s.influence, s.interest, s.approver ? 'Yes' : 'No'])
  );
}

function objectivesTable(p) {
  return table(['ID', 'Objective', 'KPI', 'Target'], p.objectives.map((o) => [o.code, o.title, o.kpi, o.target]));
}

function raidTables(p) {
  return [
    '### Risks',
    table(
      ['ID', 'Risk', 'L', 'I', 'Score', 'Rating', 'Mitigation', 'Owner', 'Status'],
      [...p.risks]
        .sort((a, b) => riskScore(b) - riskScore(a))
        .map((r) => [r.code, r.description, r.likelihood, r.impact, riskScore(r), riskRating(r), r.mitigation, stakeholderName(p, r.owner), r.status])
    ),
    '### Assumptions',
    table(['ID', 'Assumption', 'Owner', 'Validated'], p.assumptions.map((a) => [a.code, a.text, stakeholderName(p, a.owner), a.validated ? 'Yes' : 'No'])),
    '### Constraints',
    table(['ID', 'Constraint'], p.constraints.map((c) => [c.code, c.text])),
    '### Dependencies',
    table(['ID', 'Dependency', 'Owner', 'Due'], p.dependencies.map((d) => [d.code, d.text, stakeholderName(p, d.owner), d.due])),
  ].join('\n');
}

// ---------- 1. Project charter ----------
function charter(p, ev) {
  const plc = PLC_STAGES.map((s) => {
    const phases = PHASES.filter((ph) => ph.plc.includes(s.id)).map((ph) => ph.name);
    return [s.name, s.purpose, phases.join(', ') || 'All phases (continuous)'];
  });
  return [
    docControl(p, 'Project Charter', ev, 'initiation'),
    '## 1. Purpose',
    `This charter formally authorises the **${or(p.meta.name, 'project')}** and gives the project team the authority to use resources to deliver it.`,
    '',
    '## 2. Background and problem',
    or(p.initiation.problem),
    '',
    '## 3. Vision',
    or(p.initiation.vision),
    '',
    '## 4. Objectives and success measures',
    objectivesTable(p),
    '### Success criteria',
    list(p.initiation.successCriteria),
    '## 5. Scope',
    '### In scope',
    list(p.initiation.scopeIn),
    '### Out of scope',
    list(p.initiation.scopeOut),
    '## 6. Stakeholders and RACI',
    `**Sponsor:** ${or(stakeholderName(p, p.meta.sponsor), 'Not yet appointed')}`,
    '',
    stakeholderTable(p),
    '## 7. Budget and timeline',
    table(['Budget', 'Target go-live'], [[p.initiation.budget, p.initiation.targetDate]]),
    '## 8. Delivery approach',
    `**Methodology:** ${p.meta.methodology}. ${METHODOLOGY_NOTES[p.meta.methodology] || ''}`,
    '',
    'The project follows the Software Development Life Cycle (SDLC) phases in order, each closed by a formal gate:',
    '',
    PHASES.map((ph) => `${ph.order}. **${ph.name}** — ${ph.purpose}`).join('\n'),
    '',
    '### Mapping to the Project Life Cycle (PLC)',
    table(['PLC stage', 'Purpose', 'SDLC phases'], plc),
    '## 9. High-level risks, assumptions and constraints',
    raidTables(p),
    '## 10. Approval',
    'By signing below, the sponsor authorises the project to proceed to Requirements Analysis.',
    '',
    approvals(p),
  ].join('\n');
}

// ---------- 2. BRD ----------
function brd(p, ev) {
  const reqs = active(p);
  const byPriority = ['Must', 'Should', 'Could', "Won't"].map((pr) => [pr, reqs.filter((r) => r.priority === pr).length]);
  return [
    docControl(p, 'Business Requirements Document (BRD)', ev, 'requirements'),
    '## 1. Executive summary',
    or(p.meta.summary),
    '',
    '## 2. Business problem',
    or(p.initiation.problem),
    '',
    '## 3. Business objectives',
    objectivesTable(p),
    '## 4. Scope',
    '### In scope',
    list(p.initiation.scopeIn),
    '### Out of scope',
    list(p.initiation.scopeOut),
    '## 5. Stakeholders',
    stakeholderTable(p),
    '## 6. Users and personas',
    table(['Actor', 'Description', 'Goals'], p.actors.map((a) => [a.name, a.description, a.goals])),
    '## 7. Business requirements',
    `${reqs.length} requirements: ${byPriority.map(([k, v]) => `${v} ${k}`).join(', ')}.`,
    '',
    table(
      ['ID', 'Requirement', 'Priority', 'Actor', 'Objective', 'Benefit'],
      reqs.map((r) => [r.code, r.title, r.priority, actorName(p, r.actorId), objectiveCodes(p, r), r.benefit])
    ),
    '## 8. Business rules',
    table(['ID', 'Rule', 'Applies to'], p.rules.map((b) => [b.code, b.statement, b.requirementIds.map((id) => byId(p.requirements, id)?.code).filter(Boolean).join(', ')])),
    '## 9. Compliance and regulatory requirements',
    list(p.meta.compliance.map((c) => `**${c}** — see the non-functional requirements in the SRS for how compliance will be verified.`)),
    '## 10. Assumptions, constraints, dependencies and risks',
    raidTables(p),
    '## 11. Open questions',
    table(['ID', 'Question', 'Asked of', 'Owner', 'Due', 'Status'], p.questions.map((q) => [q.code, q.question, q.askedOf, stakeholderName(p, q.owner), q.due, q.status])),
    '## 12. Approval',
    'Signing confirms that this BRD correctly describes the business need and may be used as the baseline for the solution.',
    '',
    approvals(p),
  ].join('\n');
}

// ---------- 3. SRS (IEEE 29148 structure) ----------
function srs(p, ev) {
  const reqs = active(p);
  const frBlocks = reqs.map((r) => {
    const rules = rulesFor(p, r);
    return [
      `### ${r.code} ${r.title}`,
      `> ${or(r.statement, 'Statement not yet written.')}`,
      '',
      table(
        ['Priority', 'Actor', 'Source', 'Objective', 'Release', 'Status'],
        [[r.priority, actorName(p, r.actorId), stakeholderName(p, r.source), objectiveCodes(p, r), releaseName(p, r.releaseId), r.status]]
      ),
      `**Rationale:** ${or(r.benefit, '_Not yet provided._')}`,
      '',
      rules.length ? `**Business rules:** ${rules.map((b) => `${b.code} ${b.statement}`).join('; ')}` : '',
      '',
      '**Acceptance criteria**',
      '',
      r.acceptance.length
        ? r.acceptance.map((ac, i) => `${i + 1}. **${ac.title || `Scenario ${i + 1}`}** — Given ${ac.given}, when ${ac.when}, then ${ac.then}.`).join('\n')
        : '_None yet — required before sign-off._',
      '',
    ].join('\n');
  });
  return [
    docControl(p, 'Software Requirements Specification (SRS)', ev, 'requirements'),
    '## 1. Introduction',
    '### 1.1 Purpose',
    `This document specifies the software requirements for **${or(p.meta.name, 'the system')}**. It is the agreed baseline for design, build and testing.`,
    '',
    '### 1.2 Scope',
    or(p.meta.summary),
    '',
    '### 1.3 Conventions',
    '- **Shall** marks a mandatory requirement.',
    '- Priorities use MoSCoW: Must, Should, Could, Won’t (this time).',
    '- IDs: FR = functional requirement, NFR = non-functional requirement, BR = business rule.',
    '',
    '## 2. Overall description',
    '### 2.1 Product perspective',
    `The system interacts with ${p.integrations.length} external system(s): ${p.integrations.map((i) => i.name).join(', ') || 'none'}.`,
    '',
    '### 2.2 User classes',
    table(['Actor', 'Description', 'Goals'], p.actors.map((a) => [a.name, a.description, a.goals])),
    '### 2.3 Operating environment',
    table(['Component', 'Type', 'Technology'], p.components.map((c) => [c.name, c.type, c.tech])),
    '### 2.4 Constraints',
    list(p.constraints.map((c) => `${c.code}: ${c.text}`)),
    '### 2.5 Assumptions and dependencies',
    list([...p.assumptions.map((a) => `${a.code}: ${a.text}`), ...p.dependencies.map((d) => `${d.code}: ${d.text}`)]),
    '## 3. Functional requirements',
    frBlocks.join('\n') || '_None recorded._\n',
    '## 4. Non-functional requirements',
    table(['ID', 'Category', 'Requirement', 'Metric', 'Target', 'Priority'], p.nfrs.map((n) => [n.code, n.category, n.statement, n.metric, n.target, n.priority])),
    '## 5. Data requirements',
    'See the Solution Design & Data Specification for the full data dictionary. Entities in scope:',
    '',
    list(p.entities.map((e) => `**${e.name}** — ${e.description || ''}`)),
    '## 6. External interface requirements',
    table(
      ['System', 'Direction', 'Protocol', 'Purpose', 'Data exchanged', 'Authentication'],
      p.integrations.map((i) => [i.name, i.direction, i.protocol, i.purpose, i.dataExchanged, i.auth])
    ),
    '## 7. Business rules',
    table(['ID', 'Rule'], p.rules.map((b) => [b.code, b.statement])),
    '## Appendix A. Open questions',
    table(['ID', 'Question', 'Owner', 'Status'], p.questions.filter((q) => q.status !== 'Answered').map((q) => [q.code, q.question, stakeholderName(p, q.owner), q.status])),
    '## Approval',
    approvals(p),
  ].join('\n');
}

// ---------- 4. User stories ----------
function stories(p, ev) {
  const reqs = active(p).filter((r) => r.priority !== "Won't");
  const blocks = reqs.map((r) => {
    const gaps = dorGaps(p, r);
    const gherkin = r.acceptance.length
      ? [
          '```gherkin',
          `Feature: ${r.title}`,
          ...r.acceptance.flatMap((ac, i) => [
            '',
            `  Scenario: ${ac.title || `Scenario ${i + 1}`}`,
            `    Given ${ac.given}`,
            `    When ${ac.when}`,
            `    Then ${ac.then}`,
          ]),
          '```',
        ].join('\n')
      : '_No acceptance criteria yet._';
    return [
      `### ${storyCode(r)} — ${r.title}`,
      `**${storyFor(p, r)}**`,
      '',
      table(['Traces to', 'Priority', 'Release', 'Objective'], [[r.code, r.priority, releaseName(p, r.releaseId), objectiveCodes(p, r)]]),
      rulesFor(p, r).length ? `**Business rules:** ${rulesFor(p, r).map((b) => `${b.code} ${b.statement}`).join('; ')}\n` : '',
      gherkin,
      '',
      `**Definition of Ready:** ${gaps.length ? `Not ready — ${gaps.join(', ')}.` : 'Ready for sprint.'}`,
      '',
    ].join('\n');
  });
  const ready = reqs.filter((r) => !dorGaps(p, r).length).length;
  return [
    docControl(p, 'User Stories & Acceptance Criteria', ev, 'requirements'),
    `${reqs.length} stories, **${ready} ready** for development.`,
    '',
    '## Definition of Ready',
    list(DEFINITION_OF_READY),
    '## Definition of Done',
    list(DEFINITION_OF_DONE),
    '## Stories',
    blocks.join('\n') || '_None recorded._\n',
  ].join('\n');
}

// ---------- 5. Test plan ----------
function testplan(p, ev) {
  const reqs = active(p);
  const cases = reqs.flatMap((r) => testCasesFor(r).map((tc) => [tc.code, r.code, tc.title, `Given ${tc.given}; when ${tc.when}`, tc.then, r.priority]));
  const untested = reqs.filter((r) => !r.acceptance.length).map((r) => `${r.code} ${r.title}`);
  return [
    docControl(p, 'Test Plan & Test Cases', ev, 'test'),
    '## 1. Objective',
    `Verify that **${or(p.meta.name, 'the system')}** meets every functional and non-functional requirement before release.`,
    '',
    '## 2. Test levels',
    table(
      ['Level', 'Purpose', 'Owner'],
      [
        ['Unit', 'Each component works in isolation', 'Developers'],
        ['Integration', `Interfaces with ${p.integrations.map((i) => i.name).join(', ') || 'other systems'} work end to end`, 'Developers / QA'],
        ['System', 'Every functional requirement passes its acceptance criteria', 'QA'],
        ['Non-functional', 'Performance, security, accessibility and availability targets are met', 'QA / Specialists'],
        ['User acceptance (UAT)', 'The client confirms the system supports their business process', 'Client'],
      ]
    ),
    '## 3. Entry and exit criteria',
    '### Entry',
    list(PHASE_BY_ID.test.entry),
    '### Exit',
    list(PHASE_BY_ID.test.exit),
    '## 4. Functional test cases',
    'Derived one-to-one from the acceptance criteria.',
    '',
    table(['Test case', 'Requirement', 'Scenario', 'Steps', 'Expected result', 'Priority'], cases),
    untested.length ? `**Requirements with no test cases yet:**\n\n${list(untested)}` : '**Every requirement has at least one test case.**\n',
    '## 5. Non-functional tests',
    table(['ID', 'Category', 'Test', 'Pass criterion'], p.nfrs.map((n) => [`TC-${n.code}`, n.category, `Measure: ${n.metric}`, n.target])),
    '## 6. Defect severity',
    table(['Severity', 'Definition', 'Release rule'], SEVERITY_DEFINITIONS),
    '## 7. Environments and data',
    list([
      'Test environment mirrors production configuration.',
      ...p.integrations.map((i) => `Test / sandbox access to **${i.name}** (owner: ${or(stakeholderName(p, i.owner), 'to be confirmed')}).`),
      'Test data must not contain real personal information.',
    ]),
  ].join('\n');
}

// ---------- 6. RTM ----------
function rtmRows(p) {
  return active(p).map((r) => {
    const tcs = testCasesFor(r).map((t) => t.code);
    return {
      objective: objectiveCodes(p, r),
      req: r.code,
      title: r.title,
      priority: r.priority,
      story: storyCode(r),
      tests: tcs.join(' '),
      release: releaseName(p, r.releaseId),
      status: r.status,
      covered: tcs.length > 0,
    };
  });
}
function rtm(p, ev) {
  const rows = rtmRows(p);
  const covered = rows.filter((r) => r.covered).length;
  const pct = rows.length ? Math.round((covered / rows.length) * 100) : 0;
  return {
    markdown: [
      docControl(p, 'Requirements Traceability Matrix (RTM)', ev, 'requirements'),
      `**Test coverage:** ${covered} of ${rows.length} requirements (${pct}%) have test cases.`,
      '',
      table(
        ['Objective', 'Requirement', 'Title', 'Priority', 'User story', 'Test cases', 'Release', 'Status'],
        rows.map((r) => [r.objective, r.req, r.title, r.priority, r.story, r.tests, r.release, r.status])
      ),
      '## Objective coverage',
      table(
        ['Objective', 'Title', 'Requirements'],
        p.objectives.map((o) => [o.code, o.title, active(p).filter((r) => r.objectiveIds.includes(o.id)).map((r) => r.code).join(', ')])
      ),
      '## Non-functional requirements',
      table(['NFR', 'Category', 'Test case', 'Target'], p.nfrs.map((n) => [n.code, n.category, `TC-${n.code}`, n.target])),
    ].join('\n'),
    csv: csv(
      ['Objective', 'Requirement ID', 'Title', 'Priority', 'User Story', 'Test Cases', 'Release', 'Status'],
      rows.map((r) => [r.objective, r.req, r.title, r.priority, r.story, r.tests, r.release, r.status])
    ),
  };
}

// ---------- 7. Solution design & data spec ----------
function design(p, ev) {
  const entities = p.entities.map((e) =>
    [
      `### ${e.name}`,
      or(e.description, ''),
      '',
      table(
        ['Field', 'Type', 'Key', 'Required', 'Unique', 'References', 'Validation'],
        e.fields.map((f) => [f.name, f.type, f.pk ? 'PK' : f.fk ? 'FK' : '', f.required ? 'Yes' : 'No', f.unique ? 'Yes' : 'No', f.fk, f.rule])
      ),
    ].join('\n')
  );
  const processes = p.processes.map((pr) =>
    [
      `### ${pr.name}`,
      or(pr.description, ''),
      '',
      table(
        ['Step', 'Type', 'Description', 'Actor', 'Next'],
        pr.steps.map((s, i) => [
          s.code,
          s.type,
          s.label,
          describeActor(p, s.actorId),
          s.type === 'decision' ? `Yes → ${s.yes || '?'}; No → ${s.no || '?'}` : s.type === 'end' ? '(end)' : s.next || pr.steps[i + 1]?.code || '?',
        ])
      ),
    ].join('\n')
  );
  return [
    docControl(p, 'Solution Design & Data Specification', ev, 'design'),
    '## 1. Architecture overview',
    table(
      ['Component', 'Type', 'Technology', 'Connects to'],
      p.components.map((c) => [c.name, c.type, c.tech, c.connectsTo.map((id) => byId(p.components, id)?.name).filter(Boolean).join(', ')])
    ),
    'See the Architecture diagram for the visual view.',
    '',
    '## 2. Data dictionary',
    entities.join('\n') || '_No entities defined._\n',
    '## 3. Relationships',
    table(
      ['From', 'Cardinality', 'To', 'Meaning'],
      p.relationships.map((r) => [byId(p.entities, r.fromId)?.name, r.cardinality, byId(p.entities, r.toId)?.name, r.label])
    ),
    '## 4. Business processes',
    processes.join('\n') || '_No processes mapped._\n',
    '## 5. Interface specifications',
    table(
      ['System', 'Direction', 'Protocol', 'Purpose', 'Data exchanged', 'Authentication', 'Owner'],
      p.integrations.map((i) => [i.name, i.direction, i.protocol, i.purpose, i.dataExchanged, i.auth, stakeholderName(p, i.owner)])
    ),
    '## 6. Non-functional design drivers',
    table(['ID', 'Category', 'Target'], p.nfrs.map((n) => [n.code, n.category, n.target])),
    '## 7. Design decisions',
    table(['ID', 'Date', 'Decision', 'Rationale', 'Owner'], p.decisions.map((d) => [d.code, d.date, d.decision, d.rationale, stakeholderName(p, d.owner) || d.owner])),
  ].join('\n');
}

// ---------- 8. RAID & decision log ----------
function raid(p, ev) {
  return [
    docControl(p, 'RAID & Decision Log', ev, 'initiation'),
    'RAID = Risks, Assumptions, Issues/Dependencies. Reviewed at every status meeting (Monitoring & Controlling).',
    '',
    '## Risk rating',
    'Score = Likelihood (1-5) × Impact (1-5). **High** ≥ 15, **Medium** 8-14, **Low** ≤ 7.',
    '',
    raidTables(p),
    '## Decisions',
    table(['ID', 'Date', 'Decision', 'Rationale', 'Owner'], p.decisions.map((d) => [d.code, d.date, d.decision, d.rationale, stakeholderName(p, d.owner) || d.owner])),
    '## Questions log',
    table(
      ['ID', 'Question', 'Asked of', 'Owner', 'Due', 'Status', 'Answer'],
      p.questions.map((q) => [q.code, q.question, q.askedOf, stakeholderName(p, q.owner), q.due, q.status, q.answer])
    ),
  ].join('\n');
}

// ---------- 9. Phase gate report ----------
function gate(p, ev) {
  const actionsFor = (aud) => ev.issues.filter((i) => i.rule.audience === aud && i.rule.severity !== 'info').map((i) => `${i.message}`);
  const phases = ev.phases.map((ph) =>
    [
      `### ${ph.phase.order}. ${ph.phase.name} — ${ph.approved ? `Approved by ${ph.approvedBy} on ${ph.approvedOn}` : ph.canApprove ? 'Ready for approval' : 'Not ready'}`,
      `Readiness: **${ph.readiness}%** · PLC: ${ph.phase.plc.map((id) => PLC_STAGES.find((s) => s.id === id)?.name).join(', ')}`,
      '',
      table(['Check', 'Severity', 'Result'], ph.rules.map((r) => [r.rule.title, r.rule.severity, r.passed ? 'Pass' : `Fail (${r.issues.length})`])),
      '**Checklist**',
      '',
      ph.checklist.map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`).join('\n'),
      '',
    ].join('\n')
  );
  return [
    docControl(p, 'Phase Gate & Readiness Report', ev, 'initiation'),
    `**Overall readiness: ${ev.score}%** · Current phase: **${ev.current.phase.name}**`,
    '',
    '## Next actions',
    '### Client needs to provide',
    list(actionsFor('client'), '_Nothing outstanding._'),
    '### Delivery team needs to do',
    list(actionsFor('dev'), '_Nothing outstanding._'),
    '### Business analysis to do',
    list(actionsFor('ba'), '_Nothing outstanding._'),
    '## Phase gates',
    phases.join('\n'),
  ].join('\n');
}

// ---------- 10. Deployment & handover ----------
function deploy(p, ev) {
  const checklist = [
    'Go / no-go meeting held and decision recorded',
    'All Must-have requirements passed UAT',
    'No open Critical or High defects',
    ...p.integrations.map((i) => `Production connectivity to **${i.name}** verified (${i.protocol}, ${i.auth || 'auth to be confirmed'})`),
    ...p.nfrs.map((n) => `${n.code} ${n.category}: "${n.target}" verified in production-like environment`),
    ...p.entities.length ? ['Data migration / seed data loaded and reconciled for: ' + p.entities.map((e) => e.name).join(', ')] : [],
    'Monitoring and alerting configured',
    'Rollback plan rehearsed',
    'Support team briefed and contact list published',
  ];
  return [
    docControl(p, 'Deployment & Handover Plan', ev, 'deploy'),
    '## 1. Release scope',
    table(['Release', 'Goal', 'Start', 'End', 'Requirements'], p.releases.map((r) => [r.name, r.goal, r.start, r.end, active(p).filter((q) => q.releaseId === r.id).map((q) => q.code).join(', ')])),
    '## 2. Go-live checklist',
    checklist.map((c) => `- [ ] ${c}`).join('\n'),
    '',
    '## 3. Rollback plan',
    list([
      'Rollback trigger: any Critical defect in production, or a failed smoke test, within the first 2 hours.',
      'Decision maker: ' + or(stakeholderName(p, p.meta.sponsor), 'the sponsor'),
      'Restore the previous application version and database backup taken immediately before deployment.',
      'Notify users and stakeholders using the communication plan.',
    ]),
    '## 4. Training',
    table(['User group', 'What they need to learn'], p.actors.map((a) => [a.name, active(p).filter((r) => r.actorId === a.id).map((r) => r.title).join('; ')])),
    '## 5. Hypercare and support',
    list([
      'Hypercare: 2 weeks of daily check-ins after go-live with the delivery team on standby.',
      'Defects are logged with the severity definitions in the Test Plan.',
      'After hypercare, ownership moves to the support team under agreed SLAs.',
    ]),
    '## 6. Closure',
    list(PHASE_BY_ID.maintain.exit),
    '## Approval',
    approvals(p),
  ].join('\n');
}

// ---------- registry ----------
export const DOC_DEFS = [
  { id: 'charter', title: 'Project Charter', phase: 'initiation', audience: 'Client & sponsor', build: charter },
  { id: 'brd', title: 'Business Requirements (BRD)', phase: 'requirements', audience: 'Client', build: brd },
  { id: 'srs', title: 'Software Requirements (SRS)', phase: 'requirements', audience: 'Client & developers', build: srs },
  { id: 'stories', title: 'User Stories & Acceptance', phase: 'requirements', audience: 'Developers & testers', build: stories },
  { id: 'rtm', title: 'Traceability Matrix (RTM)', phase: 'requirements', audience: 'Everyone', build: rtm },
  { id: 'design', title: 'Solution Design & Data Spec', phase: 'design', audience: 'Developers', build: design },
  { id: 'testplan', title: 'Test Plan & Test Cases', phase: 'test', audience: 'Testers & client', build: testplan },
  { id: 'raid', title: 'RAID & Decision Log', phase: 'initiation', audience: 'Project team', build: raid },
  { id: 'deploy', title: 'Deployment & Handover', phase: 'deploy', audience: 'Operations & client', build: deploy },
  { id: 'gate', title: 'Phase Gate & Readiness Report', phase: 'initiation', audience: 'Sponsor', build: gate },
];

export function generateDocs(p, ev) {
  const code = slug(p.meta.code || 'project').toUpperCase();
  return DOC_DEFS.map((d, i) => {
    const out = d.build(p, ev);
    const markdown = typeof out === 'string' ? out : out.markdown;
    const n = String(i + 1).padStart(2, '0');
    return {
      id: d.id,
      title: d.title,
      phase: d.phase,
      audience: d.audience,
      filename: `${n}_${d.title.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '')}_${code}`,
      markdown,
      csv: typeof out === 'string' ? undefined : out.csv,
    };
  });
}

export function generateDoc(p, ev, id) {
  return generateDocs(p, ev).find((d) => d.id === id);
}
