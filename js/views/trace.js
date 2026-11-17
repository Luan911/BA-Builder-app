// Traceability: full RTM, coverage summary, objective × requirement matrix, impact explorer.
import { project } from '../store.js';
import { esc, $, pill, autoPill, download, fileSafe } from '../ui.js';
import { rtmRows, rtmCsv } from '../gen/exports.js';
import { openItem } from './collection.js';

export function renderTrace(root) {
  const p = project();
  const rows = rtmRows(p);
  const solution = rows.filter((x) => !['Business', 'Stakeholder', 'Transition'].includes(x.r.type));
  const covered = solution.filter((x) => x.covered).length;
  const orphan = rows.filter((x) => !x.objectives.length && !x.parents.length && x.r.type !== 'Business');
  const noStory = solution.filter((x) => !x.stories.length && !x.usecases.length);
  const list = (a) => (a.length ? a.map((x) => pill(x)).join(' ') : '<span class="muted">—</span>');
  root.innerHTML = `
    <div class="page-head"><div><h1>Traceability</h1><p>Every requirement traced back to objectives and sources, and forward to use cases, stories, rules, APIs and tests.</p></div><span class="grow"></span><button class="btn" data-csv>Export RTM (CSV)</button><a class="btn" href="#/diagrams/trace">Trace graph</a></div>
    <div class="grid g4">
      <div class="stat"><b>${solution.length ? Math.round((covered / solution.length) * 100) : 0}%</b><span>Solution requirements with tests</span></div>
      <div class="stat"><b>${orphan.length}</b><span>Not traced to an objective or parent</span></div>
      <div class="stat"><b>${noStory.length}</b><span>Solution requirements with no story or use case</span></div>
      <div class="stat"><b>${p.stories.filter((s) => !(s.requirementIds || []).length).length}</b><span>Stories without a requirement</span></div>
    </div>
    <section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Requirements traceability matrix</h2></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Req</th><th>Status</th><th>Objectives</th><th>Derived from</th><th>Use cases</th><th>Stories</th><th>Rules</th><th>APIs</th><th>Tests</th></tr></thead><tbody>
      ${rows.map((x) => `<tr class="click" data-id="${x.r.id}"><td><b>${esc(x.r.code)}</b><div class="small muted">${esc(x.r.title)}</div></td><td>${autoPill(x.r.status)}</td><td>${list(x.objectives)}</td><td>${list(x.parents)}</td><td>${list(x.usecases)}</td><td>${list(x.stories)}</td><td>${list(x.rules)}</td><td class="small">${esc(x.apis.join(', ')) || '—'}</td><td>${x.tests.length ? x.tests.map((t) => pill(t, /Passed/.test(t) ? 'ok' : /Failed|Blocked/.test(t) ? 'err' : '')).join(' ') : pill('No tests', ['Business', 'Stakeholder', 'Transition'].includes(x.r.type) ? '' : 'err')}</td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Objective coverage matrix</h2></div>
      <div class="tbl-wrap"><table class="tbl heat"><thead><tr><th>Requirement</th>${p.objectives.map((o) => `<th title="${esc(o.title)}">${esc(o.code)}</th>`).join('')}</tr></thead><tbody>
      ${p.requirements.map((r) => `<tr><td><b>${esc(r.code)}</b> <span class="small">${esc(r.title)}</span></td>${p.objectives.map((o) => `<td class="cell">${(r.objectiveIds || []).includes(o.id) ? '●' : ''}</td>`).join('')}</tr>`).join('')}
      <tr><td class="muted">Requirements per objective</td>${p.objectives.map((o) => { const n = p.requirements.filter((r) => (r.objectiveIds || []).includes(o.id)).length; return `<td class="cell" style="color:${n ? 'var(--ok)' : 'var(--err)'}">${n}</td>`; }).join('')}</tr>
      </tbody></table></div></section>
    <section class="card" style="margin-top:16px"><h2>Impact analysis</h2><p class="muted small">Pick a requirement to see everything that would be affected by changing it.</p>
      <select data-impact style="max-width:420px"><option value="">Choose a requirement…</option>${p.requirements.map((r) => `<option value="${r.id}">${esc(r.code)} ${esc(r.title)}</option>`).join('')}</select>
      <div data-out style="margin-top:12px"></div></section>`;
  root.querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => openItem('requirements', tr.dataset.id)));
  $('[data-csv]', root).onclick = () => download(rtmCsv(p), `${fileSafe(p.meta.code || 'project')}_RTM.csv`, 'text/csv');
  $('[data-impact]', root).onchange = (e) => {
    const id = e.target.value;
    const out = $('[data-out]', root);
    if (!id) return (out.innerHTML = '');
    const children = p.requirements.filter((r) => (r.parentIds || []).includes(id));
    const hit = [
      ['Derived requirements', children.map((r) => r.code)],
      ['Use cases', p.usecases.filter((u) => (u.requirementIds || []).includes(id)).map((u) => u.code)],
      ['User stories', p.stories.filter((s) => (s.requirementIds || []).includes(id)).map((s) => s.code)],
      ['Business rules', p.rules.filter((b) => (b.requirementIds || []).includes(id)).map((b) => b.code)],
      ['API endpoints', p.apis.filter((a) => (a.requirementIds || []).includes(id)).map((a) => `${a.method} ${a.path}`)],
      ['Test cases', p.tests.filter((t) => (t.requirementIds || []).includes(id)).map((t) => t.code)],
      ['Gaps', p.gaps.filter((g) => (g.requirementIds || []).includes(id)).map((g) => g.code)],
      ['Change requests', p.changes.filter((c) => (c.requirementIds || []).includes(id)).map((c) => c.code)],
    ];
    out.innerHTML = `<table class="tbl"><tbody>${hit.map(([k, v]) => `<tr><td style="width:200px"><b>${k}</b></td><td>${list(v)}</td></tr>`).join('')}</tbody></table>`;
  };
}
