// Stakeholders: power/interest grid, editable RACI matrix and the register.
import { project, update } from '../store.js';
import { esc, $, $$, toast } from '../ui.js';
import { renderCollection, openItem } from './collection.js';

export function renderStakeholders(root) {
  const p = project();
  const hi = (v) => v === 'High';
  const cell = (fn) => p.stakeholders.filter(fn).map((s) => `<li><a href="#" data-edit="${s.id}">${esc(s.name)}</a> <span class="muted small">${esc(s.role || '')}</span></li>`).join('') || '<li class="muted">—</li>';
  const quads = [
    ['Keep satisfied', 'High power · low interest', (s) => hi(s.power) && !hi(s.interest), 'q-o'],
    ['Manage closely', 'High power · high interest', (s) => hi(s.power) && hi(s.interest), 'q-s'],
    ['Monitor', 'Lower power · low interest', (s) => !hi(s.power) && !hi(s.interest), 'q-w'],
    ['Keep informed', 'Lower power · high interest', (s) => !hi(s.power) && hi(s.interest), 'q-t'],
  ];
  const ROLES = ['', 'R', 'A', 'C', 'I'];
  root.innerHTML = `
    <div class="page-head"><div><h1>Stakeholders & RACI</h1><p>Identify and analyse stakeholders, decide how to engage each, and agree who is Responsible, Accountable, Consulted and Informed for each deliverable.</p></div><span class="grow"></span><a class="btn" href="#/docs/stakeholders">Engagement plan</a></div>
    <section class="card"><h2 style="margin-bottom:10px">Power / interest grid</h2>
      <div class="quad">${quads.map(([t, sub, fn, cls]) => `<div class="${cls}"><h3>${t}</h3><div class="muted small" style="margin-bottom:6px">${sub}</div><ul>${cell(fn)}</ul></div>`).join('')}</div>
    </section>
    <section class="card flush"><div class="card-head"><h2>RACI matrix</h2><span class="grow"></span><input type="text" placeholder="New deliverable / activity" data-newd style="max-width:240px"><button class="btn sm" data-addd>+ Add row</button></div>
      ${p.stakeholders.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Deliverable / activity</th>${p.stakeholders.map((s) => `<th title="${esc(s.role || '')}">${esc(s.name)}</th>`).join('')}<th></th></tr></thead><tbody>
      ${p.raciItems.map((d, i) => {
        const row = p.raci[d] || {};
        const a = Object.values(row).filter((v) => v === 'A').length;
        return `<tr><td><b>${esc(d)}</b>${a !== 1 ? `<div class="small" style="color:var(--warn)">${a ? 'More than one A' : 'No one Accountable'}</div>` : ''}</td>${p.stakeholders.map((s) => `<td><select data-raci="${i}" data-s="${s.id}" aria-label="${esc(d)} — ${esc(s.name)}">${ROLES.map((r) => `<option ${row[s.id] === r ? 'selected' : ''}>${r}</option>`).join('')}</select></td>`).join('')}<td><button class="icon-btn" data-deld="${i}" aria-label="Remove row">✕</button></td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="empty">Add stakeholders to build the RACI matrix.</div>'}
    </section>
    <div data-list style="margin-top:16px"></div>`;

  $$('[data-edit]', root).forEach((a) => (a.onclick = (e) => (e.preventDefault(), openItem('stakeholders', a.dataset.edit))));
  $$('[data-raci]', root).forEach((s) => (s.onchange = () => update((pr) => {
    const d = pr.raciItems[+s.dataset.raci];
    pr.raci[d] = { ...(pr.raci[d] || {}), [s.dataset.s]: s.value };
    if (!s.value) delete pr.raci[d][s.dataset.s];
  })));
  $('[data-addd]', root).onclick = () => {
    const v = $('[data-newd]', root).value.trim();
    if (!v) return toast('Type a deliverable name first', 'err');
    if (p.raciItems.includes(v)) return toast('That row already exists', 'err');
    update((pr) => pr.raciItems.push(v));
  };
  $$('[data-deld]', root).forEach((b) => (b.onclick = () => update((pr) => {
    const [d] = pr.raciItems.splice(+b.dataset.deld, 1);
    delete pr.raci[d];
  })));
  renderCollection($('[data-list]', root), 'stakeholders', { heading: false });
}
