// Normalise to 3NF: check every entity, explain each problem in plain words, and apply the fix
// (new entity, moved attributes, foreign key, relationship) with a before / after ERD.
import { project, update } from '../store.js';
import { esc, $, $$, toast, confirmBox } from '../ui.js';
import { uid } from '../model.js';
import { analyseModel, analyseEntity, applyFix, applyAll, manualSplit, practiceEntity, normalForm } from '../gen/normalise.js';
import { erd } from '../gen/diagrams.js';
import { render } from '../mermaid.js';
import { openItem } from './collection.js';

const NF = ['Not in 1NF', '1NF', '2NF', '3NF'];
const nfPill = (n) => `<span class="pill ${n === 3 ? 'ok' : n === 0 ? 'err' : 'warn'}">${NF[n]}</span>`;
const formPill = (f) => `<span class="pill ${f === '1NF' ? 'err' : 'warn'}">${f}</span>`;

function describe(fix, e) {
  if (!fix) return '';
  if (fix.type === 'addKey') return `Add <b>${esc(fix.name)}</b> (uuid) as the primary key of ${esc(e.name)}.`;
  if (fix.type === 'remove') return `Remove <b>${esc(fix.field)}</b> and calculate it when it is needed.`;
  if (fix.mode === 'repeat') return `Create <b data-tname>${esc(fix.target)}</b> with one row per value (a link back to ${esc(e.name)} plus <b>${esc(fix.value)}</b>), and remove ${fix.move.map(esc).join(', ')} from ${esc(e.name)}.`;
  return `Move ${fix.move.map((m) => `<b>${esc(m)}</b>`).join(', ')} to <b data-tname>${esc(fix.target)}</b>${fix.newFk ? `, and add <b>${esc(fix.fk)}</b> to ${esc(e.name)}` : ''}; ${esc(e.name)}.${esc(fix.fk)} becomes a foreign key to it.`;
}

/** Entity + its directly related entities, for the before / after diagrams. */
function neighbourhood(p, e) {
  const ids = new Set([e.id]);
  for (const r of p.relationships) { if (r.from === e.id) ids.add(r.to); if (r.to === e.id) ids.add(r.from); }
  for (const f of e.fields || []) { const t = p.entities.find((x) => x.name === f.fk); if (t) ids.add(t.id); }
  return p.entities.filter((x) => ids.has(x.id));
}

export function renderNormalise(root, entityId) {
  const p = project();
  const model = analyseModel(p);
  const cur = model.find((m) => m.entity.id === entityId) || model.find((m) => m.issues.length) || model[0];
  const total = model.reduce((a, m) => a + m.issues.length, 0);
  root.innerHTML = `
    <div class="page-head"><div><h1>Normalise to 3NF</h1><p>Checks each entity for first, second and third normal form, explains every problem, and restructures the model for you. Review each change: the app reads clues in names and keys, and you know the real business rules.</p></div>
      <span class="grow"></span><button class="btn" data-practice>Add a practice table</button>${total ? '<button class="btn primary" data-all>Normalise whole model</button>' : ''}</div>
    <details class="card" ${p.entities.length ? '' : 'open'} style="margin-bottom:16px"><summary><b>What do 1NF, 2NF and 3NF mean?</b></summary>
      <div class="grid g3" style="margin-top:10px">
        <div><b style="color:var(--green-2)">1NF — atomic values</b><p class="small" style="margin:4px 0 0">Every table has a primary key, and each field holds one value. No lists in a field, no <i>phone1, phone2, phone3</i>.</p></div>
        <div><b style="color:var(--green-2)">2NF — the whole key</b><p class="small" style="margin:4px 0 0">With a key made of several fields (e.g. orderId + productId), every other field must depend on all of it. <i>productName</i> depends only on productId, so it belongs in Product.</p></div>
        <div><b style="color:var(--green-2)">3NF — nothing but the key</b><p class="small" style="margin:4px 0 0">No field may depend on another non-key field. <i>customerName</i> depends on customerId, not on the order, so it belongs in Customer. Stored totals and ages depend on other fields too.</p></div>
      </div></details>
    ${p.entities.length ? `
    <section class="card flush"><div class="card-head"><h2>Model check</h2><span class="grow"></span><span class="small muted">${model.filter((m) => m.nf === 3).length} of ${model.length} entities in 3NF</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Entity</th><th>Normal form</th><th>Open issues</th><th></th></tr></thead><tbody>
      ${model.map((m) => `<tr class="click ${m === cur ? 'sel' : ''}" data-go="${esc(m.entity.id)}"><td><b>${esc(m.entity.name)}</b>${m.entity.area ? `<div class="small muted">${esc(m.entity.area)}</div>` : ''}</td><td>${nfPill(m.nf)}</td><td class="small">${m.issues.length ? m.issues.map((i) => `${i.form}: ${esc(i.title)}`).join('<br>') : '<span class="muted">None</span>'}</td><td><a href="#/normalise/${esc(m.entity.id)}">Review →</a></td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="card" style="margin-top:16px" data-detail></section>` : `<div class="empty">No entities yet. Add them under <a href="#/data">Data model</a>, or click “Add a practice table” to try it out.</div>`}`;

  $('[data-practice]', root).onclick = () => {
    const id = uid('ent');
    update((pr) => pr.entities.push({ id, ...practiceEntity() }));
    location.hash = `#/normalise/${id}`;
    toast('Practice table OrderForm added');
  };
  $('[data-all]', root)?.addEventListener('click', async () => {
    if (!(await confirmBox(`Apply all ${total} suggested changes across the model? Derived values are left for you to decide. You can undo with Ctrl+Z.`))) return;
    let log = [];
    update((pr) => (log = applyAll(pr)));
    toast(`${log.length} change${log.length === 1 ? '' : 's'} applied`);
  });
  $$('tr[data-go]', root).forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest('a')) location.hash = `#/normalise/${tr.dataset.go}`; }));
  if (cur) renderDetail($('[data-detail]', root), p, cur.entity);
}

function renderDetail(el, p, e) {
  const issues = analyseEntity(p, e);
  const dismissed = e.normIgnore || [];
  const nonKey = (e.fields || []).filter((f) => f.name && !f.pk);
  el.innerHTML = `
    <div class="row" style="flex-wrap:wrap;gap:8px"><h2 style="margin:0">${esc(e.name)}</h2>${nfPill(normalForm(issues))}<span class="grow"></span>
      <button class="btn sm" data-edit>Edit entity</button>${issues.some((i) => i.fix && i.fix.type !== 'remove') ? '<button class="btn sm primary" data-allone>Apply all for this entity</button>' : ''}</div>
    ${issues.length ? issues.map((i, k) => `
      <div class="callout ${i.form === '1NF' ? 'warn' : ''}" style="margin-top:12px">
        <div class="row" style="gap:8px;flex-wrap:wrap">${formPill(i.form)}<b>${esc(i.title)}</b></div>
        <p style="margin:6px 0">${esc(i.text)}</p>
        ${i.fix ? `<p class="small" style="margin:6px 0"><b>Proposed change:</b> ${describe(i.fix, e)}</p>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap">
          ${i.fix && i.fix.type === 'extract' ? `<label class="small muted">New / target entity</label><input type="text" data-target="${k}" value="${esc(i.fix.target)}" style="max-width:200px">` : ''}
          ${i.fix ? `<button class="btn sm primary" data-apply="${k}">${i.fix.type === 'remove' ? `Remove ${esc(i.fix.field)}` : 'Apply this change'}</button>` : ''}
          <button class="btn sm" data-dismiss="${k}">${i.fix?.type === 'remove' ? 'Keep it (stored on purpose)' : 'Not a problem here — dismiss'}</button>
        </div>
      </div>`).join('') : `<div class="callout" style="margin-top:12px">✓ ${esc(e.name)} looks like it is in third normal form: it has a key, atomic attributes, and nothing that depends on anything but the key.</div>`}
    ${dismissed.length ? `<p class="small muted" style="margin-top:10px">${dismissed.length} dismissed check${dismissed.length === 1 ? '' : 's'}. <a href="#" data-restore>Show them again</a></p>` : ''}
    <details style="margin-top:16px"${issues.length ? '' : ' open'}><summary><b>Split it yourself</b> <span class="small muted">— when you know some attributes depend on something other than the key</span></summary>
      <div style="margin-top:10px">
        <div class="row" style="flex-wrap:wrap;gap:10px">${nonKey.length ? nonKey.map((f) => `<label class="small"><input type="checkbox" data-mv="${esc(f.name)}"> ${esc(f.name)}</label>`).join('') : '<span class="muted small">No non-key attributes.</span>'}</div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><label class="small muted">Move the ticked attributes to</label>
          <input type="text" list="ents" data-mtarget placeholder="Entity name, new or existing" style="max-width:240px"><datalist id="ents">${p.entities.filter((x) => x !== e).map((x) => `<option value="${esc(x.name)}">`).join('')}</datalist>
          <select data-mdir style="width:auto" aria-label="How the two entities relate">
            <option value="lookup">Many ${esc(e.name)} rows share one of these (e.g. Customer, Branch)</option>
            <option value="many">One ${esc(e.name)} has many of these (e.g. order lines, phone numbers)</option>
          </select>
          <button class="btn sm primary" data-manual>Move</button></div>
        <p class="small muted" style="margin:6px 0 0">The attributes move to that entity (created if needed). Shared: ${esc(e.name)} keeps a foreign key to it. One-to-many: it gets a foreign key back to ${esc(e.name)}.</p>
      </div></details>
    <div class="grid g2" style="margin-top:16px">
      <div><h3 style="margin:0 0 6px">Now</h3><div class="stage" data-before style="min-height:200px">Drawing…</div></div>
      <div><h3 style="margin:0 0 6px">After all suggested changes</h3><div class="stage" data-after style="min-height:200px">${issues.some((i) => i.fix && i.fix.type !== 'remove') ? 'Drawing…' : '<p class="muted">No structural changes suggested.</p>'}</div></div>
    </div>`;

  const run = (fn) => { let msg = ''; update((pr) => (msg = fn(pr))); if (msg) toast(msg.length > 140 ? `${msg.slice(0, 137)}…` : msg); };
  $('[data-edit]', el).onclick = () => openItem('entities', e.id);
  $('[data-allone]', el)?.addEventListener('click', () => run((pr) => { const log = applyAll(pr, [e.id]); return `${log.length} change${log.length === 1 ? '' : 's'} applied to ${e.name} — Ctrl+Z to undo`; }));
  $$('[data-apply]', el).forEach((b) => (b.onclick = () => {
    const i = issues[+b.dataset.apply];
    const t = $(`[data-target="${b.dataset.apply}"]`, el)?.value.trim();
    const fix = t ? { ...i.fix, target: t } : i.fix;
    run((pr) => applyFix(pr, e.id, fix));
  }));
  $$('[data-dismiss]', el).forEach((b) => (b.onclick = () => run((pr) => {
    const x = pr.entities.find((y) => y.id === e.id);
    x.normIgnore = [...new Set([...(x.normIgnore || []), issues[+b.dataset.dismiss].id])];
    return 'Dismissed. You can show it again below.';
  })));
  $('[data-restore]', el)?.addEventListener('click', (ev) => (ev.preventDefault(), run((pr) => { pr.entities.find((y) => y.id === e.id).normIgnore = []; return 'Dismissed checks restored'; })));
  $('[data-manual]', el).onclick = () => {
    const move = $$('[data-mv]', el).filter((c) => c.checked).map((c) => c.dataset.mv);
    const target = $('[data-mtarget]', el).value.trim();
    if (!move.length) return toast('Tick the attributes to move', 'err');
    if (!target) return toast('Name the entity they belong to', 'err');
    if (target.toLowerCase() === e.name.toLowerCase()) return toast('Choose a different entity', 'err');
    run((pr) => manualSplit(pr, e.id, { target, move, many: $('[data-mdir]', el).value === 'many' }));
  };

  // before / after diagrams
  const draw = (box, code) => render(code).then((svg) => { box.innerHTML = svg; const s = $('svg', box); if (s) s.style.maxWidth = '100%'; }).catch((err) => (box.innerHTML = `<div class="err">${esc(err.message)}</div>`));
  draw($('[data-before]', el), erd(p, neighbourhood(p, e)));
  if (issues.some((i) => i.fix && i.fix.type !== 'remove')) {
    const clone = JSON.parse(JSON.stringify(p));
    applyAll(clone, [e.id]);
    const ce = clone.entities.find((x) => x.id === e.id);
    draw($('[data-after]', el), erd(clone, neighbourhood(clone, ce)));
  }
}
