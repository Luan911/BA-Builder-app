// Screens for BABOK techniques that need their own layout: Business Model Canvas, Business
// Analysis Plan, Roles & Permissions Matrix and Vendor Assessment (weighted scoring).
import { project, update } from '../store.js';
import { esc, $, $$, toast } from '../ui.js';
import { uid, vendorScores } from '../model.js';

// ---------- Business Model Canvas ----------
const BMC = [
  ['partners', 'Key partners', 'Who helps us deliver? Suppliers, alliances.'],
  ['activities', 'Key activities', 'What must we do well to deliver the value?'],
  ['resources', 'Key resources', 'People, systems, data, brand, money we rely on.'],
  ['value', 'Value propositions', 'Which customer problem do we solve, and why us?'],
  ['relationships', 'Customer relationships', 'Self-service, personal, community, automated…'],
  ['channels', 'Channels', 'How customers find, buy and get the value.'],
  ['segments', 'Customer segments', 'Who are we creating value for?'],
  ['costs', 'Cost structure', 'The most important costs of this model.'],
  ['revenue', 'Revenue streams', 'What customers pay for, and how.'],
];
export const BMC_BLOCKS = BMC;

export function renderBmc(root) {
  const p = project();
  root.innerHTML = `
    <div class="page-head"><div><h1>Business Model Canvas</h1><p>Nine building blocks describing how the organisation creates, delivers and captures value. Use it to understand the business before changing it, and to test how a change affects the model. One item per line.</p></div></div>
    <div class="bmc">${BMC.map(([k, t, hint]) => `<section class="card bmc-${k}"><h3 style="margin:0 0 2px">${esc(t)}</h3><p class="small muted" style="margin:0 0 6px">${esc(hint)}</p><textarea data-k="${k}" rows="6" style="width:100%">${esc((p.bmc[k] || []).join('\n'))}</textarea></section>`).join('')}</div>
    <p class="small muted">Canvas by Strategyzer (CC BY-SA). Saved automatically; included in the Strategy Analysis document.</p>`;
  let t;
  $$('[data-k]', root).forEach((ta) => ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => update((pr) => { pr.bmc[ta.dataset.k] = ta.value.split('\n').map((x) => x.trim()).filter(Boolean); }, { quiet: true, typing: true }), 400); }));
}

// ---------- Business Analysis Plan ----------
const PLAN = [
  ['approach', 'Approach', 'select', ['Predictive (plan-driven)', 'Adaptive (Agile)', 'Hybrid']],
  ['approachWhy', 'Why this approach', 'textarea', 'e.g. Requirements are expected to change; the business can review every two weeks.'],
  ['engagement', 'Stakeholder engagement', 'textarea', 'How and how often each stakeholder group is involved (see Stakeholders & RACI).'],
  ['governance', 'Decision making & approvals', 'textarea', 'Who decides what, and how disagreements are escalated.'],
  ['approvers', 'Who signs off requirements', 'text', 'e.g. Head of Retail Lending (sponsor), Credit Risk Manager'],
  ['changeControl', 'Change control', 'textarea', 'How a change is requested, analysed for impact, approved and communicated.'],
  ['information', 'Information management', 'textarea', 'Where requirements and models live, naming, versioning and access.'],
  ['traceability', 'Traceability approach', 'textarea', 'What is traced (objective → requirement → story → test) and how it is kept current.'],
  ['tools', 'Tools', 'text', 'e.g. BA Builder, Jira, Confluence'],
  ['schedule', 'BA activities & timing', 'textarea', 'Elicitation, analysis, reviews and sign-off points across the project.'],
  ['metrics', 'How BA performance is measured', 'textarea', 'e.g. % requirements passing quality checks, defects traced to requirements, rework.'],
];
export const PLAN_FIELDS = PLAN;

export function renderBaPlan(root) {
  const p = project();
  const v = p.baPlan;
  root.innerHTML = `
    <div class="page-head"><div><h1>Business analysis plan</h1><p>How the analysis will be done: approach, stakeholder engagement, governance, information management and how BA performance is measured (BABOK: Business Analysis Planning & Monitoring).</p></div><span class="grow"></span><a class="btn" href="#/docs/baplan">BA plan document</a></div>
    <section class="card"><div class="form">${PLAN.map(([k, label, type, extra]) => `<label class="field ${type === 'textarea' ? 'full' : ''}"><span>${esc(label)}</span>${type === 'select' ? `<select data-k="${k}">${extra.map((o) => `<option ${v[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : type === 'textarea' ? `<textarea data-k="${k}" rows="3" placeholder="${esc(extra)}">${esc(v[k] || '')}</textarea>` : `<input type="text" data-k="${k}" value="${esc(v[k] || '')}" placeholder="${esc(extra)}">`}</label>`).join('')}</div></section>`;
  let t;
  const save = () => update((pr) => { for (const el of $$('[data-k]', root)) pr.baPlan[el.dataset.k] = el.value; }, { quiet: true, typing: true });
  root.addEventListener('input', () => { clearTimeout(t); t = setTimeout(save, 400); });
  root.addEventListener('change', save);
}

// ---------- Roles & permissions matrix ----------
const CRUD = ['C', 'R', 'U', 'D'];
export function renderPermissions(root) {
  const p = project();
  const roles = p.personas.filter((x) => x.kind !== 'System');
  const perm = p.permissions;
  const has = (r, k, letter) => (letter ? String(perm[r]?.[k] || '').includes(letter) : !!perm[r]?.[k]);
  root.innerHTML = `
    <div class="page-head"><div><h1>Roles & permissions</h1><p>Who may do what. Tick the use cases each role can perform, and the data each role can Create, Read, Update or Delete. Gaps and over-wide access show up straight away — and the matrix goes into the SRS security section.</p></div></div>
    ${roles.length ? `
    <section class="card flush"><div class="card-head"><h2>Functions (use cases)</h2></div>${p.usecases.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Use case</th>${roles.map((r) => `<th style="text-align:center">${esc(r.name)}</th>`).join('')}</tr></thead><tbody>
      ${p.usecases.map((u) => `<tr><td><b>${esc(u.code)}</b> ${esc(u.name)}</td>${roles.map((r) => `<td style="text-align:center"><input type="checkbox" data-r="${esc(r.id)}" data-k="uc:${esc(u.id)}" ${has(r.id, `uc:${u.id}`) ? 'checked' : ''} aria-label="${esc(r.name)} can ${esc(u.name)}"></td>`).join('')}</tr>`).join('')}
    </tbody></table></div>` : '<p class="muted" style="padding:0 16px 12px">Add use cases to fill this part.</p>'}</section>
    <section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Data (CRUD)</h2></div>${p.entities.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Entity</th>${roles.map((r) => `<th style="text-align:center">${esc(r.name)}</th>`).join('')}</tr></thead><tbody>
      ${p.entities.map((e) => `<tr><td><b>${esc(e.name)}</b>${/PII|Sensitive/.test(e.classification || '') ? ' <span class="pill warn">' + esc(e.classification) + '</span>' : ''}</td>${roles.map((r) => `<td style="text-align:center;white-space:nowrap">${CRUD.map((l) => `<label class="small" title="${{ C: 'Create', R: 'Read', U: 'Update', D: 'Delete' }[l]}"><input type="checkbox" data-r="${esc(r.id)}" data-k="en:${esc(e.id)}" data-l="${l}" ${has(r.id, `en:${e.id}`, l) ? 'checked' : ''}>${l}</label>`).join(' ')}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>` : '<p class="muted" style="padding:0 16px 12px">Add entities to fill this part.</p>'}</section>
    <div data-checks style="margin-top:16px"></div>` : '<div class="empty">Add human user types under <a href="#/c/personas">Personas & actors</a> first.</div>'}`;
  const checks = () => {
    const pr = project();
    const out = [];
    for (const u of pr.usecases) if (!roles.some((r) => pr.permissions[r.id]?.[`uc:${u.id}`])) out.push(`${u.code} ${u.name}: no role can perform it`);
    for (const e of pr.entities) {
      const deleters = roles.filter((r) => String(pr.permissions[r.id]?.[`en:${e.id}`] || '').includes('D'));
      if (/PII|Sensitive/.test(e.classification || '') && deleters.length > 1) out.push(`${e.name} holds ${e.classification} data and ${deleters.length} roles can delete it — is that intended?`);
      if (!roles.some((r) => String(pr.permissions[r.id]?.[`en:${e.id}`] || '').includes('C'))) out.push(`${e.name}: no role creates it (is it created by the system or an integration?)`);
    }
    const box = $('[data-checks]', root);
    if (box) box.innerHTML = out.length ? `<div class="callout warn"><b>Check these</b><ul class="lint">${out.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '<div class="callout">✓ Every use case has a role and every entity has a creator.</div>';
  };
  checks();
  $$('input[data-r]', root).forEach((c) => (c.onchange = () => {
    update((pr) => {
      const m = (pr.permissions[c.dataset.r] ||= {});
      if (c.dataset.l) {
        const cur = new Set(String(m[c.dataset.k] || '').split(''));
        if (c.checked) cur.add(c.dataset.l); else cur.delete(c.dataset.l);
        m[c.dataset.k] = CRUD.filter((l) => cur.has(l)).join('');
        if (!m[c.dataset.k]) delete m[c.dataset.k];
      } else if (c.checked) m[c.dataset.k] = true;
      else delete m[c.dataset.k];
    }, { quiet: true });
    checks();
  }));
}

// ---------- Vendor / option assessment ----------
export function renderVendors(root) {
  const p = project();
  const v = p.vendors;
  const ranked = vendorScores(v);
  const totalW = v.criteria.reduce((a, c) => a + (+c.weight || 0), 0);
  root.innerHTML = `
    <div class="page-head"><div><h1>Vendor & option assessment</h1><p>Compare vendors or solution options against weighted criteria. Agree the criteria and weights <i>before</i> scoring, score each option from 1 (poor) to 5 (excellent), and let the weighted total guide — not replace — the decision.</p></div></div>
    <div class="grid g2">
      <section class="card flush"><div class="card-head"><h2>Criteria</h2><span class="grow"></span><span class="small ${totalW === 100 ? 'muted' : ''}" style="${totalW && totalW !== 100 ? 'color:var(--red-2)' : ''}">Weights total ${totalW}%${totalW && totalW !== 100 ? ' (aim for 100)' : ''}</span><button class="btn sm" data-addc>+ Criterion</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Criterion</th><th class="num" style="width:110px">Weight %</th><th style="width:40px"></th></tr></thead><tbody>
        ${v.criteria.map((c) => `<tr><td><input type="text" data-cn="${esc(c.id)}" value="${esc(c.name)}" placeholder="e.g. Fit to requirements"></td><td><input type="number" min="0" max="100" data-cw="${esc(c.id)}" value="${esc(c.weight ?? '')}"></td><td><button class="btn sm ghost" data-delc="${esc(c.id)}" aria-label="Remove criterion">✕</button></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Add criteria such as fit to requirements, total cost of ownership, vendor stability, security, support, time to implement.</td></tr>'}
        </tbody></table></div></section>
      <section class="card"><h2 style="margin-bottom:8px">Ranking</h2>${ranked.length ? `<table class="tbl"><tbody>${ranked.map((r, i) => `<tr><td style="width:30px"><b>${i + 1}</b></td><td>${esc(r.option.name || 'Unnamed')}${r.complete ? '' : ' <span class="pill warn">not fully scored</span>'}</td><td class="num"><b>${r.score.toFixed(2)}</b> / 5</td><td style="width:120px"><div class="bar"><i style="width:${r.percent.toFixed(0)}%"></i></div></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Add options to compare.</p>'}</section>
    </div>
    <section class="card flush" style="margin-top:16px"><div class="card-head"><h2>Scores (1–5)</h2><span class="grow"></span><button class="btn sm primary" data-addo>+ Option / vendor</button></div>
      ${v.options.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Option</th>${v.criteria.map((c) => `<th class="num">${esc(c.name || '?')} <span class="muted small">${esc(c.weight ?? 0)}%</span></th>`).join('')}<th class="num">Weighted</th><th></th></tr></thead><tbody>
      ${v.options.map((o) => { const r = ranked.find((x) => x.option.id === o.id); return `<tr><td><input type="text" data-on="${esc(o.id)}" value="${esc(o.name)}" placeholder="Vendor or option"></td>${v.criteria.map((c) => `<td><select data-s="${esc(o.id)}" data-c="${esc(c.id)}" style="width:70px"><option value="">–</option>${[1, 2, 3, 4, 5].map((n) => `<option ${+o.scores?.[c.id] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>`).join('')}<td class="num"><b>${r ? r.score.toFixed(2) : '—'}</b></td><td><button class="btn sm ghost" data-delo="${esc(o.id)}" aria-label="Remove option">✕</button></td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="muted" style="padding:0 16px 12px">Add the vendors or options you are comparing (including "do nothing" if relevant).</p>'}</section>`;
  const mut = (fn) => update((pr) => fn(pr.vendors));
  $('[data-addc]', root).onclick = () => mut((x) => x.criteria.push({ id: uid('crt'), name: '', weight: 0 }));
  $('[data-addo]', root).onclick = () => mut((x) => x.options.push({ id: uid('opt'), name: '', scores: {} }));
  $$('[data-delc]', root).forEach((b) => (b.onclick = () => mut((x) => { x.criteria = x.criteria.filter((c) => c.id !== b.dataset.delc); x.options.forEach((o) => delete o.scores?.[b.dataset.delc]); })));
  $$('[data-delo]', root).forEach((b) => (b.onclick = () => mut((x) => { x.options = x.options.filter((o) => o.id !== b.dataset.delo); })));
  $$('[data-cn]', root).forEach((i) => (i.onchange = () => mut((x) => { x.criteria.find((c) => c.id === i.dataset.cn).name = i.value.trim(); })));
  $$('[data-cw]', root).forEach((i) => (i.onchange = () => { const n = Math.max(0, Math.min(100, Number(i.value) || 0)); mut((x) => { x.criteria.find((c) => c.id === i.dataset.cw).weight = n; }); }));
  $$('[data-on]', root).forEach((i) => (i.onchange = () => mut((x) => { x.options.find((o) => o.id === i.dataset.on).name = i.value.trim(); })));
  $$('[data-s]', root).forEach((s) => (s.onchange = () => mut((x) => { const o = x.options.find((y) => y.id === s.dataset.s); o.scores ||= {}; if (s.value) o.scores[s.dataset.c] = +s.value; else delete o.scores[s.dataset.c]; })));
}
