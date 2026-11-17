// Business case: options, cost/benefit items, NPV / ROI / payback calculator.
import { project, update } from '../store.js';
import { esc, $ } from '../ui.js';
import { businessCase } from '../model.js';
import { renderCollection } from './collection.js';

export function renderBusinessCase(root) {
  const p = project();
  const bc = businessCase(p);
  const cur = p.businessCase.currency || '';
  const m = (n) => `${cur} ${Math.round(n).toLocaleString()}`;
  const maxAbs = Math.max(1, ...bc.rows.map((r) => Math.abs(r.cum)));
  root.innerHTML = `
    <div class="page-head"><div><h1>Business case</h1><p>Compare options and quantify costs and benefits. Net present value, ROI and payback are calculated for you.</p></div><span class="grow"></span><a class="btn" href="#/docs/businesscase">Business case document</a></div>
    <div class="grid g4">
      <div class="stat"><b style="color:${bc.npv >= 0 ? 'var(--ok)' : 'var(--err)'}">${m(bc.npv)}</b><span>Net present value @ ${(bc.rate * 100).toFixed(1)}%</span></div>
      <div class="stat"><b>${bc.roi.toFixed(1)}%</b><span>Return on investment</span></div>
      <div class="stat"><b>${bc.paybackExact === null ? '—' : `${bc.paybackExact.toFixed(1)} yrs`}</b><span>Payback${bc.discountedPayback === null ? '' : ` · discounted ${bc.discountedPayback.toFixed(1)} yrs`}</span></div>
      <div class="stat"><b>${bc.irr === null ? '—' : `${(bc.irr * 100).toFixed(1)}%`}</b><span>Internal rate of return · net ${m(bc.totalBen - bc.totalCost)}</span></div>
    </div>
    ${bc.outside.length ? `<div class="callout warn" style="margin-top:16px">${bc.outside.length} item(s) fall outside the ${bc.years}-year horizon (or use a part year) and are not counted: ${bc.outside.map((f) => esc(`${f.item} (year ${f.year})`)).join(', ')}. Increase the horizon or use whole years 0–${bc.years}.</div>` : ''}
    <div class="grid g2" style="margin-top:16px">
      <section class="card">
        <h2 style="margin-bottom:10px">Assumptions</h2>
        <div class="form" data-bc>
          <label class="field"><span>Discount rate %</span><input type="number" step="0.1" data-k="discountRate" value="${esc(p.businessCase.discountRate)}"></label>
          <label class="field"><span>Horizon (years)</span><input type="number" min="1" max="10" data-k="years" value="${esc(p.businessCase.years)}"></label>
          <label class="field"><span>Currency symbol</span><input type="text" data-k="currency" value="${esc(cur)}"></label>
          <span></span>
          <label class="field full"><span>Options considered (one per line)</span><textarea rows="4" data-k="options">${esc(p.businessCase.options)}</textarea></label>
          <label class="field full"><span>Recommendation</span><textarea rows="3" data-k="recommendation">${esc(p.businessCase.recommendation)}</textarea></label>
        </div>
      </section>
      <section class="card flush">
        <div class="card-head"><h2>Cash flow</h2></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Year</th><th class="num">Costs</th><th class="num">Benefits</th><th class="num">Net</th><th class="num">PV</th><th class="num">Cumulative</th><th style="width:120px"></th></tr></thead><tbody>
        ${bc.rows.map((r) => `<tr><td>${r.year}</td><td class="num">${Math.round(r.cost).toLocaleString()}</td><td class="num">${Math.round(r.ben).toLocaleString()}</td><td class="num">${Math.round(r.net).toLocaleString()}</td><td class="num">${Math.round(r.pv).toLocaleString()}</td><td class="num"><b style="color:${r.cum >= 0 ? 'var(--ok)' : 'var(--err)'}">${Math.round(r.cum).toLocaleString()}</b></td><td><div style="display:flex;height:10px"><div style="flex:1;display:flex;justify-content:flex-end">${r.cum < 0 ? `<i style="display:block;background:var(--err);width:${(Math.abs(r.cum) / maxAbs) * 100}%"></i>` : ''}</div><div style="flex:1">${r.cum >= 0 ? `<i style="display:block;height:10px;background:var(--ok);width:${(r.cum / maxAbs) * 100}%"></i>` : ''}</div></div></td></tr>`).join('')}
        </tbody></table></div>
      </section>
    </div>
    <div data-list style="margin-top:16px"></div>`;
  const box = $('[data-bc]', root);
  let t;
  const save = (rerender) => update((pr) => {
    for (const el of box.querySelectorAll('[data-k]')) pr.businessCase[el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value;
  }, { quiet: !rerender, typing: true });
  box.addEventListener('input', (e) => (clearTimeout(t), (t = setTimeout(() => save(false), 300)), void e));
  box.addEventListener('change', (e) => save(e.target.type === 'number' || e.target.dataset.k === 'currency'));
  renderCollection($('[data-list]', root), 'financials', { heading: false });
}
