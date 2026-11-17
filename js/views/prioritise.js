// Prioritisation: inline MoSCoW / RICE / WSJF scoring with ranking and a value-vs-effort chart.
import { project, update } from '../store.js';
import { esc, $, $$ } from '../ui.js';
import { MOSCOW, rice, wsjf } from '../model.js';
import { valueEffort } from '../gen/diagrams.js';
import { render } from '../mermaid.js';

let sortBy = 'wsjf';

export function renderPrioritise(root) {
  const p = project();
  const rows = [...p.stories].sort((a, b) => (sortBy === 'rice' ? rice(b) - rice(a) : sortBy === 'wsjf' ? wsjf(b) - wsjf(a) : MOSCOW.indexOf(a.priority) - MOSCOW.indexOf(b.priority)));
  const num = (s, k, w = 64) => `<input type="number" step="any" data-id="${s.id}" data-k="${k}" value="${esc(s[k] ?? '')}" style="width:${w}px" aria-label="${k} for ${esc(s.code)}">`;
  const moscow = MOSCOW.map((m) => [m, p.stories.filter((s) => s.priority === m)]);
  root.innerHTML = `
    <div class="page-head"><div><h1>Prioritisation</h1><p>Score backlog items with MoSCoW, RICE (Reach × Impact × Confidence ÷ Effort) and WSJF ((Business value + Time criticality + Risk reduction) ÷ Job size). Edit scores inline.</p></div></div>
    <div class="grid g4">${moscow.map(([m, list]) => `<div class="stat"><b>${list.length}</b><span>${esc(m)} · ${list.reduce((a, s) => a + (+s.points || 0), 0)} pts</span></div>`).join('')}</div>
    <section class="card flush" style="margin-top:16px">
      <div class="card-head"><h2>Scoring</h2><span class="grow"></span><span class="muted small">Rank by</span>
        <div class="tabs" style="margin:0;border:0">${[['wsjf', 'WSJF'], ['rice', 'RICE'], ['moscow', 'MoSCoW']].map(([k, l]) => `<button class="${sortBy === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Story</th><th>MoSCoW</th><th>Reach</th><th>Impact</th><th>Conf %</th><th>Effort</th><th class="num">RICE</th><th>BV</th><th>TC</th><th>RR</th><th>Size</th><th class="num">WSJF</th></tr></thead><tbody>
      ${rows.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.code)}</b> <span class="small">${esc(s.iWant)}</span></td>
        <td><select data-id="${s.id}" data-k="priority" style="width:96px">${MOSCOW.map((m) => `<option ${s.priority === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></td>
        <td>${num(s, 'reach', 80)}</td><td>${num(s, 'impact', 56)}</td><td>${num(s, 'confidence', 56)}</td><td>${num(s, 'effort', 56)}</td><td class="num score">${rice(s)}</td>
        <td>${num(s, 'bv', 50)}</td><td>${num(s, 'tc', 50)}</td><td>${num(s, 'rr', 50)}</td><td>${num(s, 'jobSize', 50)}</td><td class="num score">${wsjf(s)}</td></tr>`).join('') || '<tr><td colspan="13" class="empty">Add user stories to prioritise them.</td></tr>'}
      </tbody></table></div>
    </section>
    <section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Value vs effort</h2><span class="muted small">Value = BV + TC + RR · Effort = job size</span></div><div class="stage" data-chart>Drawing…</div></section>`;
  $$('[data-sort]', root).forEach((b) => (b.onclick = () => ((sortBy = b.dataset.sort), renderPrioritise(root))));
  $$('[data-k]', root).forEach((el) => (el.onchange = () => update((pr) => {
    const s = pr.stories.find((x) => x.id === el.dataset.id);
    if (s) s[el.dataset.k] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
  })));
  render(valueEffort(p)).then((svg) => ($('[data-chart]', root).innerHTML = svg)).catch((e) => ($('[data-chart]', root).innerHTML = `<div class="err">${esc(e.message)}</div>`));
}
