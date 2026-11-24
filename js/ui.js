// DOM helpers: escaping, modals, toasts, schema-driven forms, downloads.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function pill(text, kind = '') {
  return text ? `<span class="pill ${kind}">${esc(text)}</span>` : '<span class="muted">—</span>';
}
const KIND = {
  Must: 'err', Should: 'warn', Could: 'info', "Won't": '',
  High: 'err', Medium: 'warn', Low: 'ok', Critical: 'err',
  Approved: 'ok', Done: 'ok', Closed: 'ok', Implemented: 'ok', Answered: 'ok', Validated: 'ok', Passed: 'ok',
  Draft: '', Proposed: 'info', Open: 'warn', 'In progress': 'info', Rejected: 'err', Failed: 'err', Blocked: 'err',
};
export const autoPill = (t) => pill(t, KIND[t] ?? '');

// ---------- toast ----------
export function toast(msg, kind = 'ok', ms = 2600) {
  let host = $('.toasts');
  if (!host) document.body.appendChild((host = Object.assign(document.createElement('div'), { className: 'toasts' })));
  const el = Object.assign(document.createElement('div'), { className: `toast ${kind}`, textContent: msg });
  el.setAttribute('role', 'status');
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ---------- modal ----------
export function modal({ title, body, footer = '', wide = false }) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h2>${esc(title)}</h2><span class="grow"></span><button class="icon-btn" data-x aria-label="Close">✕</button></header>
    <div class="body"></div><footer>${footer}</footer></div>`;
  const b = $('.body', bd);
  if (typeof body === 'string') b.innerHTML = body;
  else b.appendChild(body);
  const close = () => {
    bd.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  $('[data-x]', bd).onclick = close;
  bd.addEventListener('mousedown', (e) => e.target === bd && close());
  document.body.appendChild(bd);
  setTimeout(() => $('input, textarea, select', b)?.focus(), 30);
  return { el: bd, body: b, close };
}

export function confirmBox(message, ok = 'Delete') {
  return new Promise((resolve) => {
    const m = modal({ title: 'Please confirm', body: `<p>${esc(message)}</p>`, footer: `<span class="grow"></span><button class="btn" data-no>Cancel</button><button class="btn primary" data-yes>${esc(ok)}</button>` });
    $('[data-no]', m.el).onclick = () => (m.close(), resolve(false));
    $('[data-yes]', m.el).onclick = () => (m.close(), resolve(true));
  });
}

// ---------- forms ----------
const opts = (o, p) => (typeof o === 'function' ? o(p) : o || []).map((x) => (typeof x === 'object' ? x : { value: x, label: x }));
const optionTags = (list, v, blank = true) =>
  (blank ? '<option value="">—</option>' : '') + list.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('');

function control(f, v, p) {
  const k = `data-k="${f.key}"`;
  switch (f.type) {
    case 'textarea': return `<textarea ${k} rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
    case 'list': return `<textarea ${k} rows="${f.rows || 4}" placeholder="One per line">${esc((v || []).join('\n'))}</textarea>`;
    case 'number': return `<input type="number" ${k} value="${esc(v)}" step="any" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`;
    case 'date': return `<input type="date" ${k} value="${esc(v)}">`;
    case 'select': return `<select ${k}>${optionTags(opts(f.options, p), v, f.blank !== false)}</select>`;
    case 'check': return `<label class="row"><input type="checkbox" ${k} ${v ? 'checked' : ''}> ${esc(f.text || 'Yes')}</label>`;
    case 'multi': {
      const set = new Set(v || []);
      const list = opts(f.options, p);
      return list.length
        ? `<div class="checks" ${k} data-multi>${list.map((o) => `<label><input type="checkbox" value="${esc(o.value)}" ${set.has(o.value) ? 'checked' : ''}>${esc(o.label)}</label>`).join('')}</div>`
        : `<div class="muted small" ${k} data-multi>Nothing to link yet.</div>`;
    }
    case 'rows': return `<div class="rep" ${k} data-rows></div><button type="button" class="btn sm" data-add="${f.key}" style="margin-top:6px">+ ${esc(f.add || 'Add row')}</button>`;
    default: return `<input type="text" ${k} value="${esc(v)}" placeholder="${esc(f.ph || '')}" autocomplete="off">`;
  }
}

const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '' && v !== false);

/** Form from field definitions. Fields marked `adv` are tucked under "More details" (opened when one has a value). */
export function renderForm(fields, item, p) {
  const one = (f) => `<label class="field ${f.full || ['textarea', 'list', 'multi', 'rows'].includes(f.type) ? 'full' : ''}"><span>${esc(f.label)}${f.req ? ' *' : ''}</span>${control(f, item[f.key], p)}${f.help ? `<small>${esc(f.help)}</small>` : ''}</label>`;
  const main = fields.filter((f) => !f.adv), more = fields.filter((f) => f.adv);
  const open = more.some((f) => hasValue(item[f.key]));
  return `<form class="form" novalidate>${main.map(one).join('')}${more.length ? `<details class="more full" ${open ? 'open' : ''}><summary>More details <span class="muted small">(optional — ${more.length} field${more.length === 1 ? '' : 's'})</span></summary><div class="form">${more.map(one).join('')}</div></details>` : ''}</form>`;
}

function rowsHtml(f, rows, p) {
  const grid = `grid-template-columns:${f.cols.map((c) => c.w || '1fr').join(' ')} 30px`;
  if (!rows.length) return `<div class="muted small" style="padding:8px">No rows yet.</div>`;
  return `<div class="rep-row head" style="${grid}">${f.cols.map((c) => `<span>${esc(c.label)}</span>`).join('')}<span></span></div>` +
    rows.map((r, i) => `<div class="rep-row" data-i="${i}" style="${grid}">${f.cols.map((c) => {
      const v = r[c.key];
      if (c.type === 'select') return `<select data-c="${c.key}">${optionTags(opts(c.options, p), v)}</select>`;
      if (c.type === 'check') return `<input type="checkbox" data-c="${c.key}" ${v ? 'checked' : ''}>`;
      if (c.type === 'textarea') return `<textarea data-c="${c.key}" rows="2">${esc(v)}</textarea>`;
      return `<input type="text" data-c="${c.key}" value="${esc(v)}" placeholder="${esc(c.ph || '')}">`;
    }).join('')}<button type="button" class="icon-btn" data-del="${i}" aria-label="Remove row">✕</button></div>`).join('');
}

function readRows(box, f) {
  return $$('.rep-row[data-i]', box).map((el) => {
    const r = {};
    for (const c of f.cols) {
      const inp = $(`[data-c="${c.key}"]`, el);
      r[c.key] = c.type === 'check' ? inp.checked : inp.value.trim();
    }
    return r;
  });
}

export function wireForm(root, fields, item, p) {
  for (const f of fields.filter((x) => x.type === 'rows')) {
    const box = $(`[data-k="${f.key}"]`, root);
    const draw = (rows) => (box.innerHTML = rowsHtml(f, rows, p));
    draw(item[f.key] || []);
    $(`[data-add="${f.key}"]`, root).onclick = () => {
      const rows = readRows(box, f);
      rows.push(f.newRow ? f.newRow(rows) : {});
      draw(rows);
    };
    box.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      const rows = readRows(box, f);
      rows.splice(Number(d.dataset.del), 1);
      draw(rows);
    });
  }
}

export function readForm(root, fields) {
  const out = {};
  for (const f of fields) {
    const el = $(`[data-k="${f.key}"]`, root);
    if (!el) continue;
    if (f.type === 'rows') out[f.key] = readRows(el, f);
    else if (f.type === 'multi') out[f.key] = $$('input:checked', el).map((i) => i.value);
    else if (f.type === 'check') out[f.key] = el.checked;
    else if (f.type === 'number') out[f.key] = el.value === '' ? '' : Number(el.value);
    else if (f.type === 'list') out[f.key] = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else out[f.key] = el.value.trim();
  }
  return out;
}

// ---------- files ----------
export function download(content, filename, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: `${type};charset=utf-8` });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 500);
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const i = Object.assign(document.createElement('input'), { type: 'file', accept });
    i.onchange = () => {
      const f = i.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, text: r.result });
      r.readAsText(f);
    };
    i.click();
  });
}

export const fileSafe = (s) => String(s || 'file').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'file';
