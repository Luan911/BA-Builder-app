// Editor content used inside the step-by-step wizard: the project basics form,
// and the generic list editor for every other section.
import { getProject, getEvaluation, update } from '../store.js';
import { PAGES, newItemFor, opt } from '../ui/schema.js';
import { renderField, readFields, validateFields, wireRepeaters, renderForm } from '../ui/forms.js';
import { esc, icon, $, $$, openModal, confirmDialog, toast } from '../ui/dom.js';
import { METHODOLOGIES, COMPLIANCE_OPTIONS } from '../model.js';
import { stepForSection, stepRoute } from '../ui/steps.js';

export const sectionRoute = (section) => (section === 'lifecycle' ? '#/lifecycle' : stepRoute(stepForSection(section).id));
export const sectionTitle = (section) => (section === 'lifecycle' ? 'Phases' : stepForSection(section).title);

/** Small, collapsed "N things to fix" box. */
export function fixBox(sections, ev) {
  const list = ev.issues.filter((i) => sections.includes(i.rule.section) && i.rule.severity !== 'info');
  if (!list.length) return `<p class="all-good">${icon('check', 15)} Everything on this step looks good.</p>`;
  const blocking = list.filter((i) => i.rule.severity === 'error').length;
  return `<details class="fix-box">
    <summary><span class="fix-dot ${blocking ? 'err' : 'warn'}"></span><b>${list.length} thing${list.length === 1 ? '' : 's'} to fix</b>${blocking ? `<span class="muted"> · ${blocking} must be fixed before sign-off</span>` : ''}<span class="grow"></span><span class="muted small">Show</span></summary>
    <ul>${list.map((i) => `<li><span class="fix-dot ${i.rule.severity === 'error' ? 'err' : 'warn'}"></span><span>${esc(i.message)}</span></li>`).join('')}</ul>
  </details>`;
}

function tips(list) {
  return list?.length
    ? `<details class="help"><summary>${icon('info', 14)} Tips</summary><ul>${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>`
    : '';
}

// ---------------- Project basics ----------------
const PROJECT_FIELDS = [
  { group: 'meta', key: 'name', label: 'Project name', required: true, placeholder: 'e.g. Online appointment booking' },
  { group: 'meta', key: 'code', label: 'Short code', required: true, placeholder: 'e.g. CAB', help: 'Used in IDs and file names.' },
  { group: 'meta', key: 'client', label: 'Client' },
  { group: 'meta', key: 'sponsor', label: 'Sponsor', type: 'select', options: opt.stakeholders, help: 'Add people in step 3 first.' },
  { group: 'initiation', key: 'problem', label: 'What problem are we solving?', type: 'textarea', span: 2, rows: 3, required: true, placeholder: 'What is wrong today? Use numbers if you can.' },
  { group: 'meta', key: 'summary', label: 'Solution in one or two sentences', type: 'textarea', span: 2, rows: 2 },
  { group: 'initiation', key: 'scopeIn', label: 'In scope (one per line)', type: 'list', required: true },
  { group: 'initiation', key: 'scopeOut', label: 'Out of scope (one per line)', type: 'list' },
  { group: 'initiation', key: 'targetDate', label: 'Target go-live date', type: 'date' },
  { group: 'meta', key: 'methodology', label: 'Way of working', type: 'select', options: METHODOLOGIES, blank: false },
  // More details
  { group: 'initiation', key: 'vision', label: 'Vision', type: 'textarea', span: 2, rows: 2, advanced: true, placeholder: 'One sentence: what does success look like?' },
  { group: 'meta', key: 'compliance', label: 'Compliance standards', type: 'multiselect', options: COMPLIANCE_OPTIONS, span: 2, advanced: true },
  { group: 'initiation', key: 'budget', label: 'Budget', advanced: true },
  { group: 'meta', key: 'domain', label: 'Industry', advanced: true },
  { group: 'meta', key: 'preparedBy', label: 'Prepared by', advanced: true },
  { group: 'meta', key: 'version', label: 'Document version', advanced: true },
  { group: 'initiation', key: 'successCriteria', label: 'Success criteria (one per line)', type: 'list', span: 2, advanced: true },
];

export function renderProject(root) {
  const p = getProject();
  const values = { ...p.meta, ...p.initiation };
  root.innerHTML = `
    <section class="card" data-form>
      ${renderForm(PROJECT_FIELDS, values, p)}
      <p class="small muted autosave">${icon('check', 13)} Saves automatically</p>
    </section>`;
  const form = $('[data-form]', root);
  let t;
  const save = () => {
    const vals = readFields(form, PROJECT_FIELDS);
    update((proj) => {
      for (const f of PROJECT_FIELDS) proj[f.group][f.key] = vals[f.key];
    }, { rerender: false, typing: true });
    const box = document.querySelector('[data-fixbox]');
    if (box) box.innerHTML = fixBox(['project'], getEvaluation());
  };
  form.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(save, 350);
  });
  form.addEventListener('change', save);
}

// ---------------- List editor ----------------
export function renderSection(root, sectionId, { showTitle = false } = {}) {
  const page = PAGES[sectionId];
  if (!page) return;
  const p = getProject();
  const ev = getEvaluation();
  const refIssues = {};
  for (const i of ev.issues) if (i.ref && i.rule.severity !== 'info') (refIssues[i.ref] ||= []).push(i);

  root.innerHTML = `
    ${showTitle ? `<h2 class="sub-title">${esc(page.title)}</h2>` : ''}
    ${page.blocks
      .map((b) => {
        const cols = b.show ? b.show.map((i) => b.columns[i]) : b.columns.slice(0, 3);
        // The descriptive column takes the spare width (not a short ID column).
        const mainIdx = cols.length > 1 && cols[0].label === 'ID' ? 1 : 0;
        const items = p[b.key];
        return `
        <section class="card flush" data-block="${b.key}">
          <div class="card-head">
            <h3 class="card-title">${esc(b.title)} <span class="count">${items.length}</span></h3>
            <button class="btn ${items.length ? 'sm' : 'sm primary'}" data-new="${b.key}">${icon('plus', 15)}<span>Add ${esc(b.singular)}</span></button>
          </div>
          ${
            items.length
              ? `<ul class="item-list">${items
                  .map((item) => {
                    const iss = refIssues[item.id] || [];
                    const sev = iss.some((x) => x.rule.severity === 'error') ? 'err' : iss.length ? 'warn' : 'ok';
                    return `<li data-edit="${b.key}:${esc(item.id)}" tabindex="0" role="button" aria-label="Edit">
                      <span class="fix-dot ${sev}" title="${esc(iss.length ? iss.map((x) => x.message).join('\n') : 'No problems')}"></span>
                      ${cols.map((c, ci) => `<div class="cell ${ci === mainIdx ? 'cell-main' : ''}">${c.value(item, p)}</div>`).join('')}
                      ${icon('chevron', 16, 'go')}
                    </li>`;
                  })
                  .join('')}</ul>`
              : `<div class="empty-block small">Nothing here yet.</div>`
          }
        </section>`;
      })
      .join('')}
    ${tips(page.tips)}`;

  $$('[data-new]', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      const block = page.blocks.find((b) => b.key === btn.dataset.new);
      openEditor(block, newItemFor(block, getProject()), true);
    })
  );
  const openRow = (el) => {
    const [key, id] = el.dataset.edit.split(':');
    const block = page.blocks.find((b) => b.key === key);
    const item = getProject()[key].find((x) => x.id === id);
    if (item) openEditor(block, JSON.parse(JSON.stringify(item)), false);
  };
  $$('[data-edit]', root).forEach((el) => {
    el.addEventListener('click', () => openRow(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openRow(el);
      }
    });
  });
}

/** Modal editor for one item. */
export function openEditor(block, item, isNew) {
  const p = getProject();
  const ev = getEvaluation();
  const iss = ev.issues.filter((i) => i.ref === item.id && i.rule.severity !== 'info');
  const body = document.createElement('div');
  body.innerHTML = `
    ${iss.length ? `<div class="callout warn compact">${icon('alert', 15)}<ul>${iss.map((i) => `<li>${esc(i.message)}</li>`).join('')}</ul></div>` : ''}
    <form novalidate>${renderForm(block.fields, item, p)}</form>`;
  const footer = `
    ${isNew ? '' : `<button class="btn ghost danger" data-delete>${icon('trash', 15)}<span>Delete</span></button>`}
    <span class="grow"></span>
    <button class="btn ghost" data-cancel>Cancel</button>
    <button class="btn primary" data-save>${icon('check', 15)}<span>Save</span></button>`;
  const m = openModal({ title: `${isNew ? 'Add' : 'Edit'} ${block.singular}`, body, footer, wide: block.wide });
  const form = $('form', body);
  wireRepeaters(form, block.fields, p, item);

  const save = () => {
    const missing = validateFields(form, block.fields);
    if (missing.length) {
      const adv = $('details.more-fields', form);
      if (adv && missing.some((f) => f.advanced)) adv.open = true;
      toast(`Please fill in: ${missing.map((f) => f.label).join(', ')}`, 'err');
      return;
    }
    const values = readFields(form, block.fields, item);
    const merged = { ...item, ...values };
    if (block.key === 'requirements' && merged.code && getProject().requirements.some((r) => r.code === merged.code && r.id !== merged.id)) {
      toast(`ID ${merged.code} is already used.`, 'err');
      return;
    }
    update((proj) => {
      const list = proj[block.key];
      const idx = list.findIndex((x) => x.id === merged.id);
      if (idx >= 0) list[idx] = merged;
      else list.push(merged);
    });
    toast('Saved');
    m.close();
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  $('[data-save]', m.el).addEventListener('click', save);
  $('[data-cancel]', m.el).addEventListener('click', () => m.close());
  $('[data-delete]', m.el)?.addEventListener('click', async () => {
    if (!(await confirmDialog(`Delete this ${block.singular}? You can undo this.`, { okLabel: 'Delete', danger: true }))) return;
    update((proj) => {
      proj[block.key] = proj[block.key].filter((x) => x.id !== item.id);
      cleanReferences(proj, block.key, item);
    });
    m.close();
    toast('Deleted', 'info');
  });
}

/** Remove links that pointed at a deleted item so nothing is left dangling. */
function cleanReferences(p, key, item) {
  const id = item.id;
  if (key === 'objectives') p.requirements.forEach((r) => (r.objectiveIds = r.objectiveIds.filter((x) => x !== id)));
  if (key === 'requirements') p.rules.forEach((b) => (b.requirementIds = b.requirementIds.filter((x) => x !== id)));
  if (key === 'actors') {
    p.requirements.forEach((r) => r.actorId === id && (r.actorId = ''));
    p.processes.forEach((pr) => pr.steps.forEach((s) => s.actorId === id && (s.actorId = '')));
  }
  if (key === 'releases') p.requirements.forEach((r) => r.releaseId === id && (r.releaseId = ''));
  if (key === 'entities') {
    p.relationships = p.relationships.filter((r) => r.fromId !== id && r.toId !== id);
    p.entities.forEach((e) => e.fields.forEach((f) => f.fk === item.name && (f.fk = '')));
  }
  if (key === 'components') p.components.forEach((c) => (c.connectsTo = c.connectsTo.filter((x) => x !== id)));
  if (key === 'integrations') p.processes.forEach((pr) => pr.steps.forEach((s) => s.integrationId === id && (s.integrationId = '')));
  if (key === 'stakeholders') {
    if (p.meta.sponsor === id) p.meta.sponsor = '';
    for (const k of ['requirements', 'risks', 'assumptions', 'dependencies', 'decisions', 'questions', 'integrations']) {
      p[k].forEach((x) => {
        if (x.owner === id) x.owner = '';
        if (x.source === id) x.source = '';
      });
    }
  }
}
