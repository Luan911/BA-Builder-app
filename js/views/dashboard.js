// Dashboard: health of the analysis, what needs attention, quick links.
import { project } from '../store.js';
import { esc, pill } from '../ui.js';
import { lintRequirement, riskScore, riskLevel, nameOf, businessCase } from '../model.js';
import { rtmRows } from '../gen/exports.js';
import { STEPS, startNewSrs } from './wizard.js';

/** Completeness checks across the BA lifecycle. Each returns [done, label, link]. */
export function readiness(p) {
  const reqs = p.requirements.filter((r) => r.status !== 'Rejected');
  const rows = rtmRows(p);
  return [
    [!!(p.meta.name && p.charter.problem && p.charter.vision), 'Problem and vision defined', '#/charter'],
    [p.charter.scopeIn.length > 0 && p.charter.scopeOut.length > 0, 'Scope in and out agreed', '#/charter'],
    [p.objectives.length > 0 && p.objectives.every((o) => /\d/.test(o.target || '')), 'Measurable objectives', '#/c/objectives'],
    [p.swot.length + p.pestle.length > 0, 'Strategy analysis done', '#/strategy'],
    [p.financials.length > 0 && !!p.businessCase.recommendation, 'Business case with recommendation', '#/business-case'],
    [p.stakeholders.length > 0 && p.stakeholders.some((s) => s.raci === 'A'), 'Stakeholders analysed, one accountable', '#/stakeholders'],
    [p.elicitation.length > 0, 'Elicitation recorded', '#/c/elicitation'],
    [!p.questions.some((q) => q.status === 'Open' && q.due && q.due < new Date().toISOString().slice(0, 10)), 'No overdue questions', '#/c/questions'],
    [reqs.length > 0 && reqs.every((r) => !lintRequirement(r, p).length), 'All requirements pass quality checks', '#/c/requirements'],
    [rows.length > 0 && rows.every((x) => x.covered || ['Business', 'Stakeholder', 'Transition'].includes(x.r.type)), 'Solution requirements covered by tests', '#/trace'],
    [p.processes.some((x) => x.state === 'To-be'), 'To-be process modelled', '#/c/processes'],
    [p.entities.length > 0 && p.entities.every((e) => (e.fields || []).some((f) => f.pk)), 'Data model with keys', '#/data'],
    [p.raid.filter((r) => r.type === 'Risk' && r.status !== 'Closed').every((r) => r.response), 'Every open risk has a response', '#/c/raid'],
    [p.tests.length > 0 && p.tests.every((t) => t.status === 'Passed'), 'UAT passed', '#/c/tests'],
  ];
}

export function renderDashboard(root) {
  const p = project();
  const checks = readiness(p);
  const done = checks.filter((c) => c[0]).length;
  const pct = Math.round((done / checks.length) * 100);
  const reqIssues = p.requirements.map((r) => [r, lintRequirement(r, p)]).filter(([, l]) => l.length);
  const risks = p.raid.filter((r) => r.type === 'Risk' && r.status !== 'Closed').sort((a, b) => riskScore(b) - riskScore(a));
  const actions = p.elicitation.flatMap((e) => (e.actions || []).filter((a) => !a.done).map((a) => ({ ...a, session: e.code })));
  const bc = businessCase(p);
  const stat = (n, label, href) => `<a class="stat" href="${href}"><b>${n}</b><span>${esc(label)}</span></a>`;
  const testsPassed = p.tests.filter((t) => t.status === 'Passed').length;

  root.innerHTML = `
    <div class="page-head"><div><h1>${esc(p.meta.name || 'Untitled project')}</h1><p>${esc(p.meta.summary || 'Start with the project charter: problem, vision and scope.')}</p></div></div>
    <section class="card" style="margin-bottom:16px;border-left:4px solid var(--green)"><div class="row"><div class="grow"><h2>Write an SRS step by step</h2><p class="muted" style="margin:4px 0 0">A guided ${STEPS.length}-step path from a blank page to a finished, checked Software Requirements Specification.</p></div><a class="btn" href="#/srs/1">Continue this project's SRS</a><button class="btn primary lg" data-newsrs2>+ New SRS</button></div></section>
    <div class="grid g4">
      ${stat(p.requirements.length, 'Requirements', '#/c/requirements')}
      ${stat(p.stories.length, `User stories · ${p.stories.reduce((a, s) => a + (+s.points || 0), 0)} pts`, '#/board')}
      ${stat(`${testsPassed}/${p.tests.length}`, 'Tests passed', '#/c/tests')}
      ${stat(p.financials.length ? `${bc.roi.toFixed(0)}%` : '—', 'Business case ROI', '#/business-case')}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <section class="card">
        <div class="row"><h2>Analysis readiness</h2><span class="grow"></span><span class="score">${pct}%</span></div>
        <div class="bar" style="margin:10px 0 12px"><i style="width:${pct}%"></i></div>
        <table class="tbl"><tbody>${checks.map(([ok, label, href]) => `<tr><td style="width:28px">${ok ? '✅' : '⬜'}</td><td><a href="${href}">${esc(label)}</a></td></tr>`).join('')}</tbody></table>
      </section>
      <div>
        <section class="card">
          <h2>Requirement quality</h2>
          ${reqIssues.length ? `<p class="muted small">${reqIssues.length} of ${p.requirements.length} requirements need attention.</p><table class="tbl"><tbody>${reqIssues.slice(0, 6).map(([r, l]) => `<tr><td><a href="#/c/requirements"><b>${esc(r.code)}</b></a></td><td class="small">${esc(l.join(' · '))}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">All requirements pass the quality checks.</p>'}
        </section>
        <section class="card">
          <h2>Top open risks</h2>
          ${risks.length ? `<table class="tbl"><tbody>${risks.slice(0, 4).map((r) => `<tr><td><b>${esc(r.code)}</b></td><td class="small">${esc(r.description)}</td><td>${pill(`${riskScore(r)}`, { High: 'err', Medium: 'warn', Low: 'ok' }[riskLevel(r)])}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No open risks.</p>'}
        </section>
        <section class="card">
          <h2>Open actions</h2>
          ${actions.length ? `<table class="tbl"><tbody>${actions.slice(0, 6).map((a) => `<tr><td class="small muted">${esc(a.session)}</td><td>${esc(a.action)}</td><td class="small">${esc(nameOf(p.stakeholders, a.owner))}</td><td class="small">${esc(a.due || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No open actions from elicitation sessions.</p>'}
        </section>
      </div>
    </div>
    <section class="card">
      <h2>Your toolkit</h2>
      <div class="grid g4" style="margin-top:10px">
        ${[['#/docs', 'Documents', '18 deliverables: BRD, SRS, business case, RTM, UAT…'], ['#/diagrams', 'Diagrams', 'BPMN flows, ERD, use case, sequence, state, context…'], ['#/studio', 'Diagram studio', 'Write any Mermaid diagram from templates'], ['#/canvas', 'Whiteboard', 'Drag-and-drop flowcharts and wireframes'], ['#/board', 'Backlog board', 'Drag stories across the workflow'], ['#/prioritise', 'Prioritisation', 'MoSCoW, RICE and WSJF'], ['#/trace', 'Traceability', 'Objective → requirement → story → test'], ['#/settings', 'Exports', 'OpenAPI, SQL, JSON Schema, CSV, project file']].map(([h, t, d]) => `<a class="stat" href="${h}"><b style="font-size:15px">${t}</b><span>${d}</span></a>`).join('')}
      </div>
    </section>`;
  root.querySelector('[data-newsrs2]').onclick = () => startNewSrs();
}
