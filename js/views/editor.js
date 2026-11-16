// Editor screens: the Project & scope form, and the generic list editor for every other section.
import { getProject, getEvaluation, update } from '../store.js';
import { PAGES, newItemFor, opt } from '../ui/schema.js';
import { renderField, readFields, validateFields, wireRepeaters, renderForm } from '../ui/forms.js';
import { esc, icon, $, $$, openModal, confirmDialog, toast } from '../ui/dom.js';
import { PHASE_BY_ID } from '../sdlc.js';
import { METHODOLOGIES, COMPLIANCE_OPTIONS } from '../model.js';

export const sectionRoute = (section) => (section === 'project' ? '#/project' : section === 'lifecycle' ? '#/lifecycle' : `#/s/${section}`);
export const sectionTitle = (section) => (section === 'project' ? 'Project & scope' : section === 'lifecycle' ? 'Lifecycle' : PAGES[section]?.title || section);

function issuesPanel(section, ev) {
  const list = ev.issues.filter((i) => i.rule.section === section && i.rule.severity !== 'info');
  if (!list.length) return `<div class="callout ok">${icon('check', 16)}<span>All checks for this section pass.</span></div>`;
  return `<details class="callout warn" ${list.some((i) => i.rule.severity === 'error') ? 'open' : ''}>
    <summary>${icon('alert', 16)}<span><b>${list.length} thing${list.length === 1 ? '' : 's'} to fix</b> in this section</span></summary>
    <ul class="issue-list">${list.map((i) => `<li class="${i.rule.severity}"><span class="sev ${i.rule.severity}">${i.rule.severity}</span><span>${esc(i.message)}<small class="muted"> — ${esc(i.rule.why)}</small></span></li>`).join('')}</ul>
  </details>`;
}

function pageHeader(title, iconName, phaseId, intro) {
  const ph = PHASE_BY_ID[phaseId];
  return `<header class="page-head">
    <div class="eyebrow">${ph ? `Phase ${ph.order} · ${esc(ph.name)}` : ''}</div>
    <h1>${icon(iconName, 22)} ${esc(title)}</h1>
    <p class="lead">${esc(intro)}</p>
  </header>`;
}

function tipsBox(tips) {
  return tips?.length
    ? `<aside class="tips"><h3>${icon('info', 15)} What good looks like</h3><ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></aside>`
    : '';
}

// ---------------- Project & scope ----------------
const PROJECT_FIELDS = [
  { group: 'meta', key: 'name', label: 'Project name', required: true },
  { group: 'meta', key: 'code', label: 'Project code', required: true, placeholder: 'e.g. CAB', help: 'Short code used in document names and IDs.' },
  { group: 'meta', key: 'client', label: 'Client / organisation' },
  { group: 'meta', key: 'sponsor', label: 'Sponsor', type: 'select', options: opt.stakeholders, help: 'Add stakeholders first if the list is empty.' },
  { group: 'meta', key: 'preparedBy', label: 'Prepared by' },
  { group: 'meta', key: 'domain', label: 'Industry / domain', placeholder: 'e.g. Healthcare' },
  { group: 'meta', key: 'methodology', label: 'Delivery methodology', type: 'select', options: METHODOLOGIES, blank: false },
  { group: 'meta', key: 'version', label: 'Document version', placeholder: '0.1' },
  { group: 'meta', key: 'compliance', label: 'Compliance standards', type: 'multiselect', options: COMPLIANCE_OPTIONS, span: 2 },
  { group: 'meta', key: 'summary', label: 'Executive summary', type: 'textarea', span: 2, rows: 3, placeholder: 'Two or three sentences describing the solution.' },
  { group: 'initiation', key: 'problem', label: 'Business problem', type: 'textarea', span: 2, rows: 4, required: true, placeholder: 'What is wrong today? Include numbers where possible.' },
  { group: 'initiation', key: 'vision', label: 'Vision', type: 'textarea', span: 2, rows: 2, placeholder: 'One sentence: what does success look like?' },
  { group: 'initiation', key: 'scopeIn', label: 'In scope (one per line)', type: 'list', required: true },
  { group: 'initiation', key: 'scopeOut', label: 'Out of scope (one per line)', type: 'list' },
  { group: 'initiation', key: 'budget', label: 'Budget' },
  { group: 'initiation', key: 'targetDate', label: 'Target go-live date', type: 'date' },
  { group: 'initiation', key: 'successCriteria', label: 'Success criteria (one per line)', type: 'list', span: 2 },
];

export function renderProject(root) {
  const p = getProject();
  const ev = getEvaluation();
  const values = { ...p.meta, ...p.initiation };
  const section = (title, group) =>
    `<section class="card"><h2 class="card-title">${esc(title)}</h2><div class="form-grid">${PROJECT_FIELDS.filter((f) => f.group === group)
      .map((f) => renderField(f, values[f.key], p))
      .join('')}</div></section>`;
  root.innerHTML = `
    ${pageHeader('Project & scope', 'flag', 'initiation', 'The foundation for the Project Charter and BRD: who, why, what is in and out, and by when.')}
    <div data-issues>${issuesPanel('project', ev)}</div>
    <div class="layout-2">
      <div class="stack" data-form>
        ${section('Project details', 'meta')}
        ${section('Problem, vision and scope', 'initiation')}
      </div>
      ${tipsBox(['Write the problem with facts: "18% of appointments are missed" beats "too many no-shows".', 'Out-of-scope items prevent scope creep — list them explicitly.', 'Changes save automatically.'])}
    </div>`;
  const form = $('[data-form]', root);
  let t;
  form.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(save, 350);
  });
  form.addEventListener('change', save);
  function save() {
    const vals = readFields(form, PROJECT_FIELDS);
    update(
      (proj) => {
        for (const f of PROJECT_FIELDS) proj[f.group][f.key] = vals[f.key];
      },
      { rerender: false, typing: true }
    );
    $('[data-issues]', root).innerHTML = issuesPanel('project', getEvaluation());
  }
}

// ---------------- Generic list editor ----------------
export function renderSection(root, sectionId) {
  const page = PAGES[sectionId];
  if (!page) {
    root.innerHTML = `<div class="empty">Section not found.</div>`;
    return;
  }
  const p = getProject();
  const ev = getEvaluation();
  const refIssues = {};
  for (const i of ev.issues) if (i.ref && i.rule.severity !== 'info') (refIssues[i.ref] ||= []).push(i);

  root.innerHTML = `
    ${pageHeader(page.title, page.icon, page.phase, page.intro)}
    ${issuesPanel(sectionId, ev)}
    <div class="layout-2">
      <div class="stack">
        ${page.blocks
          .map(
            (b) => `
          <section class="card flush" data-block="${b.key}">
            <div class="card-head">
              <h2 class="card-title">${esc(b.title)} <span class="count">${p[b.key].length}</span></h2>
              <button class="btn primary sm" data-new="${b.key}">${icon('plus', 15)}<span>Add ${esc(b.singular)}</span></button>
            </div>
            ${
              p[b.key].length
                ? `<div class="table-wrap"><table class="grid-table">
                  <thead><tr>${b.columns.map((c) => `<th style="${c.w ? `width:${c.w}` : ''}">${esc(c.label)}</th>`).join('')}<th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
                  <tbody>${p[b.key]
                    .map((item) => {
                      const iss = refIssues[item.id] || [];
                      return `<tr data-edit="${b.key}:${esc(item.id)}" tabindex="0">
                        ${b.columns.map((c, ci) => `<td>${ci === 0 && iss.length ? `<span class="dot ${iss.some((x) => x.rule.severity === 'error') ? 'err' : 'warn'}" title="${esc(iss.map((x) => x.message).join('\n'))}"></span>` : ''}${c.value(item, p)}</td>`).join('')}
                        <td class="actions-col"><button class="icon-btn sm" data-edit-btn aria-label="Edit">${icon('edit', 15)}</button></td>
                      </tr>`;
                    })
                    .join('')}</tbody></table></div>`
                : `<div class="empty-block"><p>No ${esc(b.title.toLowerCase())} yet.</p><button class="btn sm" data-new="${b.key}">${icon('plus', 14)}<span>Add the first ${esc(b.singular)}</span></button></div>`
            }
          </section>`
          )
          .join('')}
      </div>
      ${tipsBox(page.tips)}
    </div>`;

  $$('[data-new]', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      const block = page.blocks.find((b) => b.key === btn.dataset.new);
      openEditor(block, newItemFor(block, getProject()), true);
    })
  );
  const openRow = (tr) => {
    const [key, id] = tr.dataset.edit.split(':');
    const block = page.blocks.find((b) => b.key === key);
    const item = getProject()[key].find((x) => x.id === id);
    if (item) openEditor(block, JSON.parse(JSON.stringify(item)), false);
  };
  $$('tr[data-edit]', root).forEach((tr) => {
    tr.addEventListener('click', () => openRow(tr));
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openRow(tr);
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
    ${isNew ? `<button class="btn" data-save-new>Save &amp; add another</button>` : ''}
    <button class="btn primary" data-save>${icon('check', 15)}<span>Save</span></button>`;
  const m = openModal({ title: `${isNew ? 'Add' : 'Edit'} ${block.singular}${item.code ? ` · ${item.code}` : item.name ? ` · ${item.name}` : ''}`, body, footer, wide: block.wide });
  const form = $('form', body);
  wireRepeaters(form, block.fields, p, item);

  const save = (again) => {
    const missing = validateFields(form, block.fields);
    if (missing.length) {
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
    toast(`${block.singular[0].toUpperCase()}${block.singular.slice(1)} saved`);
    m.close();
    if (again) openEditor(block, newItemFor(block, getProject()), true);
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save(false);
  });
  $('[data-save]', m.el).addEventListener('click', () => save(false));
  $('[data-save-new]', m.el)?.addEventListener('click', () => save(true));
  $('[data-delete]', m.el)?.addEventListener('click', async () => {
    if (!(await confirmDialog(`Delete this ${block.singular}? You can undo this with the Undo button.`, { okLabel: 'Delete', danger: true }))) return;
    update((proj) => {
      proj[block.key] = proj[block.key].filter((x) => x.id !== item.id);
      cleanReferences(proj, block.key, item);
    });
    m.close();
    toast(`${block.singular} deleted`, 'info');
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
