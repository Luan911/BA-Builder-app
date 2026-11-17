// Cost & time estimate: team rates, three-point work estimates, schedule and agile forecast.
import { project, update } from '../store.js';
import { esc, $, $$, toast } from '../ui.js';
import { uid } from '../model.js';
import { estimate } from '../estimate.js';
import { renderCollection } from './collection.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function renderEstimate(root) {
  const p = project();
  const e = estimate(p);
  const s = e.settings;
  const cur = p.businessCase.currency || '';
  const m = (n) => `${cur} ${Math.round(n).toLocaleString()}`.trim();
  const d1 = (n) => (Math.round(n * 10) / 10).toLocaleString();
  root.innerHTML = `
    <div class="page-head"><div><h1>Cost & time estimate</h1><p>Estimate each piece of work as optimistic / most likely / pessimistic days. The app works out the expected effort, cost, a confidence range and a finish date on a working-day calendar.</p></div><span class="grow"></span><a class="btn" href="#/diagrams/schedule">Schedule chart</a><a class="btn" href="#/docs/estimate">Estimate document</a></div>
    <div class="grid g4">
      <div class="stat"><b>${m(e.total)}</b><span>Estimated cost (incl. ${Math.round(e.contingency * 100)}% contingency)</span></div>
      <div class="stat"><b>${d1(e.effort)} days</b><span>Expected effort · ${Math.round(e.hours).toLocaleString()} hours</span></div>
      <div class="stat"><b>${e.durationDays} working days</b><span>Estimated duration</span></div>
      <div class="stat"><b style="color:${e.late ? 'var(--err)' : 'inherit'}">${esc(e.endDate || '—')}</b><span>Estimated finish${e.deadline ? ` · target ${esc(e.deadline)}` : ''}</span></div>
    </div>
    ${e.warnings.length ? `<div class="callout warn" style="margin-top:16px"><b>Check these:</b><ul class="lint">${e.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <div class="grid g2" style="margin-top:16px">
      <section class="card">
        <h2 style="margin-bottom:10px">Settings</h2>
        <div class="form" data-est>
          <label class="field"><span>Start date</span><input type="date" data-k="startDate" value="${esc(s.startDate)}"></label>
          <label class="field"><span>Contingency %</span><input type="number" min="0" step="1" data-k="contingency" value="${esc(s.contingency)}"></label>
          <label class="field"><span>Hours per day</span><input type="number" min="1" max="24" step="0.5" data-k="hoursPerDay" value="${esc(s.hoursPerDay)}"></label>
          <div class="field"><span>Working days</span><div class="row" style="gap:6px;flex-wrap:wrap">${DAYS.map((d, i) => `<label class="small"><input type="checkbox" data-wd="${i}" ${s.workDays.includes(i) ? 'checked' : ''}> ${d}</label>`).join('')}</div></div>
          <label class="field full"><span>Public holidays / leave (YYYY-MM-DD, comma or space separated)</span><input type="text" data-k="holidays" value="${esc(Array.isArray(p.estimate.holidays) ? p.estimate.holidays.join(', ') : p.estimate.holidays || '')}" placeholder="2027-03-21, 2027-04-18"></label>
          <label class="field"><span>Team velocity (points per sprint)</span><input type="number" min="0" data-k="velocity" value="${esc(s.velocity)}"></label>
          <label class="field"><span>Sprint length (weeks)</span><input type="number" min="1" max="8" data-k="sprintWeeks" value="${esc(s.sprintWeeks)}"></label>
        </div>
      </section>
      <section class="card">
        <h2 style="margin-bottom:10px">Confidence range</h2>
        <p class="muted small" style="margin-top:0">Single estimates are always wrong; a range is honest. Assumes the work items are independent.</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Chance of finishing within</th><th class="num">Effort (days)</th><th class="num">Cost</th></tr></thead><tbody>
          ${[['50', '50% (expected)'], ['80', '80%'], ['90', '90%'], ['95', '95%']].map(([k, l]) => `<tr><td>${l}</td><td class="num">${d1(e.confidence[k].effort)}</td><td class="num">${m(e.confidence[k].cost)}</td></tr>`).join('')}
        </tbody></table></div>
        <h2 style="margin:16px 0 8px">Agile forecast</h2>
        ${e.velocity ? `<p style="margin:0">${e.openPoints} open story points ÷ ${e.velocity} per sprint = <b>${e.sprints} sprint${e.sprints === 1 ? '' : 's'}</b> (${e.sprints * e.sprintWeeks} weeks)${e.agileEnd ? `, finishing about <b>${esc(e.agileEnd)}</b>` : ''}.</p>` : '<p class="muted" style="margin:0">Enter the team velocity to forecast sprints from the backlog\'s story points.</p>'}
        <div class="row" style="margin-top:16px"><button class="btn primary" data-bc ${e.total ? '' : 'disabled'}>Use as delivery cost in the business case</button></div>
      </section>
    </div>
    ${e.phases.length ? `<section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Schedule by phase</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Phase</th><th class="num">Effort (days)</th><th class="num">Duration (working days)</th><th>Start</th><th>End</th><th class="num">Labour cost</th></tr></thead><tbody>
      ${e.phases.map((ph) => `<tr><td><b>${esc(ph.phase)}</b></td><td class="num">${d1(ph.effort)}</td><td class="num">${ph.days}</td><td>${esc(ph.start || '—')}</td><td>${esc(ph.end || '—')}</td><td class="num">${m(ph.cost)}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td class="num"><b>${d1(e.effort)}</b></td><td class="num"><b>${e.durationDays}</b></td><td>${esc(e.startDate || '—')}</td><td>${esc(e.endDate || '—')}</td><td class="num"><b>${m(e.labour)}</b></td></tr>
    </tbody></table></div></section>` : ''}
    ${p.rates.length ? '' : `<div class="callout" style="margin-top:16px"><b>Start here:</b> add the roles on the team and their day rates, then estimate each piece of work. <button class="btn sm primary" data-starter style="margin-left:8px">Add typical roles</button> <span class="small muted">(BA, architect, developer, tester, project manager — change the rates to yours)</span></div>`}
    <div data-rates style="margin-top:16px"></div>
    <div data-items style="margin-top:16px"></div>`;

  const box = $('[data-est]', root);
  const save = () => update((pr) => {
    for (const el of $$('[data-k]', box)) pr.estimate[el.dataset.k] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    pr.estimate.workDays = $$('[data-wd]', box).filter((c) => c.checked).map((c) => +c.dataset.wd);
  });
  box.addEventListener('change', save);
  $('[data-bc]', root).onclick = () => update((pr) => {
    const item = { kind: 'Cost', year: 0, item: 'Delivery (from cost & time estimate)', category: 'People', amount: Math.round(e.total), notes: `${d1(e.effort)} person-days, ${Math.round(e.contingency * 100)}% contingency` };
    const i = pr.financials.findIndex((f) => f.fromEstimate);
    if (i >= 0) pr.financials[i] = { ...pr.financials[i], ...item, fromEstimate: true };
    else pr.financials.push({ id: uid('fin'), ...item, fromEstimate: true });
    toast('Business case updated');
  });
  $('[data-starter]', root)?.addEventListener('click', () => update((pr) => {
    pr.rates.push(
      { id: uid('rat'), role: 'Business analyst', dayRate: 7000, fte: 1 },
      { id: uid('rat'), role: 'Solution architect', dayRate: 10000, fte: 0.5 },
      { id: uid('rat'), role: 'Developer', dayRate: 8000, fte: 3 },
      { id: uid('rat'), role: 'Tester', dayRate: 6000, fte: 1 },
      { id: uid('rat'), role: 'Project manager', dayRate: 8500, fte: 0.5 },
    );
  }));
  renderCollection($('[data-rates]', root), 'rates', { heading: false, addLabel: 'Add role' });
  renderCollection($('[data-items]', root), 'workItems', { heading: false, addLabel: 'Add work item' });
}
