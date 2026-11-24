// Fast-capture buttons on register pages: paste a list, add starter blocks, and derive screens,
// API endpoints and UAT tests from what is already in the project.
import { project, update } from '../store.js';
import { esc, $, $$, modal, toast } from '../ui.js';
import { COLLECTIONS, uid, ensureCode } from '../model.js';
import { STARTERS } from '../templates.js';
import { QUICK, itemsFromText, screenFromEntity, endpointsFromEntity, testsFromAcceptance } from '../gen/capture.js';
import { openItem } from './collection.js';

/** Extra header buttons for a register. */
export function captureButtons(key) {
  const b = [];
  if (QUICK[key]) b.push(`<button class="btn sm" data-cap="paste" title="Turn a pasted list into items">Paste list</button>`);
  if (STARTERS[key] || key === 'stories') b.push(`<button class="btn sm" data-cap="starters" title="Add ready-made items to tailor">Starter blocks</button>`);
  if (key === 'screens') b.push(`<button class="btn sm" data-cap="screen" title="A screen with a field for every attribute">From an entity</button>`);
  if (key === 'apis') b.push(`<button class="btn sm" data-cap="apis" title="List, get, create, update and delete">Endpoints from an entity</button>`);
  if (key === 'tests') b.push(`<button class="btn sm" data-cap="tests" title="One UAT test per acceptance scenario">Tests from acceptance criteria</button>`);
  return b.join('');
}

export function wireCapture(root, key) {
  const on = (k, fn) => { const el = $(`[data-cap="${k}"]`, root); if (el) el.onclick = fn; };
  on('paste', () => pasteModal(key));
  on('starters', () => startersModal(key));
  on('screen', () => entityPicker('Create a screen from an entity', (e) => {
    const id = uid('scr');
    update((pr) => { const s = { id, ...screenFromEntity(pr, e) }; ensureCode('screens', s, pr.screens); pr.screens.push(s); });
    toast(`Screen created with ${screenFromEntity(project(), e).fields.length - 1} mapped fields`);
    setTimeout(() => openItem('screens', id), 50);
  }));
  on('apis', () => entityPicker('Create standard endpoints for an entity', (e) => {
    const list = endpointsFromEntity(project(), e);
    if (!list.length) return toast('These endpoints already exist', 'err');
    update((pr) => list.forEach((a) => pr.apis.push({ id: uid('api'), ...a })));
    toast(`${list.length} endpoint${list.length === 1 ? '' : 's'} added: ${list.map((a) => a.method).join(', ')}`);
  }));
  on('tests', () => {
    const list = testsFromAcceptance(project());
    if (!list.length) return toast('Every acceptance scenario already has a test', 'ok');
    update((pr) => list.forEach((t) => { const x = { id: uid('tes'), ...t }; ensureCode('tests', x, pr.tests); pr.tests.push(x); }));
    toast(`${list.length} draft UAT test${list.length === 1 ? '' : 's'} created from acceptance criteria`);
  });
}

function pasteModal(key) {
  const q = QUICK[key];
  const c = COLLECTIONS[key];
  const m = modal({
    title: q.label,
    wide: true,
    body: `<p class="muted" style="margin-top:0">${esc(q.hint)} Bullets, numbering and duplicates are removed.</p>
      ${q.options ? `<label class="field" style="max-width:260px"><span>${key === 'raid' ? 'Default type' : 'Type'}</span><select data-opt>${q.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>` : ''}
      <textarea data-text rows="10" style="width:100%;margin-top:8px" placeholder="- First item\n- Second item"></textarea>
      <div data-preview class="small muted" style="margin-top:8px">Nothing to add yet.</div>`,
    footer: '<span class="grow"></span><button class="btn" data-x>Cancel</button><button class="btn primary" data-go disabled>Add</button>',
  });
  const ta = $('[data-text]', m.el), opt = $('[data-opt]', m.el), go = $('[data-go]', m.el);
  const preview = () => {
    const items = itemsFromText(key, ta.value, project(), opt?.value);
    go.disabled = !items.length;
    go.textContent = items.length ? `Add ${items.length} ${items.length === 1 ? c.singular : `${c.singular}s`.replace(/ys$/, 'ies')}` : 'Add';
    const label = (x) => x.code ? `${x.code} ${x.title || x.question || x.description || x.name || x.iWant || x.decision || x.term || ''}` : x.term || x.name || x.title || '';
    $('[data-preview]', m.el).innerHTML = items.length ? `<b>${items.length} to add:</b><ul class="lint" style="margin:4px 0 0;max-height:160px;overflow:auto">${items.slice(0, 50).map((x) => `<li>${esc(label(x)).slice(0, 140)}</li>`).join('')}</ul>` : 'Nothing to add yet.';
  };
  ta.addEventListener('input', preview);
  opt?.addEventListener('change', preview);
  $('[data-x]', m.el).onclick = m.close;
  go.onclick = () => {
    const items = itemsFromText(key, ta.value, project(), opt?.value);
    update((pr) => items.forEach((x) => { ensureCode(key, x, pr[key]); pr[key].push(x); }));
    m.close();
    toast(`${items.length} added — open each to add detail`);
  };
  setTimeout(() => ta.focus(), 30);
}

function startersModal(key) {
  const p = project();
  const asStories = key === 'stories';
  const blocks = STARTERS[asStories ? 'requirements' : key];
  const m = modal({
    title: 'Starter blocks',
    wide: true,
    body: `<p class="muted" style="margin-top:0">Ready-made ${asStories ? 'user stories with acceptance criteria' : key === 'requirements' ? 'requirements with acceptance criteria (including what happens when things go wrong)' : 'items'} for things most projects need. Tick what applies, then tailor the wording and numbers.</p>
      ${blocks.map((b) => `<fieldset class="card" style="box-shadow:none;margin-bottom:10px"><legend><label><input type="checkbox" data-all="${esc(b.id)}"> <b>${esc(b.title)}</b></label></legend>${b.items.map((it, i) => `<label style="display:block;margin:3px 0"><input type="checkbox" data-b="${esc(b.id)}" data-i="${i}"> ${esc(asStories ? `I want ${it[2]}` : it[0])}${key === 'raid' ? ` <span class="muted small">— ${esc(it[1])}</span>` : ''}</label>`).join('')}</fieldset>`).join('')}`,
    footer: '<span class="grow"></span><button class="btn" data-x>Cancel</button><button class="btn primary" data-go>Add selected</button>',
  });
  $$('[data-all]', m.el).forEach((a) => (a.onchange = () => $$(`[data-b="${a.dataset.all}"]`, m.el).forEach((c) => (c.checked = a.checked))));
  $('[data-x]', m.el).onclick = m.close;
  $('[data-go]', m.el).onclick = () => {
    const picked = $$('[data-b]:checked', m.el).map((c) => blocks.find((b) => b.id === c.dataset.b).items[+c.dataset.i]);
    if (!picked.length) return toast('Tick at least one item', 'err');
    const approver = p.stakeholders.find((s) => s.approver)?.id || '';
    const objectiveIds = p.objectives.length === 1 ? [p.objectives[0].id] : [];
    const persona = p.personas.find((x) => x.kind !== 'System')?.id || '';
    update((pr) => {
      for (const it of picked) {
        let x;
        if (key === 'requirements') x = { ...COLLECTIONS.requirements.defaults(), type: 'Functional', title: it[0], statement: it[1], acceptance: it[3].map((a) => ({ ...a })), priority: 'Should', source: approver, objectiveIds };
        else if (asStories) x = { ...COLLECTIONS.stories.defaults(), asA: persona, iWant: it[2], soThat: '', acceptance: it[3].map((a) => ({ ...a })) };
        else if (key === 'personas') x = { ...COLLECTIONS.personas.defaults(), name: it[0], kind: it[1], description: it[2] };
        else if (key === 'raid') x = { ...COLLECTIONS.raid.defaults(), type: it[0], description: it[1] };
        if (key === 'personas' && pr.personas.some((y) => y.name.toLowerCase() === x.name.toLowerCase())) continue;
        x.id = uid(key.slice(0, 3));
        ensureCode(key, x, pr[key]);
        pr[key].push(x);
      }
    });
    m.close();
    toast(`${picked.length} added — tailor them to the project`);
  };
}

function entityPicker(title, done) {
  const p = project();
  if (!p.entities.length) return toast('Add an entity under Data model first', 'err');
  const m = modal({
    title,
    body: `<label class="field"><span>Entity</span><select data-e>${p.entities.map((e) => `<option value="${esc(e.id)}">${esc(e.name)} (${(e.fields || []).length} attributes)</option>`).join('')}</select></label>`,
    footer: '<span class="grow"></span><button class="btn" data-x>Cancel</button><button class="btn primary" data-go>Create</button>',
  });
  $('[data-x]', m.el).onclick = m.close;
  $('[data-go]', m.el).onclick = () => { const e = p.entities.find((x) => x.id === $('[data-e]', m.el).value); m.close(); done(e); };
}
