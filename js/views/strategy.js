// SWOT quadrant + PESTLE board, each backed by an editable list.
import { project } from '../store.js';
import { esc, $ } from '../ui.js';
import { renderCollection, openItem } from './collection.js';

export function renderStrategy(root) {
  const p = project();
  const q = (cat, cls) => `<div class="${cls}"><div class="row"><h3>${cat}s</h3><span class="grow"></span><button class="btn sm ghost" data-new="${cat}">+ Add</button></div><ul>${p.swot.filter((x) => x.category === cat).map((x) => `<li><a href="#" data-edit="${x.id}">${esc(x.text)}</a></li>`).join('') || '<li class="muted">None yet</li>'}</ul></div>`;
  const factors = ['Political', 'Economic', 'Social', 'Technological', 'Legal', 'Environmental'];
  root.innerHTML = `
    <div class="page-head"><div><h1>SWOT & PESTLE</h1><p>Internal strengths and weaknesses, external opportunities and threats, and the macro-environment (Political, Economic, Social, Technological, Legal, Environmental).</p></div><span class="grow"></span><a class="btn" href="#/docs/strategy">Strategy document</a></div>
    <section class="card"><h2 style="margin-bottom:10px">SWOT</h2>
      <div class="quad">${q('Strength', 'q-s')}${q('Weakness', 'q-w')}${q('Opportunity', 'q-o')}${q('Threat', 'q-t')}</div>
      <p class="muted small" style="margin-top:8px">Internal (top) · External (bottom). Turn strengths into opportunities (SO), use strengths against threats (ST), fix weaknesses using opportunities (WO), avoid WT.</p>
    </section>
    <section class="card"><h2 style="margin-bottom:10px">PESTLE</h2>
      <div class="grid g3">${factors.map((f) => `<div class="card" style="box-shadow:none"><div class="row"><h3>${f}</h3><span class="grow"></span><button class="btn sm ghost" data-pnew="${f}">+</button></div><ul style="padding-left:18px;margin:6px 0 0">${p.pestle.filter((x) => x.factor === f).map((x) => `<li><a href="#" data-pedit="${x.id}">${esc(x.text)}</a> <span class="muted small">(${esc(x.impact || '')})</span></li>`).join('') || '<li class="muted">None yet</li>'}</ul></div>`).join('')}</div>
    </section>
    <div data-list style="margin-top:16px"></div>`;
  root.querySelectorAll('[data-new]').forEach((b) => (b.onclick = () => openItem('swot', null, { category: b.dataset.new })));
  root.querySelectorAll('[data-edit]').forEach((a) => (a.onclick = (e) => (e.preventDefault(), openItem('swot', a.dataset.edit))));
  root.querySelectorAll('[data-pnew]').forEach((b) => (b.onclick = () => openItem('pestle', null, { factor: b.dataset.pnew })));
  root.querySelectorAll('[data-pedit]').forEach((a) => (a.onclick = (e) => (e.preventDefault(), openItem('pestle', a.dataset.pedit))));
  renderCollection($('[data-list]', root), 'pestle', { heading: false });
}
