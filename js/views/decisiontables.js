// Decision tables: the list plus a rendered grid for each table, with completeness checks.
import { project } from '../store.js';
import { esc, $ } from '../ui.js';
import { renderCollection, openItem } from './collection.js';

const split = (s) => String(s || '').split(',').map((x) => x.trim());

/** Find combinations of Y/N condition values that no rule covers (only for pure Y/N tables, ≤ 8 conditions). */
export function missingCombos(dt) {
  const n = (dt.conditions || []).length;
  if (!n || n > 8) return [];
  const rules = (dt.rows || []).map((r) => split(r.when));
  if (rules.some((r) => r.some((v) => v && !/^[YN-]$/i.test(v)))) return [];
  const out = [];
  for (let m = 0; m < 2 ** n; m++) {
    const combo = [...Array(n)].map((_, k) => ((m >> (n - 1 - k)) & 1 ? 'N' : 'Y'));
    const hit = rules.some((r) => combo.every((v, k) => !r[k] || r[k] === '-' || r[k].toUpperCase() === v));
    if (!hit) out.push(combo.join(', '));
  }
  return out;
}

export function renderDecisionTables(root) {
  const p = project();
  root.innerHTML = `
    <div class="page-head"><div><h1>Decision tables</h1><p>Model complex business logic as conditions × rules × actions. Rules are checked for missing combinations.</p></div></div>
    ${p.decisionTables.map((dt) => {
      const rows = dt.rows || [];
      const miss = missingCombos(dt);
      return `<section class="card flush"><div class="card-head"><h2>${esc(dt.code)} ${esc(dt.name)}</h2><span class="grow"></span><a class="btn sm" href="#/diagrams/${encodeURIComponent(`decision:${dt.id}`)}">Flow diagram</a><button class="btn sm" data-edit="${dt.id}">Edit</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th>${rows.map((_, i) => `<th style="text-align:center">Rule ${i + 1}</th>`).join('')}</tr></thead><tbody>
        ${(dt.conditions || []).map((c, k) => `<tr><td><b>If</b> ${esc(c)}</td>${rows.map((r) => `<td style="text-align:center">${esc(split(r.when)[k] || '-')}</td>`).join('')}</tr>`).join('')}
        ${(dt.actions || []).map((a, k) => `<tr style="background:var(--surface-2)"><td><b>Then</b> ${esc(a)}</td>${rows.map((r) => `<td style="text-align:center;font-weight:700">${esc(split(r.then)[k] || '-')}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        ${miss.length ? `<div class="callout warn" style="margin:12px">No rule covers: ${miss.slice(0, 8).map((m) => `<code>${esc(m)}</code>`).join(' ')}${miss.length > 8 ? ` and ${miss.length - 8} more` : ''}</div>` : (dt.conditions || []).length ? '<div class="callout" style="margin:12px">✓ Every Y/N combination is covered.</div>' : ''}
      </section>`;
    }).join('')}
    <div data-list style="margin-top:16px"></div>`;
  root.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openItem('decisionTables', b.dataset.edit)));
  renderCollection($('[data-list]', root), 'decisionTables', { heading: false });
}
