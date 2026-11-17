// Generic list + editor for any collection in COLLECTIONS.
import { COLLECTIONS, uid, ensureCode, lintRequirement } from '../model.js';
import { project, update } from '../store.js';
import { esc, $, $$, modal, toast, confirmBox, renderForm, wireForm, readForm, download, fileSafe } from '../ui.js';
import { toCsv } from '../gen/exports.js';

const filterState = {};

export function renderCollection(root, key, opts = {}) {
  const { heading = true, extra = '', where = null, preset = {}, title = '', addLabel = '', stateKey = key } = opts;
  const c = COLLECTIONS[key];
  const p = project();
  const st = (filterState[stateKey] ||= { q: '' });
  const all = where ? p[key].filter(where) : p[key];
  let items = [...all];
  if (c.sort) items.sort(c.sort);
  const q = st.q.toLowerCase();
  if (q) items = items.filter((it) => JSON.stringify(it).toLowerCase().includes(q));
  const filters = opts.noFilters ? {} : c.filters || {};
  for (const f of Object.keys(filters)) if (st[f]) items = items.filter((it) => it[f] === st[f]);

  root.innerHTML = `
    ${heading ? `<div class="page-head"><div><h1>${esc(c.title)}</h1>${c.intro ? `<p>${esc(c.intro)}</p>` : ''}</div></div>` : ''}
    ${extra}
    <section class="card flush">
      <div class="card-head">
        ${heading ? '' : `<h2>${esc(title || c.title)}</h2>`}
        <input type="search" placeholder="Search…" value="${esc(st.q)}" data-q style="max-width:220px" aria-label="Search ${esc(c.title)}">
        ${Object.entries(filters).map(([f, vals]) => `<select data-f="${f}" style="max-width:160px" aria-label="Filter by ${f}"><option value="">All ${f}</option>${vals.map((v) => `<option ${st[f] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`).join('')}
        <span class="grow"></span>
        <span class="muted small">${items.length} of ${all.length}</span>
        <button class="btn sm" data-csv>Export CSV</button>
        <button class="btn sm primary" data-add>+ ${esc(addLabel || `Add ${c.singular}`)}</button>
      </div>
      ${items.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>${c.cols.map(([h, , cls]) => `<th class="${cls || ''}">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${items.map((it) => `<tr class="click" data-id="${esc(it.id)}" tabindex="0">${c.cols.map(([, fn, cls]) => `<td class="${cls || ''}">${fn(it, p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${all.length ? 'Nothing matches the filter.' : `Nothing here yet — click “${esc(addLabel || `Add ${c.singular}`)}”.`}</div>`}
    </section>`;

  const search = $('[data-q]', root);
  search.addEventListener('input', () => {
    st.q = search.value;
    const pos = search.selectionStart;
    renderCollection(root, key, opts);
    const s = $('[data-q]', root);
    s.focus();
    s.setSelectionRange(pos, pos);
  });
  $$('[data-f]', root).forEach((s) => (s.onchange = () => ((st[s.dataset.f] = s.value), renderCollection(root, key, opts))));
  $('[data-add]', root).onclick = () => openItem(key, null, preset);
  $('[data-csv]', root).onclick = () => download(toCsv(key, p), `${fileSafe(c.title)}.csv`, 'text/csv');
  $$('tr[data-id]', root).forEach((tr) => {
    tr.onclick = () => openItem(key, tr.dataset.id);
    tr.onkeydown = (e) => e.key === 'Enter' && openItem(key, tr.dataset.id);
  });
}

/** Open the editor modal for an item (id = null → new). */
export function openItem(key, id, preset = {}) {
  const c = COLLECTIONS[key];
  const p = project();
  const existing = id ? p[key].find((x) => x.id === id) : null;
  const item = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(key.slice(0, 3)), ...(c.defaults ? c.defaults() : {}), ...preset };
  const body = document.createElement('div');
  body.innerHTML = `<div data-lint></div>${renderForm(c.fields, item, p)}`;
  const m = modal({
    title: `${existing ? 'Edit' : 'New'} ${c.singular}${item.code ? ` · ${item.code}` : ''}`,
    body,
    wide: c.fields.some((f) => f.type === 'rows'),
    footer: `${existing ? '<button class="btn danger" data-del>Delete</button><button class="btn" data-dup>Duplicate</button>' : ''}<span class="grow"></span><button class="btn" data-cancel>Cancel</button><button class="btn primary" data-save>Save</button>`,
  });
  const form = $('form', body);
  wireForm(form, c.fields, item, p);

  const showLint = () => {
    if (key !== 'requirements') return;
    const issues = lintRequirement({ ...item, ...readForm(form, c.fields) }, p);
    $('[data-lint]', body).innerHTML = issues.length ? `<div class="callout warn" style="margin-bottom:12px"><b>Quality check</b><ul class="lint">${issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>` : '<div class="callout" style="margin-bottom:12px">✓ Passes the quality checks.</div>';
  };
  showLint();
  form.addEventListener('input', showLint);
  form.addEventListener('change', showLint);

  const save = () => {
    const vals = readForm(form, c.fields);
    const missing = c.fields.filter((f) => f.req && (Array.isArray(vals[f.key]) ? !vals[f.key].length : String(vals[f.key] ?? '').trim() === ''));
    if (missing.length) return toast(`Please fill in: ${missing.map((f) => f.label).join(', ')}`, 'err');
    const merged = { ...item, ...vals };
    if (merged.code && p[key].some((x) => x.code === merged.code && x.id !== merged.id)) return toast(`ID ${merged.code} is already used`, 'err');
    update((pr) => {
      ensureCode(key, merged, pr[key]);
      const i = pr[key].findIndex((x) => x.id === merged.id);
      if (i >= 0) pr[key][i] = merged;
      else pr[key].push(merged);
    });
    m.close();
    toast('Saved');
  };
  $('[data-save]', m.el).onclick = save;
  form.addEventListener('submit', (e) => (e.preventDefault(), save()));
  $('[data-cancel]', m.el).onclick = m.close;
  $('[data-dup]', m.el)?.addEventListener('click', () => {
    const copy = { ...JSON.parse(JSON.stringify(existing)), id: uid(key.slice(0, 3)), code: '' };
    if (copy.name) copy.name += ' (copy)';
    if (copy.title) copy.title += ' (copy)';
    update((pr) => (ensureCode(key, copy, pr[key]), pr[key].push(copy)));
    m.close();
    toast('Duplicated');
  });
  $('[data-del]', m.el)?.addEventListener('click', async () => {
    if (!(await confirmBox(`Delete this ${c.singular}? You can undo with Ctrl+Z.`))) return;
    update((pr) => (pr[key] = pr[key].filter((x) => x.id !== id)));
    m.close();
    toast('Deleted');
  });
}
