// Unit tests for the maths, dates and quality rules. Run: node tests/unit.mjs
import { blankProject, normalize, businessCase, irr, riskScore, riskLevel, rice, wsjf, nextCode, today, isoDate, lintRequirement, pertDays, COLLECTIONS, ensureCode } from '../js/model.js';
import { pert, addWorkingDays, workingDaysBetween, daysBetween, isDate, estimate, Z } from '../js/estimate.js';
import { NFR_TEMPLATES } from '../js/templates.js';
import { sampleProject } from '../js/sample.js';
import { mdToHtml } from '../js/markdown.js';
import { csv, openApi, sqlDdl } from '../js/gen/exports.js';

let pass = 0, fail = 0;
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
function t(name, cond, detail = '') {
  if (cond) pass++;
  else { fail++; console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}
const eq = (name, got, want) => t(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const close = (name, got, want, tol = 1e-6) => t(name, near(got, want, tol), `got ${got}, want ${want}`);

// ---------- dates ----------
eq('isDate valid', isDate('2027-01-11'), true);
eq('isDate rejects 30 Feb', isDate('2027-02-30'), false);
eq('isDate accepts leap day', isDate('2028-02-29'), true);
eq('isDate rejects non-leap 29 Feb', isDate('2027-02-29'), false);
eq('isDate rejects text', isDate('next week'), false);
eq('isDate rejects empty', isDate(''), false);
eq('today is local YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(today()), true);
eq('isoDate uses local date, not UTC', isoDate(new Date(2027, 0, 1, 0, 30)), '2027-01-01');
eq('isoDate late evening', isoDate(new Date(2027, 11, 31, 23, 59)), '2027-12-31');

// 2027-01-11 is a Monday
eq('1 working day = start day', addWorkingDays('2027-01-11', 1), '2027-01-11');
eq('5 working days Mon→Fri', addWorkingDays('2027-01-11', 5), '2027-01-15');
eq('6 working days skips weekend', addWorkingDays('2027-01-11', 6), '2027-01-18');
eq('0 days = start', addWorkingDays('2027-01-11', 0), '2027-01-11');
eq('fraction rounds up', addWorkingDays('2027-01-11', 2.1), '2027-01-13');
eq('start on Saturday', addWorkingDays('2027-01-16', 1), '2027-01-18');
eq('holiday skipped', addWorkingDays('2027-03-19', 2, ['2027-03-22']), '2027-03-23');
eq('month end', addWorkingDays('2027-01-29', 2), '2027-02-01');
eq('year end', addWorkingDays('2027-12-30', 3), '2028-01-03');
eq('leap year February', addWorkingDays('2028-02-28', 2), '2028-02-29');
eq('six-day week', addWorkingDays('2027-01-15', 2, [], [1, 2, 3, 4, 5, 6]), '2027-01-16');
eq('no working days → empty', addWorkingDays('2027-01-11', 3, [], []), '');
eq('invalid start → empty', addWorkingDays('2027-13-01', 3), '');
eq('negative days = start', addWorkingDays('2027-01-11', -4), '2027-01-11');
eq('working days in a week', workingDaysBetween('2027-01-11', '2027-01-17'), 5);
eq('working days with holiday', workingDaysBetween('2027-03-22', '2027-03-26', ['2027-03-22', '2027-03-26']), 3);
eq('working days reversed = 0', workingDaysBetween('2027-02-01', '2027-01-01'), 0);
eq('working days 2027 total', workingDaysBetween('2027-01-01', '2027-12-31'), 261);
eq('calendar days', daysBetween('2027-01-01', '2027-12-31'), 364);
eq('calendar days leap year', daysBetween('2028-01-01', '2028-12-31'), 365);
eq('calendar days across DST changes (any timezone)', daysBetween('2027-03-01', '2027-11-30'), 274);
// round trip: addWorkingDays and workingDaysBetween agree
for (const n of [1, 7, 20, 63, 250]) eq(`round trip ${n} days`, workingDaysBetween('2027-01-11', addWorkingDays('2027-01-11', n)), n);

// ---------- PERT and estimate ----------
close('pert expected', pert(2, 4, 12).expected, 5);
close('pert sd', pert(2, 4, 12).sd, 10 / 6);
close('pert one value', pert('', 5, '').expected, 5);
close('pert one value sd', pert('', 5, '').sd, 0);
close('pert all zero', pert(0, 0, 0).expected, 0);
close('pert swapped bounds still sane', pert(12, 4, 2).expected, 5);
close('pertDays matches pert', pertDays({ optimistic: 2, likely: 4, pessimistic: 12 }), 5);
close('z 80%', Z[80], 0.8416, 1e-4);

{
  const p = blankProject('Est');
  p.estimate = { startDate: '2027-01-11', contingency: 10, hoursPerDay: 8, workDays: [1, 2, 3, 4, 5], holidays: '2027-01-18', velocity: 20, sprintWeeks: 2 };
  p.charter.deadline = '2027-01-20';
  p.rates = [{ id: 'dev', role: 'Developer', dayRate: 1000, fte: 2 }, { id: 'ba', role: 'BA', dayRate: 800, fte: 1 }];
  p.workItems = [
    { code: 'WI-001', item: 'Analyse', phase: 'Analysis', role: 'ba', optimistic: 2, likely: 3, pessimistic: 4 },
    { code: 'WI-002', item: 'Build A', phase: 'Build', role: 'dev', optimistic: 4, likely: 6, pessimistic: 14 },
    { code: 'WI-003', item: 'Build B', phase: 'Build', role: 'dev', likely: 4 },
  ];
  p.stories = [{ points: 13, status: 'Backlog' }, { points: 21, status: 'Ready' }, { points: 8, status: 'Done' }];
  const e = estimate(p);
  close('effort sum', e.effort, 3 + 7 + 4);
  close('labour cost', e.labour, 3 * 800 + 11 * 1000);
  close('total incl contingency', e.total, (2400 + 11000) * 1.1);
  close('effort sd (variances add)', e.effortSd, Math.sqrt((2 / 6) ** 2 + (10 / 6) ** 2));
  t('confidence grows', e.confidence[50].effort < e.confidence[80].effort && e.confidence[80].effort < e.confidence[95].effort);
  close('50% = expected', e.confidence[50].effort, e.effort);
  eq('phase days: analysis 3 / build ceil(11/2)=6', e.phases.map((x) => x.days), [3, 6]);
  eq('analysis dates', [e.phases[0].start, e.phases[0].end], ['2027-01-11', '2027-01-13']);
  eq('build starts next working day', e.phases[1].start, '2027-01-14');
  eq('build skips weekend and holiday', e.phases[1].end, '2027-01-22'); // 14,15,19,20,21,22
  eq('end date', e.endDate, '2027-01-22');
  eq('late flag vs deadline', e.late, true);
  t('late warning present', e.warnings.some((w) => w.includes('after the target date')));
  eq('open points ignore Done', e.openPoints, 34);
  eq('sprints = ceil(34/20)', e.sprints, 2);
  eq('agile end = start + 4 weeks - 1 day', e.agileEnd, '2027-02-07');
  close('hours', e.hours, 14 * 8);
  const none = estimate(blankProject('x'));
  eq('empty estimate', [none.effort, none.total, none.endDate, none.warnings.length], [0, 0, '', 0]);
  p.workItems.push({ code: 'WI-004', item: 'No role', phase: 'Test', likely: 1 });
  t('warns when no role', estimate(p).warnings.some((w) => w.includes('no role')));
  const noStart = { ...p, estimate: { ...p.estimate, startDate: '' } };
  t('warns when no start date', estimate(noStart).warnings.some((w) => w.includes('start date')));
}

// validation rules on the forms
eq('release end before start rejected', !!COLLECTIONS.releases.validate({ start: '2027-02-01', end: '2027-01-01' }), true);
eq('release same day ok', COLLECTIONS.releases.validate({ start: '2027-02-01', end: '2027-02-01' }), '');
eq('estimate O > M rejected', !!COLLECTIONS.workItems.validate({ optimistic: 5, likely: 3 }), true);
eq('estimate P < M rejected', !!COLLECTIONS.workItems.validate({ likely: 5, pessimistic: 3 }), true);
eq('estimate negative rejected', !!COLLECTIONS.workItems.validate({ likely: -1 }), true);
eq('estimate valid', COLLECTIONS.workItems.validate({ optimistic: 1, likely: 2, pessimistic: 5 }), '');
eq('rate negative rejected', !!COLLECTIONS.rates.validate({ dayRate: -5 }), true);
eq('rate zero people rejected', !!COLLECTIONS.rates.validate({ dayRate: 5, fte: 0 }), true);

// ---------- business case ----------
{
  const p = blankProject('BC');
  p.businessCase = { discountRate: 10, years: 3, currency: 'R' };
  p.financials = [
    { kind: 'Cost', year: 0, amount: 1000 },
    { kind: 'Benefit', year: 1, amount: 500 },
    { kind: 'Benefit', year: 2, amount: 500 },
    { kind: 'Benefit', year: 3, amount: 500 },
  ];
  const bc = businessCase(p);
  close('NPV hand calc', bc.npv, -1000 + 500 / 1.1 + 500 / 1.21 + 500 / 1.331);
  close('ROI', bc.roi, 50);
  eq('payback year', bc.payback, 2);
  close('payback exact (2.0 years)', bc.paybackExact, 2);
  close('discounted payback', bc.discountedPayback, 2 + (1000 - 500 / 1.1 - 500 / 1.21) / (500 / 1.331));
  close('IRR', bc.irr, 0.233752, 1e-5);
  eq('rows = years + 1', bc.rows.length, 4);
  close('cumulative', bc.rows[3].cum, 500);
  p.financials.push({ kind: 'Benefit', year: 7, amount: 999 }, { kind: 'Cost', year: 1.5, amount: 5 });
  eq('items outside horizon reported', businessCase(p).outside.length, 2);
  close('outside items ignored', businessCase(p).totalBen, 1500);
  p.financials = [{ kind: 'Cost', year: 0, amount: 1000 }, { kind: 'Benefit', year: 1, amount: 600 }, { kind: 'Benefit', year: 2, amount: 600 }];
  close('payback interpolated 1.67', businessCase(p).paybackExact, 1 + 400 / 600);
  p.businessCase.discountRate = 0;
  close('0% rate NPV = net', businessCase(p).npv, 200);
  p.businessCase.discountRate = '';
  close('blank rate treated as 0', businessCase(p).npv, 200);
  p.businessCase.years = 'abc';
  eq('bad horizon falls back to 5', businessCase(p).years, 5);
  p.businessCase.years = 50;
  eq('horizon capped at 10', businessCase(p).years, 10);
  p.financials = [{ kind: 'Cost', year: 0, amount: 1000 }];
  const lose = businessCase(p);
  eq('no payback when never positive', [lose.payback, lose.paybackExact, lose.irr], [null, null, null]);
  close('ROI -100%', lose.roi, -100);
  p.financials = [];
  const empty = businessCase(p);
  eq('empty case', [empty.npv, empty.roi, empty.payback], [0, 0, null]);
}
close('IRR simple 10%', irr([-100, 110]), 0.1, 1e-7);
close('IRR zero', irr([-100, 50, 50]), 0, 1e-7);
close('IRR negative (exact: 2/(sqrt(11)-1) - 1)', irr([-100, 40, 40]), 2 / (Math.sqrt(11) - 1) - 1, 1e-7);
eq('IRR none when all positive', irr([100, 100]), null);
eq('IRR none when all negative', irr([-100, -1]), null);

// ---------- scoring ----------
eq('risk score', riskScore({ likelihood: 4, impact: 5 }), 20);
eq('risk score blanks', riskScore({}), 0);
eq('risk level 15 High', riskLevel({ likelihood: 3, impact: 5 }), 'High');
eq('risk level 14 Medium', riskLevel({ likelihood: 2, impact: 7 }), 'Medium');
eq('risk level 8 Medium', riskLevel({ likelihood: 2, impact: 4 }), 'Medium');
eq('risk level 7 Low', riskLevel({ likelihood: 1, impact: 7 }), 'Low');
close('RICE', rice({ reach: 1000, impact: 2, confidence: 80, effort: 4 }), 400);
close('RICE rounding', rice({ reach: 10, impact: 1, confidence: 100, effort: 3 }), 3.3);
eq('RICE zero effort = 0', rice({ reach: 10, impact: 1, confidence: 100, effort: 0 }), 0);
close('WSJF', wsjf({ bv: 8, tc: 5, rr: 3, jobSize: 4 }), 4);
close('WSJF rounding', wsjf({ bv: 10, tc: 0, rr: 0, jobSize: 3 }), 3.3);
eq('WSJF zero size = 0', wsjf({ bv: 8, jobSize: 0 }), 0);

// ---------- IDs ----------
eq('nextCode first', nextCode([], 'FR'), 'FR-001');
eq('nextCode after gap', nextCode([{ code: 'FR-001' }, { code: 'FR-007' }], 'FR'), 'FR-008');
eq('nextCode ignores other prefixes', nextCode([{ code: 'NFR-009' }], 'FR'), 'FR-001');
eq('nextCode pad 2', nextCode([{ code: 'UC-09' }], 'UC', 2), 'UC-10');
eq('nextCode past 999', nextCode([{ code: 'FR-999' }], 'FR'), 'FR-1000');
{
  const list = [{ id: 'a', type: 'Non-functional', code: 'NFR-001' }];
  const it = { id: 'b', type: 'Non-functional' };
  ensureCode('requirements', it, list);
  eq('ensureCode uses type prefix', it.code, 'NFR-002');
}

// ---------- requirement quality ----------
{
  const p = blankProject('Q');
  p.objectives = [{ id: 'o1', code: 'OBJ-01', title: 'x', target: '< 10 min' }];
  const good = { type: 'Non-functional', statement: 'The system shall respond within 2 seconds.', acceptance: [{}], source: 's1', objectiveIds: ['o1'] };
  eq('good NFR passes', lintRequirement(good, p), []);
  t('flags "acceptable"', lintRequirement({ ...good, statement: 'The system shall return results within an acceptable time limit of 2 s.' }, p).some((x) => x.includes('acceptable')));
  t('flags "rapid"', lintRequirement({ ...good, statement: 'The system shall rapidly return 2 results.' }, p).some((x) => x.includes('rapidly')));
  t('flags missing number', lintRequirement({ ...good, statement: 'The system shall be secure.' }, p).some((x) => x.includes('measurable')));
  t('metric number counts', !lintRequirement({ ...good, statement: 'The system shall be available.', metric: '99.9%' }, p).some((x) => x.includes('measurable')));
  t('flags missing shall', lintRequirement({ ...good, statement: 'Respond in 2 seconds.' }, p).some((x) => x.includes('shall')));
  t('flags 3x and', lintRequirement({ ...good, statement: 'The system shall add and edit and delete and export 2 items.' }, p).some((x) => x.includes('split')));
  t('two "and" is fine', !lintRequirement({ ...good, statement: 'The system shall add and edit and delete 2 items.' }, p).some((x) => x.includes('split')));
  t('flags no objective', lintRequirement({ ...good, objectiveIds: [] }, p).some((x) => x.includes('objective')));
  t('no objective check when project has none', !lintRequirement({ ...good, objectiveIds: [] }, blankProject()).some((x) => x.includes('objective')));
  t('flags no acceptance', lintRequirement({ ...good, acceptance: [] }, p).some((x) => x.includes('acceptance')));
  t('flags no source', lintRequirement({ ...good, source: '' }, p).some((x) => x.includes('source')));
  t('"handbook" is not "and"', !lintRequirement({ ...good, statement: 'The system shall show the handbook, brand and band in 2 s.' }, p).some((x) => x.includes('split')));
  t('"fastidious" not flagged as fast', !lintRequirement({ ...good, statement: 'The system shall log 2 fastidious records.' }, p).some((x) => x.includes('Ambiguous')));
  // every built-in NFR template must pass the checks once traced and sourced
  for (const [cat, , statement, metric] of NFR_TEMPLATES) {
    const issues = lintRequirement({ type: 'Non-functional', category: cat, statement, metric, acceptance: [{}], source: 's1', objectiveIds: ['o1'] }, p);
    eq(`template ${cat} is clean`, issues, []);
  }
}
{
  const s = sampleProject();
  const bad = s.requirements.filter((r) => lintRequirement(r, s).length).map((r) => r.code);
  t('sample has some deliberate warnings to demo the checker', bad.length > 0);
}

// ---------- robustness ----------
{
  const p = normalize({ meta: null, requirements: 'oops', stories: [{}], estimate: 5 });
  t('normalize repairs bad collections', Array.isArray(p.requirements) && p.stories[0].id);
  t('normalize keeps estimate defaults', p.estimate.sprintWeeks === 2);
  const e = estimate(normalize({ workItems: [{ likely: 'abc' }, { likely: '3', optimistic: '', pessimistic: null }] }));
  t('estimate survives text numbers', Number.isFinite(e.effort) && near(e.effort, 3));
  t('normalize of nothing', normalize(undefined).meta.version === '0.1');
}
eq('csv quoting', csv(['h'], [['a', 'b,c', 'say "hi"', 'line\nbreak']]), 'h\r\na,"b,c","say ""hi""","line\nbreak"\r\n');
t('markdown table', mdToHtml('| a | b |\n| --- | --- |\n| 1 | 2 |').includes('<table'));
t('markdown escapes html', !mdToHtml('<script>alert(1)</script>').includes('<script>'));
t('markdown mermaid block', mdToHtml('```mermaid\ngraph TD\nA-->B\n```').includes('class="mmd"'));
{
  const s = sampleProject();
  t('openapi has paths', openApi(s).includes('paths:'));
  t('sql has create table', /CREATE TABLE/i.test(sqlDdl(s)));
}

// ---------- splitting big diagrams and the focus view ----------
{
  const { traceParts, modelAreas, modelDocDiagrams, traceDocDiagrams, focusGraph, linkGraph, LIMITS, erd, classDiagram } = await import('../js/gen/diagrams.js');
  const { bigProject } = await import('./big-project.js');
  const big = bigProject(1);
  const parts = traceParts(big);
  const live = big.requirements.filter((r) => r.status !== 'Rejected');
  // every live requirement appears in at least one part, and no part is too big
  const shown = new Set(parts.flatMap((x) => [...x.code.matchAll(/R_(\w+)\[/g)].map((m) => m[1])));
  t('trace parts cover every requirement', live.every((r) => shown.has(r.id.replace(/[^A-Za-z0-9]/g, '_'))), `${shown.size} of ${live.length}`);
  t('trace parts are small', parts.every((x) => (x.code.match(/:::req/g) || []).length <= LIMITS.partReqs));
  const areas = modelAreas(big);
  eq('areas cover every entity once', areas.flatMap((a) => a.list).length, big.entities.length);
  t('areas are small', areas.every((a) => a.list.length <= LIMITS.partEntities));
  eq('every entity is in exactly one area', new Set(areas.flatMap((a) => a.list.map((e) => e.id))).size, big.entities.length);
  const docErd = modelDocDiagrams(big, 'erd');
  const ident = (n) => n.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1');
  t('document ERD splits into page-sized parts', docErd.length > 1 && docErd.every((d) => (d.code.match(/^\s{2}\w+ \{$/gm) || []).length <= LIMITS.docEntities * 3));
  t('document ERD draws every entity with its keys', big.entities.every((e) => docErd.some((d) => new RegExp(`^  ${ident(e.name)} \\{\\n(?!    string other_area)`, 'm').test(d.code))));
  const docTrace = traceDocDiagrams(big);
  t('document trace parts are page-sized', docTrace.every((d) => (d.code.match(/:::(req|pass|fail)/g) || []).length <= LIMITS.docReqs));
  t('document trace draws every requirement', live.every((r) => docTrace.some((d) => d.code.includes(`R_${r.id.replace(/[^A-Za-z0-9]/g, '_')}[`))));
  const s = sampleProject();
  eq('sample ERD stays one diagram', modelDocDiagrams(s, 'erd').length, 1);
  eq('sample trace stays one diagram', traceDocDiagrams(s).length, 1);
  // explicit areas win over automatic grouping
  const s2 = sampleProject();
  s2.entities.forEach((e, i) => (e.area = i % 2 ? 'Lending' : 'Customer'));
  eq('area field groups entities', modelAreas(s2).map((a) => a.name).sort(), ['Customer', 'Lending']);
  const lending = modelAreas(s2).find((a) => a.name === 'Lending').list;
  t('screen ERD by area shows linked entities from other areas as stubs', /other_area/.test(erd(s2, lending)));
  t('screen class diagram by area marks stubs with a valid annotation', /<<Customer>>/.test(classDiagram(s2, lending)));
  const bigDoc = modelDocDiagrams(big, 'erd');
  t('document parts list cross-part links in words instead of drawing stubs', bigDoc.some((d) => /Links to other parts: .+→/.test(d.note)) && bigDoc.every((d) => !/other_area/.test(d.code)));
  // focus view
  const r = s.requirements.find((x) => x.code === 'FR-001');
  const f1 = focusGraph(s, 'requirements', r.id, 1);
  t('focus marks the chosen item', /:::focus/.test(f1));
  t('focus depth 1 includes its objective', s.objectives.filter((o) => (r.objectiveIds || []).includes(o.id)).every((o) => f1.includes(`O_${o.id}[`)));
  t('focus depth 2 is a superset of depth 1', (focusGraph(s, 'requirements', r.id, 2).match(/\[/g) || []).length >= (f1.match(/\[/g) || []).length);
  t('focus is capped on huge projects', (focusGraph(big, 'objectives', big.objectives[0].id, 4).match(/:::(?!note)\w+/g) || []).length <= LIMITS.focusNodes + 1);
  t('focus handles a missing item', /Pick an item/.test(focusGraph(s, 'requirements', 'nope', 2)));
  t('link graph has no dangling ends', linkGraph(big).every(([ka, a, kb, b]) => big[ka].some((x) => x.id === a) && big[kb].some((x) => x.id === b)));
}

// ---------- normalisation to 3NF ----------
{
  const N = await import('../js/gen/normalise.js');
  eq('words camelCase', N.words('customerEmailAddress'), ['customer', 'email', 'address']);
  eq('words snake_case', N.words('customer_email'), ['customer', 'email']);
  eq('words acronym', N.words('APIKey'), ['api', 'key']);
  eq('singular', ['tags', 'categories', 'addresses', 'status'].map(N.singular), ['tag', 'category', 'address', 'status']);
  const s = sampleProject();
  t('sample model is already 3NF (no false alarms)', N.analyseModel(s).every((m) => m.nf === 3 && !m.issues.length), JSON.stringify(N.analyseModel(s).map((m) => m.issues.map((i) => i.title))));

  const p = sampleProject();
  p.entities.push({ id: 'pr', ...N.practiceEntity() });
  const before = N.analyseEntity(p, p.entities.at(-1));
  eq('practice table starts below 1NF', N.normalForm(before), 0);
  eq('practice issues found', before.map((i) => i.id), ['nokey', 'repeat:product', 'multi:tags', 'transitive:customerId', 'group:branch', 'derived:orderTotal']);
  t('own number (orderNo on OrderForm) is not flagged', !before.some((i) => i.fields.includes('orderDate')));
  const log = N.applyAll(p, ['pr']);
  t('apply all made changes', log.length === 5, log.join(' / '));
  const by = (n) => p.entities.find((e) => e.name === n);
  const of = (n) => by(n)?.fields.map((f) => f.name);
  t('key added', by('OrderForm').fields.some((f) => f.pk && f.name === 'id'));
  eq('repeating group becomes child rows', of('OrderFormProduct'), ['id', 'orderFormId', 'product', 'position']);
  eq('list field becomes child rows', of('OrderFormTag'), ['id', 'orderFormId', 'tag']);
  eq('new lookup entity with renamed attributes', of('Branch'), ['id', 'name', 'city']);
  eq('existing Customer reused (name ↔ fullName, email) — nothing duplicated', of('Customer'), ['id', 'idNumber', 'fullName', 'email', 'dateOfBirth']);
  eq('source keeps foreign keys', by('OrderForm').fields.filter((f) => f.fk).map((f) => `${f.name}->${f.fk}`), ['customerId->Customer', 'branchId->Branch']);
  t('child tables point back to the source', by('OrderFormProduct').fields.find((f) => f.name === 'orderFormId').fk === 'OrderForm');
  t('relationships added', ['OrderFormProduct', 'OrderFormTag', 'Branch', 'Customer'].every((n) => p.relationships.some((r) => [r.from, r.to].includes(by(n).id) && [r.from, r.to].includes('pr'))));
  eq('only the derived total is left for the analyst', N.analyseEntity(p, by('OrderForm')).map((i) => i.id), ['derived:orderTotal']);
  t('every entity created is in 3NF', ['OrderFormProduct', 'OrderFormTag', 'Branch'].every((n) => N.normalForm(N.analyseEntity(p, by(n))) === 3));
  eq('apply all is idempotent', N.applyAll(p, ['pr']), []);
  N.applyFix(p, 'pr', N.analyseEntity(p, by('OrderForm'))[0].fix);
  eq('removing the derived value reaches 3NF', N.normalForm(N.analyseEntity(p, by('OrderForm'))), 3);
  // dismissing a check
  const d = sampleProject();
  d.entities.push({ id: 'x', ...N.practiceEntity() });
  d.entities.at(-1).normIgnore = ['group:branch'];
  t('dismissed checks are hidden', !N.analyseEntity(d, d.entities.at(-1)).some((i) => i.id === 'group:branch'));
  // 2NF: composite key
  const q = sampleProject();
  q.entities.push({ id: 'ol', name: 'OrderLine', fields: [{ name: 'orderId', type: 'uuid', pk: true }, { name: 'productId', type: 'uuid', pk: true }, { name: 'quantity', type: 'int' }, { name: 'productName', type: 'string' }, { name: 'productPrice', type: 'decimal' }] });
  eq('partial dependency found', N.analyseEntity(q, q.entities.at(-1)).map((i) => `${i.form} ${i.id}`), ['2NF partial:productId']);
  N.applyAll(q, ['ol']);
  eq('2NF fix: Product holds its own details', q.entities.find((e) => e.name === 'Product').fields.map((f) => `${f.name}${f.pk ? '*' : ''}`), ['productId*', 'name', 'price']);
  eq('2NF fix: OrderLine keeps the whole key and quantity', q.entities.find((e) => e.name === 'OrderLine').fields.map((f) => `${f.name}${f.pk ? '*' : ''}${f.fk ? `->${f.fk}` : ''}`), ['orderId*', 'productId*->Product', 'quantity']);
  // manual split for a dependency only the analyst knows
  const m = sampleProject();
  const app = m.entities.find((e) => e.name === 'Application');
  N.manualSplit(m, app.id, { target: 'Loan Term', move: ['termMonths'] });
  t('manual split creates the entity and a foreign key', m.entities.some((e) => e.name === 'LoanTerm' && e.fields.some((f) => f.name === 'termMonths')) && app.fields.some((f) => f.name === 'loanTermId' && f.fk === 'LoanTerm') && !app.fields.some((f) => f.name === 'termMonths'));
  const o = sampleProject();
  o.entities.push({ id: 'of', ...N.practiceEntity() });
  N.applyAll(o, ['of']);
  N.manualSplit(o, 'of', { target: 'Order Line', move: ['quantity', 'unitPrice'], many: true });
  const line = o.entities.find((e) => e.name === 'OrderLine');
  eq('one-to-many split: child points back to the source', line.fields.map((f) => `${f.name}${f.fk ? `->${f.fk}` : ''}`), ['id', 'orderFormId->OrderForm', 'quantity', 'unitPrice']);
  t('one-to-many split: source has no foreign key to the child', !o.entities.find((e) => e.id === 'of').fields.some((f) => f.fk === 'OrderLine'));
  // snake_case models get snake_case names
  const sn = blankProject('s');
  sn.entities = [{ id: 'o', name: 'invoice', fields: [{ name: 'invoice_id', type: 'uuid', pk: true }, { name: 'supplier_id', type: 'uuid' }, { name: 'supplier_name', type: 'string' }] }];
  N.applyAll(sn);
  eq('snake_case style kept', sn.entities.find((e) => e.name === 'Supplier').fields.map((f) => f.name), ['supplier_id', 'name']);
}

// ---------- UML notation ----------
{
  const G = await import('../js/gen/diagrams.js');
  const s = sampleProject();
  const uc = G.useCaseDiagram(s);
  t('use case: primary actors drawn before the boundary, secondary after', uc.indexOf('A_p1[') < uc.indexOf('subgraph SYS') && uc.indexOf('A_p3[') > uc.indexOf('  end'));
  t('use case: associations are plain lines', /A_p1 --- U_u1/.test(uc) && !/A_p1 -->/.test(uc));
  t('use case: «extend» points from the extension to the base', /U_u3 -\.->\|«extend»\| U_u1/.test(uc));
  t('use case: actor generalisation (child → parent)', /A_p5 -->\|is a\| A_p2/.test(uc));
  const cls = G.classDiagram(s);
  t('class: no navigability arrows on associations', !/" --> "/.test(cls) && /"1" -- "\*"/.test(cls));
  t('class: composition uses a filled diamond', /Application "1" \*-- "\*" Document/.test(cls));
  t('class: keys marked, no fake visibility on attributes', /uuid id PK/.test(cls) && !/\+uuid id/.test(cls));
  const s2 = sampleProject();
  s2.relationships.push({ from: 'en1', to: 'en2', kind: 'generalisation' }, { from: 'en2', to: 'en3', kind: 'aggregation', card: 'one-to-one-or-more' });
  s2.entities[0].operations = ['verifyIdentity', 'updateEmail(email)'];
  const cls2 = G.classDiagram(s2);
  t('class: generalisation triangle on the parent', /Customer <\|-- Application/.test(cls2));
  t('class: aggregation hollow diamond with 1..* multiplicity', /Application "1" o-- "1\.\.\*" CreditCheck/.test(cls2));
  t('class: operations end in ()', /\+verifyIdentity\(\)/.test(cls2) && /\+updateEmail\(email\)/.test(cls2));
  t('ERD: generalisation shown as a subtype, not a crow\'s foot many', /Customer \|\|--o\| Application : "is a \(subtype\)"/.test(G.erd(s2)));
  const seq = G.sequenceDiagram(s, s.usecases[3]);
  t('sequence: user request answered by the system has an activation bar', /P->>\+S: Officer opens/.test(seq) && /S-->>-P: System shows/.test(seq));
  t('sequence: internal system work is a self message', /S->>S: System records the override/.test(seq));
  t('sequence: notifications are asynchronous', /S-\)P: System notifies/.test(seq));
  t('sequence: alternative flows become alt fragments at their step', /alt Main flow\n\s+P->>S: Officer approves[\s\S]*else Alternative Override reason missing/.test(seq));
  const act = G.activityDiagram(s, s.processes[1]);
  t('activity: initial and final nodes, fork/join bars, [guards]', /:::initial/.test(act) && /:::final/.test(act) && (act.match(/:::bar/g) || []).length === 2 && /\|"\[yes\]"\|/.test(act));
  t('activity: labelled end step keeps its action', /S_S13\("Funds disbursed"\):::action/.test(act) && /S_S13 --> S_S13_f/.test(act));
  const sm = { name: 'x', initial: 'A', finals: ['B'], transitions: [{ from: 'A', to: 'B', event: 'pay', guard: 'amount > 0', action: 'send receipt' }] };
  t('state: event [guard] / action', /: pay \(amount > 0\) \/ send receipt/.test(G.stateDiagram(s, sm)));
  t('communication diagram numbers messages', /1: Applicant enters amount/.test(G.communicationDiagram(s, s.usecases[0])));
  t('every diagram type has a "how to read it" legend', G.DIAGRAMS.filter((d) => ['usecase', 'sequence', 'communication', 'state', 'class', 'erd', 'activity', 'process'].includes(d.id)).every((d) => d.legend && d.legend.length > 60));
}

// ---------- Technical BA: SQL, API specs, data mapping, architecture ----------
{
  const Q = await import('../js/gen/sqldata.js');
  const X = await import('../js/gen/exports.js');
  const M = await import('../js/model.js');
  const G = await import('../js/gen/diagrams.js');
  const s = sampleProject();
  const order = Q.tableOrder(s).map((e) => e.name);
  t('tables are created parents first', order.indexOf('Customer') < order.indexOf('Application') && order.indexOf('Application') < order.indexOf('Document'));
  const schema = Q.sqliteSchema(s).join('\n');
  t('schema has keys and foreign keys', /PRIMARY KEY \("id"\)/.test(schema) && /FOREIGN KEY \("customerId"\) REFERENCES "Customer" \("id"\)/.test(schema));
  const data = Q.sampleRows(s, 8);
  t('sample data: every foreign key points at a real parent row', data.Application.every((a) => data.Customer.some((c) => c.id === a.customerId)) && data.Document.every((d) => data.Application.some((a) => a.id === d.applicationId)));
  t('sample data: primary keys are unique', Object.values(data).every((rows) => new Set(rows.map((r) => r.id)).size === rows.length));
  t('sample data: enum values come from the attribute description', data.Document.every((d) => d.kind === null || ['Payslip', 'Bank statement', 'ID'].includes(d.kind)));
  eq('sample data is repeatable', JSON.stringify(Q.sampleRows(s, 3)), JSON.stringify(Q.sampleRows(s, 3)));
  t('inserts escape quotes', Q.insertStatements({ ...s, entities: [{ name: 'T', fields: [{ name: 'x', type: 'string' }] }] }, { T: [{ x: "O'Brien" }] })[0].includes("'O''Brien'"));
  const ex = Q.exampleQueries(s).map((x) => x.sql).join('\n');
  t('example queries cover WHERE, ORDER BY, GROUP BY, JOIN, LEFT JOIN and HAVING', ['WHERE', 'ORDER BY', 'GROUP BY', 'INNER JOIN', 'LEFT JOIN', 'HAVING'].every((k) => ex.includes(k)));
  // API checks
  const bad = { method: 'POST', path: '/orders/{id}/items', codes: [{ code: '200' }], params: [], summary: 'Add item' };
  const issues = M.lintApi(bad, s);
  t('API check: missing 4xx, path param, retry behaviour and requirement link', ['client error', '{id}', 'retry', 'requirement'].every((k) => issues.some((i) => i.toLowerCase().includes(k.toLowerCase()))), issues.join(' | '));
  eq('API check: a complete spec passes', M.lintApi(s.apis[0], s), []);
  const e = X.apiExamples(s, { method: 'POST', path: '/applications', entity: 'en2' });
  t('generated POST example leaves out the server-made key', e.request && !('id' in e.request) && 'amount' in e.request && e.response.id);
  t('XML example mirrors the JSON', /<Application>\n  <id>APP-\d+<\/id>/.test(X.toXml('Application', e.response)) && X.toXml('a', { x: 'a<b & c' }).includes('a&lt;b &amp; c'));
  const pm = X.postmanCollection(s);
  t('Postman collection v2.1 with folders, :path params and idempotency key', /v2\.1\.0/.test(pm.info.schema) && pm.item.length === 2 && pm.item[0].item[1].request.url.path.includes(':id') && pm.item[0].item[0].request.header.some((h) => h.key === 'Idempotency-Key'));
  // data mapping
  const scr = { name: 'X', fields: [{ label: 'Amount', control: 'Text', mapsTo: 'Application.amount' }, { label: 'Email', control: 'Email', mapsTo: 'Customer.nope' }, { label: 'Name', control: 'Text' }, { label: 'Born', control: 'Date', mapsTo: 'Customer.fullName' }] };
  const mi = M.mappingIssues(scr, s);
  t('mapping: unmapped, missing attribute, type mismatch, required mismatch, no button', ['not mapped', 'no longer exists', 'is decimal', 'is string', 'optional on screen', 'No action button'].every((k) => mi.some((i) => i.includes(k))), mi.join(' | '));
  eq('mapping: sample loan details screen is fully mapped', M.mappingIssues(s.screens[0], s), []);
  t('data flow diagram goes screen → API → table', /SCR -->\|"submits"\| API0/.test(G.dataFlow(s, s.screens[0])) && /API0 -->\|"amount, termMonths"\| T_Application/.test(G.dataFlow(s, s.screens[0])));
  t('edge labels with brackets are quoted (Mermaid rejects them otherwise)', /-\.->\|"Manual \(spreadsheet \/ re-keying\) · Daily"\|/.test(G.architecture(s, 'as-is')));
  // requirement suggestions
  t('suggests an unhappy path when acceptance criteria only cover success', M.suggestRequirement({ type: 'Functional', statement: 'The system shall save the profile.', acceptance: [{ given: 'a user', when: 'they save', then: 'it is saved' }] }).some((x) => /unhappy/.test(x)));
  eq('no suggestion when an error path exists', M.suggestRequirement({ type: 'Functional', statement: 'The system shall save the profile.', acceptance: [{ given: 'a user', when: 'they save with a blank email', then: 'an error is shown' }] }), []);
  // architecture
  const asis = G.architecture(s, 'as-is'), tobe = G.architecture(s, 'to-be'), lay = G.architecture(s, 'layers');
  t('as-is shows retiring systems and manual links in red', /Branch paper forms/.test(asis) && /-\.->/.test(asis) && /linkStyle 0,1 stroke:#ef4444/.test(asis) && !/Banking app/.test(asis));
  t('to-be shows new components, not retired ones', /Banking app/.test(tobe) && !/paper forms/.test(tobe) && /:::added/.test(tobe));
  t('layers view groups by layer in order', lay.indexOf('Presentation (UI)') < lay.indexOf('Business logic') && lay.indexOf('Business logic') < lay.indexOf('"Data"'));
  // practice bank
  const { BANK, CATEGORIES } = await import('../js/practice-bank.js');
  t('practice bank: every question has a category, outline and app link', BANK.length >= 30 && BANK.every((q) => CATEGORIES.includes(q[0]) && q[3].length > 60 && /^#\//.test(q[5][0])));
}

// ---------- BABOK techniques and the masterclass ----------
{
  const M = await import('../js/model.js');
  const G = await import('../js/gen/diagrams.js');
  const { buildDoc, DOC_LIST } = await import('../js/gen/docs.js');
  const C = await import('../js/masterclass.js');
  const { BANK } = await import('../js/practice-bank.js');
  // weighted vendor scoring
  const v = { criteria: [{ id: 'a', name: 'Fit', weight: 60 }, { id: 'b', name: 'Cost', weight: 40 }], options: [{ id: 'x', name: 'X', scores: { a: 5, b: 1 } }, { id: 'y', name: 'Y', scores: { a: 3, b: 5 } }, { id: 'z', name: 'Z', scores: { a: 4 } }] };
  const r = M.vendorScores(v);
  close('vendor score X = (5×60 + 1×40) / 100', r.find((x) => x.option.id === 'x').score, 3.4);
  close('vendor score Y = (3×60 + 5×40) / 100', r.find((x) => x.option.id === 'y').score, 3.8);
  eq('vendors ranked highest first', r.map((x) => x.option.id), ['y', 'x', 'z']);
  eq('partly scored option is flagged', r.find((x) => x.option.id === 'z').complete, false);
  eq('no criteria → zero, no crash', M.vendorScores({ criteria: [], options: [{ id: 'q', scores: {} }] })[0].score, 0);
  // robustness of the new project objects
  const n = M.normalize({ bmc: { value: 'A\nB', segments: null }, vendors: 'oops', permissions: [], baPlan: null });
  eq('BMC text is turned into lists', [n.bmc.value, n.bmc.segments], [['A', 'B'], []]);
  t('bad vendors / permissions / plan are repaired', Array.isArray(n.vendors.criteria) && !Array.isArray(n.permissions) && typeof n.permissions === 'object' && n.baPlan.approach);
  eq('capability maturity must be 1–5', !!M.COLLECTIONS.capabilities.validate({ current: 7 }), true);
  // sample content and outputs
  const s = sampleProject();
  t('capability map colours gaps', /CAP|Credit decisioning/.test(G.capabilityMap(s)) && /:::big/.test(G.capabilityMap(s)));
  t('fishbone links causes to the problem and draws the 5 Whys to the root cause', /C0 --> P/.test(G.fishbone(s, s.rootCauses[0])) && /W3 --> RC/.test(G.fishbone(s, s.rootCauses[0])));
  t('concept model draws glossary relationships', /G_g1 -->\|"is assessed for each"\| G_g5/.test(G.conceptModel(s)));
  t('functional decomposition from epics', /^mindmap/.test(G.decomposition(s)) && G.decomposition(s).split('\n').length > 4);
  const srs = buildDoc(s, 'srs').markdown;
  t('SRS has a roles & permissions section with CRUD', /## 10\. Roles and permissions/.test(srs) && /\| Application \|/.test(srs) && /\bCR\b/.test(srs));
  const strat = buildDoc(s, 'strategy').markdown;
  t('strategy document has BMC, capabilities, root cause and balanced scorecard', ['Business Model Canvas', 'Business capabilities', 'Root cause analysis', 'balanced scorecard'].every((k) => strat.includes(k)));
  t('business case includes the weighted option assessment', /Option \/ vendor assessment/.test(buildDoc(s, 'businesscase').markdown) && /4\.10/.test(buildDoc(s, 'businesscase').markdown));
  t('BA plan document covers approach, governance, performance, reviews and lessons', ['## 2. Approach', '## 4. Governance', '## 7. Performance measures', 'REV-01', 'LL-01'].every((k) => buildDoc(s, 'baplan').markdown.includes(k)));
  // masterclass integrity
  const lessons = C.lessonList();
  eq('50 BABOK techniques, no duplicates', [C.TECHNIQUES.length, new Set(C.TECHNIQUES.map((x) => x[0])).size], [50, 50]);
  t('every lesson has content, a quiz with a valid answer and known sources', lessons.length >= 20 && lessons.every((l) => l.intro.length > 80 && l.points.length >= 3 && l.how.length && l.quiz.length && l.quiz.every((q) => q[2] >= 0 && q[2] < q[1].length && q[3]) && l.sources.every((k) => C.SOURCES[k])));
  t('lesson ids are unique', new Set(lessons.map((l) => l.id)).size === lessons.length);
  // every in-app link (masterclass, technique library, practice bank) points at a real screen
  const docs = new Set(DOC_LIST.map((d) => d.id)), diags = new Set([...G.DIAGRAMS.map((d) => d.id), 'focus']);
  const pages = new Set(['', 'srs', 'charter', 'strategy', 'business-case', 'estimate', 'stakeholders', 'board', 'prioritise', 'trace', 'decision-tables', 'data', 'normalise', 'sql', 'practice', 'masterclass', 'techniques', 'bmc', 'ba-plan', 'permissions', 'vendors', 'diagrams', 'studio', 'canvas', 'docs', 'settings']);
  const valid = (href) => {
    const [a, b] = href.replace(/^#\/?/, '').split('/');
    if (a === 'c') return !!M.COLLECTIONS[b];
    if (a === 'docs') return !b || docs.has(b);
    if (a === 'diagrams') return !b || diags.has(b.split(':')[0]);
    if (a === 'srs') return !b || (+b >= 1 && +b <= 10);
    return pages.has(a);
  };
  const links = [...lessons.flatMap((l) => l.try.map((x) => x[0])), ...C.TECHNIQUES.map((x) => x[2]), ...BANK.map((q) => q[5][0])];
  const broken = links.filter((h) => !valid(h));
  eq('every in-app link points at a real screen', broken, []);
  // the sidebar: every entry is a well-formed [route, label, count?] and points at a real screen
  const { readFileSync } = await import('node:fs');
  const NAV = eval(readFileSync(new URL('../js/app.js', import.meta.url), 'utf8').match(/const NAV = (\[[\s\S]*?\n\]);/)[1]);
  const items = NAV.flatMap(([, list]) => list);
  eq('sidebar entries are well formed (no item nested inside another)', items.filter((x) => x.length > 3 || x.some((y) => Array.isArray(y))).map((x) => x[1]), []);
  eq('every sidebar link opens a real screen', items.filter((x) => !valid(`#/${x[0]}`)).map((x) => x[1]), []);
  t('reviews and lessons learned are in the sidebar', ['c/reviews', 'c/lessons'].every((r) => items.some((x) => x[0] === r)));
}

// ---------- daily-use streamlining: Simple mode, fast capture, core documents ----------
{
  const M = await import('../js/model.js');
  const C = await import('../js/gen/capture.js');
  const T = await import('../js/templates.js');
  const D = await import('../js/gen/docs.js');
  const { searchTargets } = await import('../js/views/jump.js').catch(() => ({}));
  const { readFileSync } = await import('node:fs');
  const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const NAV = eval(appSrc.match(/const NAV = (\[[\s\S]*?\n\]);/)[1]);
  const SIMPLE = eval(`new Set(${appSrc.match(/export const SIMPLE = new Set\((\[[\s\S]*?\])\);/)[1]})`);
  const allRoutes = NAV.flatMap(([, i]) => i.map((x) => x[0]));
  t('Simple mode lists only real sidebar routes', [...SIMPLE].every((r) => allRoutes.includes(r)), [...SIMPLE].filter((r) => !allRoutes.includes(r)).join(', '));
  t('Simple mode keeps the daily screens and hides the rest', SIMPLE.size >= 20 && SIMPLE.size <= 30 && ['c/requirements', 'c/stories', 'c/screens', 'c/apis', 'sql', 'docs', 'trace', 'c/raid'].every((r) => SIMPLE.has(r)) && !['bmc', 'estimate', 'vendors', 'masterclass', 'normalise'].some((r) => SIMPLE.has(r)));
  // shorter forms
  t('no required field is tucked under "More details"', Object.values(M.COLLECTIONS).every((c) => c.fields.every((f) => !(f.adv && f.req))));
  t('at least 60 optional fields are tucked away', Object.values(M.COLLECTIONS).reduce((a, c) => a + c.fields.filter((f) => f.adv).length, 0) >= 60);
  // paste a list
  eq('bullets, numbers, checkboxes and duplicates are stripped', C.parseLines('- One\n* 2. Two\n3) Three\n[ ] Four\n- [x] Five\n\n- One'), ['One', 'Two', 'Three', 'Four', 'Five']);
  const s = sampleProject();
  const reqs = C.itemsFromText('requirements', '- let customers reset their password\n- The system shall log every sign-in.', s);
  eq('pasted requirements become "shall" statements with codes', reqs.map((r) => [r.code, r.statement]), [['FR-004', 'The system shall let customers reset their password.'], ['FR-005', 'The system shall log every sign-in.']]);
  t('pasted requirements are traced to the approver', reqs.every((r) => r.source === 's1'));
  const st = C.itemsFromText('stories', 'As a Credit Officer, I want to filter the queue so that I see urgent cases first', s)[0];
  eq('story text is split into role / goal / benefit', [st.asA, st.iWant, st.soThat], ['p2', 'filter the queue', 'I see urgent cases first']);
  eq('glossary "Term: definition"', C.itemsFromText('glossary', 'KYC: know your customer', s).map((g) => [g.term, g.definition]), [['KYC', 'Know your customer.']]);
  eq('RAID type from the prefix, else the default', C.itemsFromText('raid', 'Risk: vendor late\nusers have email', s, 'Assumption').map((r) => r.type), ['Risk', 'Assumption']);
  eq('stakeholder "Name - Role"', C.itemsFromText('stakeholders', 'Jane Smith - Head of Credit', s).map((x) => [x.name, x.role]), [['Jane Smith', 'Head of Credit']]);
  eq('questions get a question mark and a capital', C.itemsFromText('questions', '- who approves refunds', s)[0].question, 'Who approves refunds?');
  t('every pasted item passes its register\'s required fields', Object.keys(C.QUICK).every((k) => C.itemsFromText(k, '- Something useful: detail here\n- Another thing', s, C.QUICK[k].options?.[0]).every((x) => M.COLLECTIONS[k].fields.filter((f) => f.req && f.key !== 'code').every((f) => (Array.isArray(x[f.key]) ? x[f.key].length : String(x[f.key] ?? '').trim())))));
  // starter blocks
  t('starter requirements pass the quality checks with no suggestions', T.STARTERS.requirements.every((b) => b.items.every(([, st2, , acs]) => !M.lintRequirement({ type: 'Functional', statement: st2, acceptance: acs, source: 's1', objectiveIds: ['o1'] }, s).length && !M.suggestRequirement({ type: 'Functional', statement: st2, acceptance: acs }).length)));
  // derive from the model
  const scr = C.screenFromEntity(s, s.entities.find((e) => e.name === 'Application'));
  t('screen from an entity maps every attribute and adds a Save button', scr.fields.filter((f) => f.control !== 'Button').every((f) => /^Application\./.test(f.mapsTo)) && scr.fields.at(-1).control === 'Button' && scr.fields.some((f) => f.control === 'Currency'));
  eq('the derived screen has no mapping issues', M.mappingIssues(scr, s), []);
  const eps = C.endpointsFromEntity(s, s.entities.find((e) => e.name === 'Customer'));
  eq('CRUD endpoints for an entity', eps.map((a) => `${a.method} ${a.path}`), ['GET /customers', 'GET /customers/{id}', 'POST /customers', 'PUT /customers/{id}', 'DELETE /customers/{id}']);
  t('generated endpoints pass the API checks except the requirement link', eps.every((a) => M.lintApi({ ...a, requirementIds: ['r3'] }, s).length === 0), eps.map((a) => M.lintApi({ ...a, requirementIds: ['r3'] }, s).join(';')).join(' | '));
  eq('existing endpoints are not duplicated', C.endpointsFromEntity(s, s.entities.find((e) => e.name === 'Application')).map((a) => `${a.method} ${a.path}`).includes('POST /applications'), false);
  const tests = C.testsFromAcceptance(s);
  t('a draft test per acceptance scenario, linked to its requirement or story', tests.length > 0 && tests.every((x) => x.requirementIds.length || x.storyIds.length) && tests.every((x) => x.expected));
  eq('running it again adds nothing', C.testsFromAcceptance({ ...s, tests: [...s.tests, ...tests] }).length, 0);
  // templates
  const tpl = C.templateFrom(s, 'Lending starter');
  t('a template keeps NFRs, roles and assumptions but not project-specific work', tpl.data.requirements.every((r) => r.type === 'Non-functional') && tpl.data.personas.length === s.personas.length && !('stories' in tpl.data) && tpl.data.raid.every((r) => ['Assumption', 'Dependency'].includes(r.type)));
  const np = C.applyTemplate(M.blankProject('New'), tpl);
  t('a new project from a template starts with them', np.meta.name === 'New' && np.personas.length && np.requirements.length && !np.stories.length);
  // quick jump
  if (searchTargets) {
    const list = [{ kind: 'Screen', label: 'SQL workbench', detail: 'Solution design' }, { kind: 'requirement', label: 'FR-001 Submit a loan application', detail: 'Requirements' }, { kind: 'Screen', label: 'Requirements', detail: 'Requirements' }];
    eq('quick jump finds an ID first', searchTargets(list, 'fr-001')[0].label, 'FR-001 Submit a loan application');
    eq('quick jump matches all words', searchTargets(list, 'sql work').map((x) => x.label), ['SQL workbench']);
  }
  // core documents and the builder
  eq('5 core deliverables', D.CORE_DOCS.length, 5);
  t('every core deliverable uses real sections', D.CORE_DOCS.every((c) => c.sections.every((id) => D.SECTION_LIST.some((x) => x.id === id))));
  for (const c of D.CORE_DOCS) { const m = D.buildDoc(s, c.id).markdown; t(`${c.title}: builds cleanly with numbered sections`, m.length > 1000 && /## 1\. Document control/.test(m) && !/undefined|NaN|\[object Object\]/.test(m)); }
  const comp = D.buildComposed(s, 'My pack', ['objectives', 'defects', 'signoff']);
  t('the builder numbers sections in order and keeps the approval block', /## 1\. Business objectives/.test(comp.markdown) && /## 2\. Defects/.test(comp.markdown) && /## Approval/.test(comp.markdown));
  t('empty sections are left out', !/Use cases/.test(D.buildComposed(M.blankProject('x'), 'X', ['usecases', 'signoff']).markdown));
  t('every section builds on an empty project without errors', D.SECTION_LIST.every((x) => !/undefined|NaN/.test(D.buildComposed(M.blankProject('x'), 'X', [x.id]).markdown)));
}

// ---------- Word (.docx), ZIP and Jira round trip ----------
{
  const M = await import('../js/model.js');
  const D = await import('../js/gen/docs.js');
  const X = await import('../js/gen/docx.js');
  const Z = await import('../js/gen/zip.js');
  const J = await import('../js/gen/jira.js');
  const s = M.normalize(sampleProject());
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  // inline formatting
  eq('inline runs: bold, code, italic', X.inlineRuns('A **b** `c` and _d_.').map((r) => `${r.b ? 'B' : r.code ? 'C' : r.i ? 'I' : '-'}${r.text}`), ['-A ', 'Bb', '- ', 'Cc', '- and ', 'Id', '-.']);
  eq('snake_case words are not italic', X.inlineRuns('the field user_name_x').length, 1);
  eq('XML escaping drops control characters', X.xmlEsc('a<b & "c"\u0001'), 'a&lt;b &amp; &quot;c&quot;');
  eq('blocks: heading, table, list, quote, mermaid', X.mdBlocks('# T\n## H\n| a | b |\n| --- | --- |\n| 1 | x \\| y |\n- one\n- two\n> **Note** here\n```mermaid\nflowchart LR\n```').map((b) => b.t), ['h', 'h', 'table', 'ul', 'quote', 'mermaid']);
  eq('escaped pipes stay in one cell', X.mdBlocks('| a | b |\n| --- | --- |\n| 1 | x \\| y |')[0].rows[0], ['1', 'x | y']);
  const w = X.columnWidths(['ID', 'Description'], [['FR-1', 'A much longer description of the requirement that needs room']], 9638);
  t('column widths fill the page and favour long text', w[0] + w[1] === 9638 && w[1] > w[0] * 1.5, JSON.stringify(w));
  eq('brand colour tint', X.tint('#000000', 0.5), '808080');
  // every document becomes well-formed Word XML
  let bad = '';
  let wideOk = true;
  for (const d of D.DOC_LIST) {
    const doc = D.buildDoc(s, d.id);
    const images = X.mermaidBlocks(doc.markdown).map((c, i) => ({ data: png, w: i % 2 ? 1500 : 500, h: 400, wide: i % 2 === 1 }));
    const { files, stats } = X.docxFiles({ title: doc.title, markdown: doc.markdown, meta: s.meta, images, org: 'Acme <R&D>', brand: { colour: '#b91c1c', footer: 'Confidential' }, logo: { data: png, type: 'png', w: 300, h: 100 } });
    for (const [k, v] of Object.entries(files)) if (typeof v === 'string') { const e = X.xmlProblem(v); if (e) bad += `${d.id}/${k}: ${e}; `; }
    if (images.some((i) => i.wide) && !stats.landscape) wideOk = false;
    if (!files['word/document.xml'].includes('w:sectPr')) bad += `${d.id}: no section; `;
  }
  t('every document is well-formed Word XML', !bad, bad);
  t('wide diagrams get landscape pages', wideOk);
  const one = X.docxFiles({ title: 'Spec', markdown: D.buildDoc(s, 'core-functional').markdown, meta: s.meta, org: 'Acme', brand: { colour: '#123456', footer: 'Confidential' }, logo: { data: png, type: 'png', w: 300, h: 100 } });
  const doc = one.files['word/document.xml'];
  t('cover page, contents with links, and headings with bookmarks', one.stats.cover && one.stats.toc > 5 && doc.includes('<w:titlePg/>') && doc.includes('w:anchor="_Toc') && doc.includes('<w:bookmarkStart'));
  t('brand colour in the styles and logo in header and cover', one.files['word/styles.xml'].includes('w:val="123456"') && one.files['word/_rels/header1.xml.rels'].includes('media/image1.png') && one.files['word/media/image1.png'] === png);
  t('footer has the note, version and page numbers', /Confidential · Spec · v0/.test(one.files['word/footer1.xml']) && one.files['word/footer1.xml'].includes(' NUMPAGES '));
  t('each ordered list restarts its numbering', (one.files['word/numbering.xml'].match(/<w:startOverride w:val="1"\/>/g) || []).length === (doc.match(/<w:numId w:val="(\d+)"/g) || []).filter((x, i, a) => !x.endsWith('"1"') && a.indexOf(x) === i).length);
  t('a diagram that failed to draw falls back to its source', X.docxFiles({ title: 'x', markdown: '## A\n```mermaid\nflowchart LR\nA-->B\n```', images: [null] }).files['word/document.xml'].includes('A--&gt;B'));
  const wideTable = X.docxFiles({ title: 'x', markdown: `# T\n## Matrix\n| ${'c | '.repeat(9)}\n|${' --- |'.repeat(9)}\n| ${'1 | '.repeat(9)}`, brand: { cover: false } });
  eq('a table with 8+ columns goes on a landscape page', wideTable.stats.landscape, 1);
  const noCover = X.docxFiles({ title: 'x', markdown: '# T\n## A\ntext', brand: { cover: false, toc: false } });
  t('cover and contents can be switched off', !noCover.stats.cover && !noCover.files['word/document.xml'].includes('TOC \\o'));
  // ZIP writer round trip
  const zipped = await Z.zipFiles({ 'a.txt': 'hello é', 'b/c.xml': '<x>'.repeat(500), 'img.png': png });
  const back = await Z.unzipFiles(zipped);
  t('ZIP round trip keeps names and bytes', new TextDecoder().decode(back['a.txt']) === 'hello é' && new TextDecoder().decode(back['b/c.xml']) === '<x>'.repeat(500) && back['img.png'].length === png.length);
  t('ZIP compresses repetitive XML', zipped.length < 1000);
  const dz = await Z.unzipFiles(await Z.zipFiles(one.files));
  eq('a .docx keeps every part', Object.keys(dz).sort(), Object.keys(one.files).sort());
  // Jira
  const csvText = J.jiraCsv(s, { stories: true, reqTypes: ['Functional'] });
  const rows = parseCsvLocal(csvText);
  const head = rows[0];
  t('Jira CSV has the import columns', ['Issue Id', 'Parent', 'Issue Type', 'Summary', 'Description', 'Priority', 'Story Points', 'Labels'].every((h) => head.includes(h)));
  const epics = rows.filter((r) => r[head.indexOf('Issue Type')] === 'Epic');
  eq('one epic per epic name', epics.length, new Set(s.stories.map((x) => x.epic).filter(Boolean)).size);
  const st = rows.find((r) => r[head.indexOf('BA Builder ID')] === s.stories[0].code);
  t('stories point at their epic and carry acceptance criteria', st && epics.some((e) => e[0] === st[head.indexOf('Parent')]) && /\*Given\*/.test(st[head.indexOf('Description')]));
  eq('summary drops the leading "to"', J.storySummary({ iWant: 'to enter the loan amount' }), 'Enter the loan amount');
  eq('MoSCoW → Jira priority', s.stories.map((x) => J.PRIORITY_TO_JIRA[x.priority]).every(Boolean), true);
  t('requirements export as Tasks with an ID label', rows.filter((r) => r[head.indexOf('Issue Type')] === 'Task').length === s.requirements.filter((r) => r.type === 'Functional').length && rows.some((r) => r.includes(`${J.ID_LABEL}FR-001`)));
  // our own file read straight back changes nothing
  const plan0 = J.planJiraImport(s, J.readJiraCsv(csvText));
  t('re-importing the export changes nothing', plan0.updates.length === 0 && plan0.creates.length === 0 && plan0.skipped === epics.length, J.describePlan(plan0));
  eq('priority and status mapping', [J.priorityFromJira('Highest'), J.priorityFromJira('Medium'), J.priorityFromJira('Low'), J.priorityFromJira('Lowest'), J.storyStatusFromJira('Selected for Development'), J.storyStatusFromJira('In Progress'), J.storyStatusFromJira('Code Review'), J.storyStatusFromJira('Closed'), J.storyStatusFromJira('To Do')], ['Must', 'Should', 'Could', "Won't", 'Ready', 'In progress', 'In review', 'Done', 'Backlog']);
  // a Jira export: keys, statuses and a new issue come back
  const s0 = s.stories[0], r0 = s.requirements.find((r) => r.type === 'Functional');
  const jiraExport = [
    'Summary,Issue key,Issue id,Issue Type,Status,Priority,Labels,Labels,Custom field (Story Points),Description,Parent summary',
    `"${J.storySummary(s0)}",LOAN-11,10011,Story,Done,Highest,${J.ID_LABEL}${s0.code},mvp,4,"x",`,
    `"${r0.code} ${r0.title}",LOAN-12,10012,Task,Done,Medium,,,,"",`,
    'Add dark mode,LOAN-13,10013,Story,In Progress,Low,,,2,"Requested in Jira",Apply online',
    'Calculator rounds wrongly,LOAN-14,10014,Bug,Open,High,,,,"Shows R 1 000.01",',
    'Apply online,LOAN-1,10001,Epic,To Do,Medium,,,,,',
  ].join('\n');
  const plan = J.planJiraImport(s, J.readJiraCsv(jiraExport));
  const u0 = plan.updates.find((u) => u.id === s0.id);
  const after0 = { ...s0, ...(u0?.patch || {}) };
  t('matched by label: key, status, priority and points (4 → nearest 3 or 5)', u0 && after0.jiraKey === 'LOAN-11' && after0.status === 'Done' && ['3', '5'].includes(String(after0.points)) && after0.priority === 'Must', JSON.stringify(u0));
  const ur = plan.updates.find((u) => u.id === r0.id);
  t('matched by summary: requirement becomes Implemented', ur && ur.patch.status === 'Implemented' && ur.patch.jiraKey === 'LOAN-12', JSON.stringify(ur));
  eq('new Jira issues are added (story and bug), epics skipped', [plan.creates.map((c) => c.key), plan.skipped], [['stories', 'defects'], 1]);
  const copy = JSON.parse(JSON.stringify(s));
  const n = J.applyJiraImport(copy, plan);
  const added = copy.stories[copy.stories.length - 1];
  t('applying the plan updates and adds items with codes', n === plan.updates.length + plan.creates.length && added.jiraKey === 'LOAN-13' && /^US-/.test(added.code) && added.epic === 'Apply online' && copy.defects.some((d) => d.jiraKey === 'LOAN-14' && d.code));
  eq('matched again by Jira key next time: nothing to change', J.planJiraImport(copy, J.readJiraCsv(jiraExport)).updates.length, 0);
  let threw = '';
  try { J.readJiraCsv('Name,Age\nA,1'); } catch (e) { threw = e.message; }
  t('a non-Jira CSV is rejected with a clear message', /Jira CSV/.test(threw));
}

// ---------- offline and backups ----------
{
  const B = await import('../js/backup.js');
  const O = await import('../tools/offline-list.mjs');
  const M = await import('../js/model.js');
  const { readFileSync, existsSync } = await import('node:fs');
  // no library is loaded from the internet first
  const code = ['js/mermaid.js', 'js/views/sql.js'].map((x) => readFileSync(x, 'utf8')).join('\n');
  t('diagrams and SQL load the bundled copies first', /LOCAL_MERMAID = new URL\('\.\.\/vendor\/mermaid\//.test(code) && /importEither\(LOCAL_MERMAID, CDN_MERMAID\)/.test(code) && /new URL\('\.\.\/\.\.\/vendor\/sql\.js\/'/.test(code));
  t('bundled libraries are present', ['vendor/mermaid/mermaid.esm.min.js', 'vendor/layout-elk/mermaid-layout-elk.esm.min.js', 'vendor/sql.js/sql-wasm.js', 'vendor/sql.js/sql-wasm.wasm', 'vendor/mermaid/LICENSE', 'vendor/sql.js/LICENSE'].every((x) => existsSync(x)));
  const chunkRefs = [...readFileSync('vendor/mermaid/mermaid.esm.min.js', 'utf8').matchAll(/from"(\.\/chunks\/[^"]+)"/g)].map((m) => `vendor/mermaid/${m[1].slice(2)}`);
  t('every chunk Mermaid imports is bundled', chunkRefs.length > 0 && chunkRefs.every((x) => existsSync(x)), chunkRefs.filter((x) => !existsSync(x)).join(', '));
  const nonLocal = ['js', 'css'].flatMap((d) => O.offlineFiles().filter((x) => x.startsWith(`${d}/`))).filter((x) => /(^|[^.\w])import\(['"]https?:|<script[^>]+src=["']https?:|@import url\(["']?https?:/.test(readFileSync(x, 'utf8')));
  eq('no app file pulls code straight from the internet', nonLocal, []);
  const st = O.offlineStatus();
  t('the offline file list and service worker version are up to date', st.ok, 'run: node tools/offline-list.mjs');
  t('the offline list covers the app, styles, libraries and icon', ['index.html', 'css/app.css', 'js/app.js', 'js/backup.js', 'vendor/sql.js/sql-wasm.wasm', 'icon.svg', 'manifest.webmanifest'].every((x) => st.files.includes(x)) && !st.files.some((x) => x.startsWith('tests/') || x.endsWith('.map')));
  eq('no .mjs files (simple servers send them as plain text, which browsers refuse)', st.files.filter((x) => x.endsWith('.mjs')), []);
  t('the web app manifest is valid', (() => { const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8')); return m.name && m.start_url && m.display === 'standalone' && m.icons.length; })());
  // backup files
  const s1 = M.normalize(sampleProject());
  const s2 = { ...M.blankProject('Second'), updatedAt: '2027-01-01T00:00:00.000Z' };
  const file = B.backupFile([s1, s2], { org: 'X', templates: [{ name: 'T1' }], lastBackup: 'a', backupSnooze: 'b' }, new Date('2027-01-02T10:00:00Z'));
  t('a backup holds every project and the templates, not the reminder state', file.kind === B.BACKUP_KIND && file.projects.length === 2 && file.settings.templates.length === 1 && !('lastBackup' in file.settings) && !('backupSnooze' in file.settings));
  const back = B.parseBackup(JSON.stringify(file));
  eq('a backup reads back', [back.projects.length, back.createdAt, back.projects[0].meta.name], [2, '2027-01-02T10:00:00.000Z', s1.meta.name]);
  eq('a single project file is accepted too', B.parseBackup(JSON.stringify(s1)).projects.length, 1);
  const errs = ['nope', '{"a":1}', JSON.stringify({ kind: B.BACKUP_KIND, projects: [{ x: 1 }] })].map((x) => { try { B.parseBackup(x); return ''; } catch (e) { return e.message; } });
  t('bad files are refused with a clear reason', /not valid JSON/.test(errs[0]) && /not a BA Builder/.test(errs[1]) && /damaged/.test(errs[2]), errs.join(' | '));
  const plan = B.restorePlan([{ ...s1, updatedAt: '2030-01-01' }, M.blankProject('Mine')], [s1, s2]);
  t('restore plan: replace, add, keep, and warn about newer work', plan.replace.length === 1 && plan.add.join() === 'Second' && plan.keep.join() === 'Mine' && plan.newer.length === 1, JSON.stringify(plan));
  const merged = B.mergeSettings({ templates: [{ name: 'A', v: 1 }, { name: 'B' }], org: 'Mine' }, { templates: [{ name: 'A', v: 2 }, { name: 'C' }], org: 'Theirs' });
  t('restoring merges templates and keeps my preferences', merged.templates.map((x) => x.name).sort().join() === 'A,B,C' && merged.templates.find((x) => x.name === 'A').v === 2 && merged.org === 'Mine');
  // reminders
  const now = Date.parse('2027-03-10T12:00:00Z');
  const proj = (iso) => ({ updatedAt: iso });
  eq('no reminder without changes', B.backupDue([proj('2027-03-01T00:00:00Z')], { lastBackup: '2027-03-02T00:00:00Z' }, now).due, false);
  eq('weekly reminder after 7 days with changes', B.backupDue([proj('2027-03-05T00:00:00Z')], { lastBackup: '2027-03-02T00:00:00Z' }, now).due, true);
  eq('not before the interval', B.backupDue([proj('2027-03-09T00:00:00Z')], { lastBackup: '2027-03-08T00:00:00Z' }, now).due, false);
  eq('daily reminder', B.backupDue([proj('2027-03-09T13:00:00Z')], { lastBackup: '2027-03-09T12:00:00Z', backupEvery: 'daily' }, now).due, true);
  eq('switched off', B.backupDue([proj('2027-03-09T13:00:00Z')], { lastBackup: '2027-01-01T00:00:00Z', backupEvery: 'off' }, now).due, false);
  eq('snoozed until tomorrow', B.backupDue([proj('2027-03-09T13:00:00Z')], { lastBackup: '2027-01-01T00:00:00Z', backupSnooze: '2027-03-11T00:00:00Z' }, now).due, false);
  const never = B.backupDue([proj('2027-03-09T13:00:00Z')], { backupBase: '2027-03-01T00:00:00Z' }, now);
  t('never backed up: counted from first use', never.due && never.never && never.days === 9 && never.changed === 1, JSON.stringify(never));
  eq('a brand-new user is not nagged on day one', B.backupDue([proj('2027-03-10T11:00:00Z')], {}, now).due, false);
  eq('backup file name has the date', B.backupName(new Date('2027-03-10T12:00:00Z')), 'BA_Builder_backup_2027-03-10.json');
}

function parseCsvLocal(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++; else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows;
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
