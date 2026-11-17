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

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
