// Project details + charter (vision & scope). Autosaves while typing.
import { project, update } from '../store.js';
import { $, renderForm, readForm } from '../ui.js';
import { renderCollection } from './collection.js';

const META = [
  { key: 'name', label: 'Project name', req: true }, { key: 'code', label: 'Short code', ph: 'e.g. DLO' },
  { key: 'client', label: 'Client / business unit' }, { key: 'specStyle', label: 'Specify the work as', type: 'select', options: ['Both', 'User stories', 'Requirements'], blank: false, help: 'Agile teams usually use user stories; formal SRS work uses requirements. Simple mode shows only the one you choose.' },
  { key: 'summary', label: 'Executive summary', type: 'textarea', rows: 3 },
  { key: 'sponsor', label: 'Sponsor', adv: true }, { key: 'analyst', label: 'Business analyst', adv: true }, { key: 'version', label: 'Document version', adv: true },
  { key: 'methodology', label: 'Methodology', type: 'select', options: ['Agile (Scrum)', 'Agile (Kanban)', 'Waterfall', 'Hybrid', 'SAFe'], adv: true }, { key: 'domain', label: 'Domain / industry', adv: true },
];
const CHARTER = [
  { key: 'problem', label: 'Problem statement / opportunity', type: 'textarea', rows: 4, help: 'What is wrong today, for whom, and what it costs. Use numbers.' },
  { key: 'vision', label: 'Vision statement', type: 'textarea', rows: 2 },
  { key: 'scopeIn', label: 'In scope', type: 'list' }, { key: 'scopeOut', label: 'Out of scope', type: 'list' },
  { key: 'constraints', label: 'Constraints', type: 'list', rows: 3 }, { key: 'deadline', label: 'Target date', type: 'date' },
  { key: 'successCriteria', label: 'Success criteria', type: 'list', rows: 3, adv: true }, { key: 'budget', label: 'Budget', adv: true },
];

export function renderCharter(root) {
  const p = project();
  root.innerHTML = `
    <div class="page-head"><div><h1>Project brief</h1><p>What the project is, the problem, the vision, what is in and out of scope, and the measurable objectives. Changes save automatically.</p></div><span class="grow"></span><a class="btn" href="#/docs/core-brief">Discovery & Scope Brief</a></div>
    <section class="card"><h2 style="margin-bottom:12px">Project details</h2><div data-meta>${renderForm(META, p.meta, p)}</div></section>
    <section class="card"><h2 style="margin-bottom:12px">Problem, vision & scope</h2><div data-ch>${renderForm(CHARTER, p.charter, p)}</div></section>
    <div data-obj style="margin-top:16px"></div>`;
  const wire = (sel, fields, key) => {
    const el = $(sel, root);
    let t;
    const save = () => update((pr) => (pr[key] = { ...pr[key], ...readForm(el, fields) }), { quiet: true, typing: true });
    el.addEventListener('input', () => (clearTimeout(t), (t = setTimeout(save, 300))));
    el.addEventListener('change', save);
  };
  wire('[data-meta]', META, 'meta');
  wire('[data-ch]', CHARTER, 'charter');
  renderCollection($('[data-obj]', root), 'objectives', { heading: false, title: 'Measurable objectives', addLabel: 'Add objective' });
}
