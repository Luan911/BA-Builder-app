// A deliberately huge, messy project for stress tests: hundreds of items, long names,
// quotes, symbols, unicode, deep links and big diagrams. Used by tests/stress.mjs and tests/browser.html.
import { normalize } from '../js/model.js';

const NASTY = ['Quote "double" and \'single\'', 'Pipes | and #hash; semi', 'Brackets [x] {y} <z>', 'Ünïcödé — émojis 🚀 中文', 'Ampersand & percent 100%', 'Back\\slash / slash', 'Very long name that keeps going and going well past any sensible label length to check wrapping and truncation in every view'];
const pick = (arr, i) => arr[i % arr.length];

export function bigProject(n = 1) {
  const N = (k) => Math.round(k * n);
  const ids = (pre, count) => Array.from({ length: count }, (_, i) => `${pre}${i}`);
  const stakeholders = ids('s', N(40)).map((id, i) => ({ id, name: `${pick(NASTY, i)} ${i}`, role: `Role ${i}`, power: pick(['High', 'Medium', 'Low'], i), interest: pick(['Low', 'High', 'Medium'], i), attitude: pick(['Champion', 'Supporter', 'Neutral', 'Critic', 'Blocker'], i), raci: pick(['R', 'A', 'C', 'I'], i), approver: i % 7 === 0 }));
  const personas = ids('pe', N(25)).map((id, i) => ({ id, name: `${pick(['Applicant', 'Officer', 'Admin', 'Bureau API', 'Auditor'], i)} ${i} ${i % 3 ? '' : pick(NASTY, i)}`.trim(), kind: i % 4 === 3 ? 'System' : 'Human' }));
  const objectives = ids('o', N(15)).map((id, i) => ({ id, code: `OBJ-${String(i + 1).padStart(2, '0')}`, title: `Objective ${i} ${pick(NASTY, i)}`, kind: 'Business', kpi: 'KPI', baseline: `${i}`, target: `< ${i + 5} minutes`, due: `2027-${String((i % 12) + 1).padStart(2, '0')}-15` }));
  const releases = ids('rel', N(8)).map((id, i) => ({ id, name: `Release ${i + 1} ${pick(NASTY, i)}`, goal: 'Goal', start: `2027-${String((i % 12) + 1).padStart(2, '0')}-01`, end: `2027-${String((i % 12) + 1).padStart(2, '0')}-28` }));
  const types = ['Business', 'Stakeholder', 'Functional', 'Non-functional', 'Data', 'Interface', 'Transition'];
  const requirements = ids('r', N(400)).map((id, i) => ({
    id, type: pick(types, i), title: `Requirement ${i} ${pick(NASTY, i)}`, statement: `The system shall handle case ${i} within ${i % 9 + 1} seconds ${pick(NASTY, i + 1)}.`,
    category: pick(['Performance', 'Security', 'Privacy', 'Availability'], i), metric: `${i}%`, priority: pick(['Must', 'Should', 'Could', "Won't"], i), status: pick(['Draft', 'Approved', 'Implemented', 'Rejected'], i),
    source: `s${i % stakeholders.length}`, release: `rel${i % releases.length}`, objectiveIds: [`o${i % objectives.length}`, `o${(i * 7) % objectives.length}`], parentIds: i > 10 ? [`r${i - 10}`] : [],
    acceptance: Array.from({ length: i % 4 }, (_, k) => ({ given: `given ${k} ${pick(NASTY, k)}`, when: 'when', then: 'then' })),
  }));
  const stories = ids('st', N(300)).map((id, i) => ({ id, epic: `Epic ${i % 20} ${pick(NASTY, i % 20)}`, asA: `pe${i % personas.length}`, iWant: `to do thing ${i} ${pick(NASTY, i)}`, soThat: 'value', points: pick(['1', '2', '3', '5', '8', '13', '21'], i), priority: pick(['Must', 'Should', 'Could'], i), status: pick(['Backlog', 'Ready', 'In progress', 'In review', 'Done'], i), release: `rel${i % releases.length}`, requirementIds: [`r${i % requirements.length}`, `r${(i * 3) % requirements.length}`], acceptance: [{ given: 'g', when: 'w', then: 't' }], reach: i * 10, impact: pick([0.25, 0.5, 1, 2, 3], i), confidence: 80, effort: (i % 8) + 1, bv: i % 20 + 1, tc: i % 13 + 1, rr: i % 7 + 1, jobSize: i % 20 + 1 }));
  const tests = ids('t', N(200)).map((id, i) => ({ id, title: `Test ${i} ${pick(NASTY, i)}`, steps: Array.from({ length: 6 }, (_, k) => `step ${k} ${pick(NASTY, k)}`), expected: 'ok', status: pick(['Not run', 'Passed', 'Failed', 'Blocked'], i), requirementIds: [`r${(i * 2) % requirements.length}`] }));
  const entities = ids('e', N(60)).map((id, i) => ({ id, name: `Entity${i}_${pick(['Customer', 'Loan', 'Payment', 'Ünïcode', 'Has Space', '123Start'], i)}`, description: pick(NASTY, i), fields: Array.from({ length: 12 }, (_, k) => ({ name: k === 0 ? 'id' : `field_${k} ${pick(NASTY, k).slice(0, 12)}`, type: pick(['uuid', 'string', 'integer', 'decimal', 'date', 'boolean', 'enum'], k), pk: k === 0, required: k % 2 === 0, unique: k === 1, fk: k === 2 ? `Entity${(i + 1) % 60}` : '', desc: pick(NASTY, k) })) }));
  const relationships = ids('rl', N(90)).map((id, i) => ({ id, from: `e${i % entities.length}`, to: `e${(i * 7 + 1) % entities.length}`, card: pick(['one-to-one', 'one-to-many', 'many-to-many', 'zero-or-one-to-many'], i), label: `rel ${pick(NASTY, i).slice(0, 15)}` }));
  const processes = ids('pr', N(6)).map((id, i) => {
    const L = N(60);
    const steps = Array.from({ length: L }, (_, k) => {
      const kind = k === 0 ? 'start' : k === L - 1 ? 'end' : k % 9 === 4 ? 'decision' : 'task';
      const st = { id: `S${k}`, kind, label: `Step ${k} ${pick(NASTY, k)}`, lane: `Lane ${k % 6} ${pick(NASTY, k).slice(0, 10)}`, pain: k % 11 === 0 ? 'Pain point' : '' };
      if (kind === 'decision') Object.assign(st, { yes: `S${k + 1}`, no: `S${Math.min(L - 1, k + 3)}` });
      else if (kind !== 'end') st.next = `S${k + 1}`;
      return st;
    });
    return { id, code: `PR-${i}`, name: `Process ${i} ${pick(NASTY, i)}`, state: i % 2 ? 'To-be' : 'As-is', steps };
  });
  const usecases = ids('uc', N(40)).map((id, i) => ({ id, name: `Use case ${i} ${pick(NASTY, i)}`, primary: `pe${i % personas.length}`, secondary: [`pe${(i + 3) % personas.length}`], level: 'User goal', main: Array.from({ length: 15 }, (_, k) => (k % 2 ? `System ${pick(NASTY, k)} ${k}` : `User does ${k}`)), alt: Array.from({ length: 5 }, (_, k) => `${k + 2}a. Alternative ${pick(NASTY, k)}`), requirementIds: [`r${i}`] }));
  const stName = (k) => `S${k} ${pick(NASTY, k).slice(0, 8)}`;
  const states = ids('sm', N(5)).map((id, i) => ({ id, name: `State machine ${i} ${pick(NASTY, i)}`, entity: `e${i}`, initial: stName(0), finals: [stName(25)], transitions: Array.from({ length: 30 }, (_, k) => ({ from: stName(k % 25), to: stName(k < 25 ? k + 1 : (k * 3) % 25), event: `event ${k} ${pick(NASTY, k).slice(0, 10)}`, guard: k % 3 ? '' : 'score >= 650 and ok' })) }));
  const decisionTables = ids('dt', N(5)).map((id, i) => ({ id, name: `Decision ${i} ${pick(NASTY, i)}`, conditions: ['Score', 'Income', 'Age', 'Region'], actions: ['Approve', 'Refer'], rows: Array.from({ length: 16 }, (_, k) => ({ when: [k & 1 ? 'Y' : 'N', k & 2 ? 'Y' : 'N', k & 4 ? 'Y' : 'N', k & 8 ? 'Y' : 'N'].join(', '), then: k % 3 ? 'X, -' : '-, X' })) }));
  const apis = ids('api', N(80)).map((id, i) => ({ id, method: pick(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], i), path: `/v1/resource${i % 20}/{id}/sub${i}`, summary: `Endpoint ${i} ${pick(NASTY, i)}`, tag: `Tag ${i % 6}`, auth: 'OAuth2 / JWT bearer', params: [{ name: 'id', in: 'path', type: 'string', required: true, desc: pick(NASTY, i) }, { name: 'q', in: 'query', type: 'integer', required: false, desc: '' }], request: `Entity${i % 60}`, response: `Entity${(i + 1) % 60}`, codes: [{ code: '200', desc: 'OK' }, { code: '404', desc: pick(NASTY, i) }], requirementIds: [`r${i}`] }));
  const integrations = ids('in', N(30)).map((id, i) => ({ id, system: `System ${i} ${pick(NASTY, i)}`, direction: pick(['Inbound', 'Outbound', 'Two-way'], i), protocol: 'REST', data: 'stuff', frequency: 'Real time' }));
  const raid = ids('ra', N(120)).map((id, i) => ({ id, type: pick(['Risk', 'Assumption', 'Issue', 'Dependency'], i), description: `RAID ${i} ${pick(NASTY, i)}`, likelihood: (i % 5) + 1, impact: ((i * 3) % 5) + 1, owner: `s${i % stakeholders.length}`, status: pick(['Open', 'Closed'], i), response: i % 3 ? 'Mitigate' : '' }));
  const financials = ids('fi', N(60)).map((id, i) => ({ id, kind: i % 3 ? 'Benefit' : 'Cost', year: i % 6, item: `Item ${i} ${pick(NASTY, i)}`, amount: (i % 10 + 1) * 125000.55 }));
  const rates = ids('rt', 6).map((id, i) => ({ id, role: `Role ${i} ${pick(NASTY, i)}`, dayRate: 5000 + i * 1500, fte: (i % 4) + 0.5 }));
  const workItems = ids('wi', N(250)).map((id, i) => ({ id, item: `Work ${i} ${pick(NASTY, i)}`, phase: pick(['Analysis', 'Design', 'Build', 'Build', 'Build', 'Test', 'Deploy', 'Project management'], i), role: `rt${i % rates.length}`, optimistic: (i % 5) + 1, likely: (i % 5) + 3, pessimistic: (i % 5) + 9, requirementIds: [`r${i % requirements.length}`] }));
  return normalize({
    id: 'prj_big', meta: { name: `Stress test ${pick(NASTY, 3)}`, code: 'BIG', summary: NASTY.join(' '), version: '9.9' },
    charter: { problem: NASTY.join('\n'), vision: 'Vision', scopeIn: NASTY, scopeOut: NASTY.map((x) => `Not ${x}`), successCriteria: NASTY, constraints: NASTY, deadline: '2027-06-30', budget: 'R 50m' },
    businessCase: { discountRate: 9.5, years: 5, currency: 'R', options: NASTY.join('\n'), recommendation: 'Go' },
    estimate: { startDate: '2027-01-04', contingency: 20, hoursPerDay: 8, workDays: [1, 2, 3, 4, 5], holidays: '2027-01-01 2027-03-22 2027-04-02 2027-04-05 2027-04-27', velocity: 45, sprintWeeks: 2 },
    stakeholders, personas, objectives, releases, requirements, stories, tests, entities, relationships, processes, usecases, states, decisionTables, apis, integrations, raid, financials, rates, workItems,
    screens: ids('scr', N(20)).map((id, i) => ({ id, name: `Screen ${i} ${pick(NASTY, i)}`, persona: `pe${i % personas.length}`, apiIds: [`api${i % apis.length}`], usecaseIds: [`uc${i % usecases.length}`], fields: [...Array.from({ length: 10 }, (_, k) => ({ label: `Field ${k} ${pick(NASTY, k)}`, control: pick(['Text', 'Number', 'Date', 'Dropdown', 'Email'], k), required: k % 2 === 0, validation: pick(NASTY, k), mapsTo: k % 4 === 3 ? '' : `${entities[(i + k) % entities.length].name}.${entities[(i + k) % entities.length].fields[(k % 11) + 1].name}` })), { label: 'Save', control: 'Button' }] })),
    components: ids('cmp', N(30)).map((id, i, all) => ({ id, name: `Component ${i} ${pick(NASTY, i)}`, layer: pick(['Presentation (UI)', 'Business logic / services', 'Integration / middleware', 'Data', 'External system'], i), state: pick(['Existing and kept', 'To-be (new)', 'As-is (to retire)'], i), technology: pick(NASTY, i + 2), connections: [1, 3].map((d) => ({ to: all[(i + d) % all.length], method: pick(['REST API', 'Event / message', 'Manual (spreadsheet / re-keying)', 'File transfer'], i + d), frequency: 'Daily', data: pick(NASTY, d), state: pick(['Both', 'As-is only', 'To-be only'], i + d) })) })),
    defects: ids('def', N(50)).map((id, i) => ({ id, title: `Defect ${i} ${pick(NASTY, i)}`, testId: `t${i % tests.length}`, environment: pick(['SIT', 'UAT'], i), severity: pick(['Critical', 'High', 'Medium', 'Low'], i), priority: 'P2 — this release', status: pick(['New', 'Open', 'Closed'], i), steps: NASTY.slice(0, 3), expected: pick(NASTY, i), actual: pick(NASTY, i + 1), requirementIds: [`r${i}`] })),
    queries: ids('q', N(10)).map((id, i) => ({ id, name: `Query ${i} ${pick(NASTY, i)}`, sql: `SELECT * FROM "${entities[i % entities.length].name}" -- ${pick(NASTY, i)}`, requirementIds: [`r${i}`] })),
    swot: ids('sw', N(40)).map((id, i) => ({ id, category: pick(['Strength', 'Weakness', 'Opportunity', 'Threat'], i), text: pick(NASTY, i) })),
    pestle: ids('pl', N(30)).map((id, i) => ({ id, factor: pick(['Political', 'Economic', 'Social', 'Technological', 'Legal', 'Environmental'], i), text: pick(NASTY, i) })),
    gaps: ids('g', N(30)).map((id, i) => ({ id, area: pick(NASTY, i), asIs: 'as-is', toBe: 'to-be', requirementIds: [`r${i}`], gap: 'gap', action: 'act' })),
    glossary: ids('gl', N(150)).map((id, i) => ({ id, term: `Term ${i} ${pick(NASTY, i)}`, definition: pick(NASTY, i + 1) })),
    rules: ids('ru', N(80)).map((id, i) => ({ id, name: `Rule ${i} ${pick(NASTY, i)}`, statement: pick(NASTY, i) })),
    questions: ids('q', N(60)).map((id, i) => ({ id, question: `Q ${i} ${pick(NASTY, i)}?`, status: i % 2 ? 'Open' : 'Answered', due: '2020-01-01' })),
    changes: ids('cr', N(30)).map((id, i) => ({ id, title: `Change ${i} ${pick(NASTY, i)}`, status: 'Under review', schedule: i, cost: i * 1000, requirementIds: [`r${i}`] })),
    decisions: ids('de', N(30)).map((id, i) => ({ id, decision: pick(NASTY, i), options: NASTY.slice(0, 3), by: `s${i % 10}` })),
    elicitation: ids('el', N(30)).map((id, i) => ({ id, title: `Session ${i} ${pick(NASTY, i)}`, technique: 'Workshop', date: '2026-10-01', participants: [`s${i % 10}`], agenda: NASTY.slice(0, 3), outcomes: NASTY.slice(2, 5), actions: [{ action: pick(NASTY, i), owner: `s${i % 10}`, due: '2026-12-01', done: i % 2 === 0 }] })),
  });
}
