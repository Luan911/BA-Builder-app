// SRS wizard: a guided, step-by-step path from a blank page to a finished
// Software Requirements Specification. Each step explains what to write, shows an
// example, checks the work, and the last step reviews and exports the SRS.
import { project, update, newProject } from '../store.js';
import { esc, $, $$, modal, toast, renderForm, readForm, download, fileSafe } from '../ui.js';
import { lintRequirement } from '../model.js';
import { buildDoc } from '../gen/docs.js';
import { mdToHtml } from '../markdown.js';
import { renderCollection, openItem } from './collection.js';

const isType = (t) => (r) => r.type === t;
const reqsOf = (p, t) => p.requirements.filter((r) => r.type === t && r.status !== 'Rejected');
const clean = (p, list) => list.every((r) => !lintRequirement(r, p).length);

/** What is still missing for a step, as [message, requirementId?] pairs. Empty = nothing to do. */
function todo(step, p) {
  const out = [];
  const reqTodo = (type, label) => {
    const list = reqsOf(p, type);
    if (!list.length) out.push([`Add at least one ${label}.`]);
    for (const r of list) for (const issue of lintRequirement(r, p)) out.push([`${r.code || r.title}: ${issue}`, r.id]);
  };
  switch (step.id) {
    case 'intro':
      if (!p.meta.name) out.push(['Enter the system name.']);
      if (!p.meta.summary) out.push(['Write the purpose and summary.']);
      break;
    case 'scope':
      if (!p.charter.problem) out.push(['Write the problem statement.']);
      if (!p.charter.scopeIn.length) out.push(['List at least one item that is in scope.']);
      if (!p.charter.scopeOut.length) out.push(['List at least one item that is out of scope.']);
      break;
    case 'objectives':
      if (!p.objectives.length) out.push(['Add at least one business objective.']);
      for (const o of p.objectives) if (!/\d/.test(o.target || '')) out.push([`${o.code || o.title}: the target needs a number`]);
      break;
    case 'people':
      if (!p.personas.length) out.push(['Add at least one user type.']);
      if (!p.stakeholders.some((x) => x.approver)) out.push(['Tick “Approves deliverables” on at least one stakeholder.']);
      break;
    case 'functional': reqTodo('Functional', 'functional requirement'); break;
    case 'nfr': reqTodo('Non-functional', 'quality requirement (NFR)'); break;
    default:
  }
  return out;
}

/** The to-do box shown at the top of a step; requirement lines open that requirement. */
function todoHtml(step, p) {
  if (step.id === 'review' || step.done(p)) return '';
  const list = todo(step, p);
  if (!list.length) return '';
  return `<div class="callout warn" style="margin-bottom:16px"><b>To finish this step (${list.length}):</b><ul class="lint">${list.slice(0, 12).map(([msg, id]) => `<li>${id ? `<a href="#" data-open="${esc(id)}">${esc(msg)}</a>` : esc(msg)}</li>`).join('')}${list.length > 12 ? `<li>…and ${list.length - 12} more</li>` : ''}</ul>${list.some(([, id]) => id) ? '<div class="small muted">Click a line to open that requirement.</div>' : ''}</div>`;
}

import { NFR_TEMPLATES } from '../templates.js';

/** The steps. `done(p)` says whether the step is complete; `optional` steps never block. */
export const STEPS = [
  {
    id: 'intro', title: 'Introduction', short: 'Project & purpose',
    lead: 'Name the system and say, in two or three sentences, what it is for and who will read this SRS.',
    tips: [['What to write', 'The product name, a short code, who it is for, and its purpose.'], ['Tip', 'The summary becomes section 2 "Overall description". Keep it plain: what the system does and why.'], ['Example', '“A web application that lets customers apply for personal loans online and get a decision in minutes.”']],
    done: (p) => !!(p.meta.name && p.meta.summary),
    render: (el, p) => formStep(el, p, 'meta', [
      { key: 'name', label: 'System / project name', req: true }, { key: 'code', label: 'Short code (used in IDs and file names)', ph: 'e.g. DLO' },
      { key: 'client', label: 'Client / business unit' }, { key: 'version', label: 'SRS version', ph: '0.1' },
      { key: 'analyst', label: 'Prepared by' }, { key: 'sponsor', label: 'Sponsor / approver' },
      { key: 'summary', label: 'Purpose and summary of the system', type: 'textarea', rows: 4, ph: 'What the system does, for whom, and why.' },
    ]),
  },
  {
    id: 'scope', title: 'Problem & scope', short: 'What is in and out',
    lead: 'Describe the problem being solved, then draw a clear line around what this system will and will not do.',
    tips: [['What to write', 'The current problem with numbers, the vision, and two lists: in scope and out of scope.'], ['Why it matters', 'A clear "out of scope" list prevents scope creep and arguments later.'], ['Tip', 'One item per line. Start each with a noun: “Online application form”.']],
    done: (p) => !!(p.charter.problem && p.charter.scopeIn.length && p.charter.scopeOut.length),
    render: (el, p) => formStep(el, p, 'charter', [
      { key: 'problem', label: 'Problem statement', type: 'textarea', rows: 4, ph: 'What is wrong today, for whom, and what it costs.' },
      { key: 'vision', label: 'Vision (what good looks like)', type: 'textarea', rows: 2 },
      { key: 'scopeIn', label: 'In scope (one per line)', type: 'list' }, { key: 'scopeOut', label: 'Out of scope (one per line)', type: 'list' },
      { key: 'constraints', label: 'Constraints (budget, technology, regulation — one per line)', type: 'list', rows: 3 },
    ]),
  },
  {
    id: 'objectives', title: 'Business objectives', short: 'Why we are building it',
    lead: 'List the measurable outcomes the system must deliver. Every requirement you write later will trace back to one of these.',
    tips: [['What to write', 'Objective, how it is measured (KPI), the starting point and the target.'], ['Rule', 'Every target needs a number, so you can prove success.'], ['Example', '“Cut time to decision” — KPI: median minutes — baseline 5 days — target < 10 minutes.']],
    done: (p) => p.objectives.length > 0 && p.objectives.every((o) => /\d/.test(o.target || '')),
    render: (el) => renderCollection(el, 'objectives', { heading: false, title: 'Objectives', addLabel: 'Add objective' }),
  },
  {
    id: 'people', title: 'Users & stakeholders', short: 'Who uses and approves it',
    lead: 'Add the types of users (and external systems) that interact with the system, then the people who influence or approve it.',
    tips: [['Users / actors', 'Roles, not names: “Applicant”, “Credit officer”, “Payment gateway (system)”.'], ['Stakeholders', 'Real people or teams. Tick “Approves deliverables” for whoever signs off the SRS.'], ['Why', 'Users become the “As a …” in stories and use cases; approvers appear in the sign-off table.']],
    done: (p) => p.personas.length > 0 && p.stakeholders.some((s) => s.approver),
    render: (el) => {
      el.innerHTML = '<div data-a></div><div data-b style="margin-top:16px"></div>';
      renderCollection($('[data-a]', el), 'personas', { heading: false, title: 'Users & external systems', addLabel: 'Add user type' });
      renderCollection($('[data-b]', el), 'stakeholders', { heading: false, title: 'Stakeholders', addLabel: 'Add stakeholder' });
    },
  },
  {
    id: 'functional', title: 'Functional requirements', short: 'What the system shall do',
    lead: 'Write one requirement per capability. Each is checked as you type — fix every warning before you move on.',
    tips: [['Format', '“The system shall <verb> <object> <condition / limit>.” One capability per requirement.'], ['Avoid', 'Vague words like fast, easy, user-friendly, etc. — use numbers and exact behaviour.'], ['Acceptance criteria', 'Add at least one Given / When / Then scenario, including an unhappy path.']],
    done: (p) => reqsOf(p, 'Functional').length > 0 && clean(p, reqsOf(p, 'Functional')),
    render: (el) => renderCollection(el, 'requirements', { heading: false, title: 'Functional requirements', addLabel: 'Add functional requirement', where: isType('Functional'), preset: { type: 'Functional', priority: 'Must' }, noFilters: true, stateKey: 'wiz-fr' }),
  },
  {
    id: 'nfr', title: 'Quality requirements (NFRs)', short: 'How well it must work',
    lead: 'Non-functional requirements set the bar for speed, availability, security, privacy and more. Start from a template and change the numbers to suit.',
    tips: [['Rule', 'Every NFR needs a metric and a target, otherwise it cannot be tested.'], ['Minimum set', 'Most systems need at least Performance, Availability, Security and Privacy.'], ['Tip', 'Click a template below — it opens pre-filled so you only adjust the values.']],
    done: (p) => reqsOf(p, 'Non-functional').length > 0 && clean(p, reqsOf(p, 'Non-functional')),
    render: (el, p) => {
      const have = new Set(reqsOf(p, 'Non-functional').map((r) => r.category));
      el.innerHTML = `<section class="card" style="margin-bottom:16px"><h2 style="margin-bottom:8px">Add from a template</h2><div class="chips-add">${NFR_TEMPLATES.map(([cat, name], i) => `<button class="btn sm ${have.has(cat) ? '' : 'red'}" data-tpl="${i}" title="${esc(NFR_TEMPLATES[i][2])}">${have.has(cat) ? '✓ ' : '+ '}${esc(cat)} · ${esc(name)}</button>`).join('')}</div><p class="muted small" style="margin-top:8px">Red = category not covered yet. Green tick = already covered.</p></section><div data-list></div>`;
      $$('[data-tpl]', el).forEach((b) => (b.onclick = () => {
        const [category, title, statement, metric] = NFR_TEMPLATES[+b.dataset.tpl];
        const pr = project();
        openItem('requirements', null, { type: 'Non-functional', category, title, statement, metric, priority: 'Must', objectiveIds: pr.objectives.length === 1 ? [pr.objectives[0].id] : [], source: pr.stakeholders.filter((x) => x.approver).length === 1 ? pr.stakeholders.find((x) => x.approver).id : '', acceptance: [{ given: 'the system is under normal production conditions', when: `the ${category.toLowerCase()} test is run`, then: `the result meets: ${metric}` }] });
      }));
      renderCollection($('[data-list]', el), 'requirements', { heading: false, title: 'Quality requirements', addLabel: 'Add your own NFR', where: isType('Non-functional'), preset: { type: 'Non-functional', priority: 'Must' }, noFilters: true, stateKey: 'wiz-nfr' });
    },
  },
  {
    id: 'usecases', title: 'Use cases', short: 'Step-by-step interactions', optional: true,
    lead: 'Describe the main user goals as step-by-step conversations between a user and the system. Recommended for anything with more than a few screens.',
    tips: [['Name', 'Verb + noun: “Submit application”.'], ['Main flow', 'One line per step, alternating user and system: “Applicant enters amount”, “System shows repayment”.'], ['Alternatives', 'What else can happen at a step: “3a. Amount too high: system shows the limit”.']],
    done: (p) => p.usecases.length > 0,
    render: (el) => renderCollection(el, 'usecases', { heading: false, title: 'Use cases', addLabel: 'Add use case' }),
  },
  {
    id: 'data', title: 'Data & interfaces', short: 'Information and other systems', optional: true,
    lead: 'List the main things the system stores (entities) and the external systems it talks to. This produces the ERD and interface section of the SRS.',
    tips: [['Entities', 'Singular nouns: Customer, Application, Payment. Give each an id (PK) and its key fields.'], ['Interfaces', 'For each external system: direction, protocol, what data is exchanged, and how it authenticates.'], ['Tip', 'Mark personal data so privacy NFRs apply to it.']],
    done: (p) => p.entities.length > 0 || p.integrations.length > 0,
    render: (el) => {
      el.innerHTML = '<div data-a></div><div data-b style="margin-top:16px"></div>';
      renderCollection($('[data-a]', el), 'entities', { heading: false, title: 'Data entities', addLabel: 'Add entity' });
      renderCollection($('[data-b]', el), 'integrations', { heading: false, title: 'External interfaces', addLabel: 'Add interface' });
    },
  },
  {
    id: 'rules', title: 'Business rules & assumptions', short: 'Policies and conditions', optional: true,
    lead: 'Capture the policies and calculations the system must enforce, plus the assumptions the SRS depends on.',
    tips: [['Business rule', 'Exact values: “A loan must be between R 5 000 and R 250 000.”'], ['Assumption', 'Something believed true but not yet confirmed: “Customers already have a verified online banking login.”'], ['Tip', 'Link each rule to the requirements that enforce it.']],
    done: (p) => p.rules.length > 0,
    render: (el) => {
      el.innerHTML = '<div data-a></div><div data-b style="margin-top:16px"></div>';
      renderCollection($('[data-a]', el), 'rules', { heading: false, title: 'Business rules', addLabel: 'Add business rule' });
      renderCollection($('[data-b]', el), 'raid', { heading: false, title: 'Assumptions & dependencies', addLabel: 'Add assumption', where: (r) => r.type === 'Assumption' || r.type === 'Dependency', preset: { type: 'Assumption' }, noFilters: true, stateKey: 'wiz-raid' });
    },
  },
  {
    id: 'review', title: 'Review & export', short: 'Check and download',
    lead: 'Check that nothing is missing, read the finished SRS, then download it for sign-off.',
    tips: [['Before sign-off', 'Every required step should be green and every requirement free of warnings.'], ['Formats', 'Word for review and comments, PDF for sign-off, Markdown for version control.'], ['Next', 'After approval, increase the version number and log later changes as change requests.']],
    done: () => false,
    render: (el, p) => reviewStep(el, p),
  },
];

/** Autosaving form for meta / charter fields. */
function formStep(el, p, key, fields) {
  el.innerHTML = `<section class="card">${renderForm(fields, p[key], p)}</section>`;
  const form = $('form', el);
  let t;
  const save = () => update((pr) => (pr[key] = { ...pr[key], ...readForm(form, fields) }), { quiet: true, typing: true });
  form.addEventListener('input', () => (clearTimeout(t), (t = setTimeout(() => (save(), refreshNav()), 300))));
  form.addEventListener('change', () => (save(), refreshNav()));
}

let refreshNav = () => {};

function reviewStep(el, p) {
  const fr = reqsOf(p, 'Functional'), nfr = reqsOf(p, 'Non-functional');
  const issues = p.requirements.map((r) => [r, lintRequirement(r, p)]).filter(([, l]) => l.length);
  const checks = [
    ...STEPS.slice(0, -1).map((s, i) => [s.done(p), `Step ${i + 1}: ${s.title}${s.optional ? ' (optional)' : ''}`, i + 1, s.optional, todo(s, p).map(([m]) => m)]),
    [fr.every((r) => (r.acceptance || []).length), 'Every functional requirement has acceptance criteria', 5],
    [['Performance', 'Security'].every((c) => nfr.some((r) => r.category === c)), 'Performance and Security NFRs present', 6],
    [!issues.length, `No requirement quality warnings (${issues.length} to fix)`, 5],
    [p.stakeholders.some((s) => s.approver), 'At least one approver for sign-off', 4],
  ];
  const doc = buildDoc(p, 'srs');
  el.innerHTML = `
    <div class="grid g2">
      <section class="card"><h2 style="margin-bottom:8px">Completeness checklist</h2>
        <ul class="checklist">${checks.map(([ok, label, step, opt, why]) => `<li><span class="${ok ? 'ok' : 'no'}">${ok ? '✔' : opt ? '○' : '✖'}</span><span class="grow">${esc(label)}${!ok && why && why.length ? `<span class="small" style="display:block;color:var(--red-2)">${why.slice(0, 3).map(esc).join('<br>')}${why.length > 3 ? `<br>…and ${why.length - 3} more` : ''}</span>` : ''}</span>${ok ? '' : `<a href="#/srs/${step}">${opt ? 'Add' : 'Fix'} →</a>`}</li>`).join('')}</ul>
      </section>
      <section class="card"><h2 style="margin-bottom:8px">Download your SRS</h2>
        <p class="muted small">${fr.length} functional and ${nfr.length} quality requirements, ${p.usecases.length} use cases, ${p.entities.length} data entities.</p>
        <div class="row" style="margin:12px 0">
          <button class="btn primary lg" data-word>Download Word (.doc)</button>
          <button class="btn lg" data-pdf>PDF / print</button>
          <button class="btn lg" data-md>Markdown</button>
        </div>
        ${issues.length ? `<div class="callout warn"><b>${issues.length} requirement(s) still have warnings:</b><ul class="lint">${issues.slice(0, 8).map(([r, l]) => `<li><a href="#" data-open="${esc(r.id)}">${esc(r.code)}</a>: ${esc(l.join(' · '))}</li>`).join('')}${issues.length > 8 ? `<li>…and ${issues.length - 8} more</li>` : ''}</ul></div>` : '<div class="callout">✓ All requirements pass the quality checks.</div>'}
        <p class="small" style="margin-top:12px"><a href="#/docs/usecases">Use case specification</a> · <a href="#/docs/rtm">Traceability matrix</a> · <a href="#/docs/data">Data dictionary</a> · <a href="#/settings">OpenAPI / SQL exports</a></p>
      </section>
    </div>
    <h2 style="margin:20px 0 10px">Preview</h2>
    <article class="paper" data-paper>${mdToHtml(doc.markdown)}</article>`;
  import('./documents.js').then(({ docHtml }) => {
    const base = `${fileSafe(p.meta.code || p.meta.name)}_SRS_v${fileSafe(p.meta.version || '0.1')}`;
    $('[data-word]', el).onclick = async (e) => {
      e.target.disabled = true;
      try { download(await docHtml(p, 'srs', 'png'), `${base}.doc`, 'application/msword'); toast('SRS downloaded'); } catch (err) { toast(err.message, 'err'); } finally { e.target.disabled = false; }
    };
    $('[data-md]', el).onclick = () => download(doc.markdown, `${base}.md`, 'text/markdown');
    $('[data-pdf]', el).onclick = () => window.print();
  });
  import('../mermaid.js').then(async ({ render }) => {
    for (const box of $$('.mmd', el)) {
      try { box.innerHTML = await render(box.dataset.code); } catch (e) { box.innerHTML = `<pre>${esc(e.message)}</pre>`; }
    }
  });
}

/** "+ New SRS": name the system, create a fresh project, start at step 1. */
export function startNewSrs() {
  const m = modal({
    title: 'Start a new SRS',
    body: `<p class="muted" style="margin-top:0">You will be guided through ${STEPS.length} short steps. Everything saves automatically, and you can leave and come back at any time.</p>
      <div class="form"><label class="field full"><span>What is the system called?</span><input type="text" data-n placeholder="e.g. Online Loan Application"></label>
      <label class="field"><span>Short code (optional)</span><input type="text" data-c placeholder="e.g. OLA" maxlength="8"></label></div>`,
    footer: '<span class="grow"></span><button class="btn" data-x2>Cancel</button><button class="btn primary" data-go>Start step 1 →</button>',
  });
  const go = () => {
    const name = $('[data-n]', m.el).value.trim();
    if (!name) return toast('Give the system a name first', 'err');
    newProject(name);
    const code = $('[data-c]', m.el).value.trim().toUpperCase();
    update((pr) => {
      pr.meta.code = code;
      pr.meta.version = '0.1';
    }, { quiet: true });
    m.close();
    location.hash = '#/srs/1';
  };
  $('[data-go]', m.el).onclick = go;
  $('[data-n]', m.el).addEventListener('keydown', (e) => e.key === 'Enter' && go());
  $('[data-x2]', m.el).onclick = m.close;
}

export function renderWizard(root, stepNo) {
  const p = project();
  const i = Math.min(STEPS.length, Math.max(1, parseInt(stepNo, 10) || 1)) - 1;
  const step = STEPS[i];
  const required = STEPS.filter((s) => !s.optional && s.id !== 'review');
  const doneCount = required.filter((s) => s.done(p)).length;
  const pct = Math.round((doneCount / required.length) * 100);
  root.innerHTML = `
    <div class="wiz">
      <nav class="card flush" aria-label="SRS steps">
        <div style="padding:14px 14px 6px"><div class="small muted">SRS for</div><b>${esc(p.meta.name || 'Untitled')}</b>
          <div class="bar" style="margin:10px 0 4px"><i style="width:${pct}%"></i></div><div class="small muted" data-pct>${doneCount} of ${required.length} required steps done</div></div>
        <ol class="wiz-steps" data-steps></ol>
      </nav>
      <div>
        <header class="wiz-head"><div class="step-no">Step ${i + 1} of ${STEPS.length}${step.optional ? ' · optional' : ''}</div><h1>${esc(step.title)}</h1><p>${esc(step.lead)}</p></header>
        <div class="why">${step.tips.map(([h, t]) => `<div><b>${esc(h)}</b>${esc(t)}</div>`).join('')}</div>
        <div data-todo></div>
        <div data-body></div>
        <footer class="wiz-foot">
          ${i > 0 ? `<a class="btn" href="#/srs/${i}">← Back</a>` : '<span></span>'}
          <span class="grow small muted" data-state></span>
          ${i < STEPS.length - 1 ? `${step.optional ? `<a class="btn ghost" href="#/srs/${i + 2}">Skip</a>` : ''}<a class="btn primary lg" href="#/srs/${i + 2}" data-next>Next: ${esc(STEPS[i + 1].title)} →</a>` : '<a class="btn primary" href="#/docs/srs">Open in Documents</a>'}
        </footer>
      </div>
    </div>`;
  refreshNav = () => {
    const pr = project();
    const n = required.filter((s) => s.done(pr)).length;
    $('.bar i', root).style.width = `${Math.round((n / required.length) * 100)}%`;
    $('[data-pct]', root).textContent = `${n} of ${required.length} required steps done`;
    $('[data-steps]', root).innerHTML = STEPS.map((s, k) => `<li class="${s.done(pr) ? 'done' : ''}"><a href="#/srs/${k + 1}" class="${k === i ? 'on' : ''}" ${k === i ? 'aria-current="step"' : ''}><span class="num">${s.done(pr) ? '✓' : k + 1}</span><span class="lbl">${esc(s.title)}<br><span class="small muted">${esc(s.short)}</span></span></a></li>`).join('');
    const ok = step.done(pr);
    const st = $('[data-state]', root);
    const td = $('[data-todo]', root);
    td.innerHTML = todoHtml(step, pr);
    if (step.id !== 'review') st.innerHTML = ok ? '<span style="color:var(--ok)">✔ This step is complete</span>' : step.optional ? 'Optional — add what applies, or skip' : '<span style="color:var(--red-2)">● Not finished yet — you can still continue and come back</span>';
  };
  refreshNav();
  step.render($('[data-body]', root), p);
  $('.wiz', root).addEventListener('click', (e) => {
    const a = e.target.closest('[data-open]');
    if (a) (e.preventDefault(), openItem('requirements', a.dataset.open));
  });
}
