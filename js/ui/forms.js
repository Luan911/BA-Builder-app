// Schema-driven form fields: render, read back, and wire up repeatable rows.
import { esc, icon, $, $$ } from './dom.js';

const normOptions = (opts, p, ctx) => {
  const list = typeof opts === 'function' ? opts(p, ctx) : opts || [];
  return list.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
};

const optionTags = (opts, value, { blank = '— Select —' } = {}) =>
  `${blank !== false ? `<option value="">${esc(blank)}</option>` : ''}${opts
    .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`)
    .join('')}`;

export function renderField(f, value, p, item = {}) {
  const id = `f_${f.key}_${Math.random().toString(36).slice(2, 7)}`;
  const req = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
  const help = f.help ? `<small class="help">${esc(f.help)}</small>` : '';
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  const common = `id="${id}" data-key="${esc(f.key)}" ${f.required ? 'required aria-required="true"' : ''}`;
  const span = f.span === 2 ? ' span-2' : '';
  let control = '';
  switch (f.type) {
    case 'textarea':
      control = `<textarea ${common} rows="${f.rows || 3}" ${ph}>${esc(value ?? '')}</textarea>`;
      break;
    case 'list':
      control = `<textarea ${common} rows="${f.rows || 4}" ${ph}>${esc((value || []).join('\n'))}</textarea>`;
      break;
    case 'number':
      control = `<input type="number" ${common} value="${esc(value ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${ph}>`;
      break;
    case 'date':
      control = `<input type="date" ${common} value="${esc(value ?? '')}">`;
      break;
    case 'select':
      control = `<select ${common}>${optionTags(normOptions(f.options, p, item), value, { blank: f.blank ?? '— Select —' })}</select>`;
      break;
    case 'checkbox':
      return `<label class="field check${span}"><input type="checkbox" ${common} ${value ? 'checked' : ''}><span>${esc(f.label)}</span>${help}</label>`;
    case 'multiselect': {
      const opts = normOptions(f.options, p, item);
      const set = new Set(value || []);
      control = opts.length
        ? `<div class="chips" data-key="${esc(f.key)}" data-type="multiselect" role="group" aria-label="${esc(f.label)}">${opts
            .map((o) => `<label class="chip-check"><input type="checkbox" value="${esc(o.value)}" ${set.has(o.value) ? 'checked' : ''}><span>${esc(o.label)}</span></label>`)
            .join('')}</div>`
        : `<div class="muted small" data-key="${esc(f.key)}" data-type="multiselect">${esc(f.emptyText || 'Nothing to choose from yet.')}</div>`;
      return `<div class="field${span}"><span class="label">${esc(f.label)}${req}</span>${control}${help}</div>`;
    }
    case 'repeater':
      return `<div class="field span-2"><span class="label">${esc(f.label)}${req}</span>${help}<div class="repeater" data-key="${esc(f.key)}" data-type="repeater">${repeaterRows(f, value || [], p)}</div><button type="button" class="btn sm ghost" data-add="${esc(f.key)}">${icon('plus', 14)}<span>${esc(f.addLabel || 'Add row')}</span></button></div>`;
    case 'color':
      control = `<input type="color" ${common} value="${esc(value || '#4f46e5')}">`;
      break;
    default:
      control = `<input type="text" ${common} value="${esc(value ?? '')}" ${ph} autocomplete="off">`;
  }
  return `<label class="field${span}" for="${id}"><span class="label">${esc(f.label)}${req}</span>${control}${help}</label>`;
}

function repeaterRows(f, rows, p) {
  if (!rows.length) return `<div class="rep-empty muted small">${esc(f.emptyText || 'No rows yet.')}</div>`;
  const head = `<div class="rep-row rep-head" style="grid-template-columns:${f.grid}">${f.columns.map((c) => `<span>${esc(c.label)}</span>`).join('')}<span></span></div>`;
  return (
    head +
    rows
      .map((row, i) => {
        const cells = f.columns
          .map((c) => {
            const v = row[c.key];
            const disabled = c.enabled && !c.enabled(row) ? 'disabled' : '';
            const aria = `aria-label="${esc(c.label)} row ${i + 1}"`;
            if (c.type === 'select') return `<select data-col="${c.key}" ${aria} ${disabled}>${optionTags(normOptions(c.options, p, { rows, row }), v, { blank: c.blank ?? '—' })}</select>`;
            if (c.type === 'checkbox') return `<span class="rep-check"><input type="checkbox" data-col="${c.key}" ${aria} ${v ? 'checked' : ''}></span>`;
            if (c.type === 'textarea') return `<textarea data-col="${c.key}" rows="2" ${aria} placeholder="${esc(c.placeholder || '')}">${esc(v ?? '')}</textarea>`;
            return `<input type="text" data-col="${c.key}" value="${esc(v ?? '')}" ${aria} placeholder="${esc(c.placeholder || '')}" autocomplete="off">`;
          })
          .join('');
        return `<div class="rep-row" data-row="${i}" style="grid-template-columns:${f.grid}">${cells}<span class="rep-actions">
            <button type="button" class="icon-btn xs" data-up="${i}" title="Move up" aria-label="Move row ${i + 1} up">${icon('arrowUp', 14)}</button>
            <button type="button" class="icon-btn xs" data-down="${i}" title="Move down" aria-label="Move row ${i + 1} down">${icon('arrowDown', 14)}</button>
            <button type="button" class="icon-btn xs danger" data-del="${i}" title="Remove" aria-label="Remove row ${i + 1}">${icon('trash', 14)}</button>
          </span></div>`;
      })
      .join('')
  );
}

function readRepeater(container, f) {
  return $$('.rep-row[data-row]', container).map((rowEl) => {
    const row = {};
    for (const c of f.columns) {
      const el = $(`[data-col="${c.key}"]`, rowEl);
      if (!el) continue;
      row[c.key] = c.type === 'checkbox' ? el.checked : el.value.trim();
    }
    // keep hidden properties (like ids) from the original row
    return row;
  });
}

/** Read all fields from a form element. `original` keeps ids on repeater rows. */
export function readFields(root, fields, original = {}) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'repeater') {
      const container = $(`.repeater[data-key="${f.key}"]`, root);
      const rows = readRepeater(container, f);
      const orig = container._rows || original[f.key] || [];
      out[f.key] = rows.map((r, i) => ({ ...(orig[i] || {}), ...r }));
      continue;
    }
    if (f.type === 'multiselect') {
      out[f.key] = $$(`[data-key="${f.key}"] input:checked`, root).map((i) => i.value);
      continue;
    }
    const el = $(`[data-key="${f.key}"]`, root);
    if (!el) continue;
    if (f.type === 'checkbox') out[f.key] = el.checked;
    else if (f.type === 'number') out[f.key] = el.value === '' ? '' : Number(el.value);
    else if (f.type === 'list') out[f.key] = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else out[f.key] = el.value.trim();
  }
  return out;
}

export function validateFields(root, fields) {
  const values = readFields(root, fields);
  const missing = fields.filter((f) => f.required && (Array.isArray(values[f.key]) ? !values[f.key].length : !String(values[f.key] ?? '').trim()));
  $$('.field.invalid', root).forEach((e) => e.classList.remove('invalid'));
  for (const f of missing) $(`[data-key="${f.key}"]`, root)?.closest('.field')?.classList.add('invalid');
  return missing;
}

/** Make repeaters interactive (add / remove / reorder / dependent selects). */
export function wireRepeaters(root, fields, p, item = {}) {
  for (const f of fields.filter((x) => x.type === 'repeater')) {
    const container = $(`.repeater[data-key="${f.key}"]`, root);
    container._rows = (item[f.key] || []).map((r) => ({ ...r }));
    const rerender = (rows) => {
      container._rows = rows;
      container.innerHTML = repeaterRows(f, rows, p);
    };
    const current = () => readRepeater(container, f).map((r, i) => ({ ...(container._rows[i] || {}), ...r }));
    $(`[data-add="${f.key}"]`, root).addEventListener('click', () => {
      const rows = current();
      rows.push(f.newRow ? f.newRow(rows, p) : {});
      rerender(rows);
      const last = $$('.rep-row[data-row]', container).pop();
      $('input, select, textarea', last)?.focus();
    });
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const rows = current();
      if (btn.dataset.del != null) rows.splice(Number(btn.dataset.del), 1);
      else if (btn.dataset.up != null) {
        const i = Number(btn.dataset.up);
        if (i > 0) [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
      } else if (btn.dataset.down != null) {
        const i = Number(btn.dataset.down);
        if (i < rows.length - 1) [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
      } else return;
      rerender(rows);
    });
    if (f.refreshOn?.length) {
      container.addEventListener('change', (e) => {
        if (f.refreshOn.includes(e.target.dataset.col)) {
          const focusCol = e.target.dataset.col;
          const rowIdx = e.target.closest('[data-row]')?.dataset.row;
          rerender(current());
          $(`[data-row="${rowIdx}"] [data-col="${focusCol}"]`, container)?.focus();
        }
      });
    }
  }
}

/** Main fields first; fields marked `advanced` go in a collapsed "More details" section. */
export function renderForm(fields, values, p) {
  const main = fields.filter((f) => !f.advanced);
  const more = fields.filter((f) => f.advanced);
  const grid = (list) => `<div class="form-grid">${list.map((f) => renderField(f, values[f.key], p, values)).join('')}</div>`;
  return grid(main) + (more.length ? `<details class="more-fields"><summary>More details</summary>${grid(more)}</details>` : '');
}
