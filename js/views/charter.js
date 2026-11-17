// Project details + charter (vision & scope). Autosaves while typing.
import { project, update } from '../store.js';
import { $, renderForm, readForm } from '../ui.js';

const META = [
  { key: 'name', label: 'Project name', req: true }, { key: 'code', label: 'Short code', ph: 'e.g. DLO' },
  { key: 'client', label: 'Client / business unit' }, { key: 'sponsor', label: 'Sponsor' },
  { key: 'analyst', label: 'Business analyst' }, { key: 'version', label: 'Document version' },
  { key: 'methodology', label: 'Methodology', type: 'select', options: ['Agile (Scrum)', 'Agile (Kanban)', 'Waterfall', 'Hybrid', 'SAFe'] }, { key: 'domain', label: 'Domain / industry' },
  { key: 'summary', label: 'Executive summary', type: 'textarea', rows: 3 },
];
const CHARTER = [
  { key: 'problem', label: 'Problem statement / opportunity', type: 'textarea', rows: 4, help: 'What is wrong today, for whom, and what it costs. Use numbers.' },
  { key: 'vision', label: 'Vision statement', type: 'textarea', rows: 2 },
  { key: 'scopeIn', label: 'In scope', type: 'list' }, { key: 'scopeOut', label: 'Out of scope', type: 'list' },
  { key: 'successCriteria', label: 'Success criteria', type: 'list', rows: 3 }, { key: 'constraints', label: 'Constraints', type: 'list', rows: 3 },
  { key: 'budget', label: 'Budget' }, { key: 'deadline', label: 'Target date', type: 'date' },
];

export function renderCharter(root) {
  const p = project();
  root.innerHTML = `
    <div class="page-head"><div><h1>Project charter</h1><p>Project details, problem, vision and scope. Changes save automatically.</p></div><span class="grow"></span><a class="btn" href="#/docs/charter">View charter document</a></div>
    <section class="card"><h2 style="margin-bottom:12px">Project details</h2><div data-meta>${renderForm(META, p.meta, p)}</div></section>
    <section class="card"><h2 style="margin-bottom:12px">Vision & scope</h2><div data-ch>${renderForm(CHARTER, p.charter, p)}</div></section>`;
  const wire = (sel, fields, key) => {
    const el = $(sel, root);
    let t;
    const save = () => update((pr) => (pr[key] = { ...pr[key], ...readForm(el, fields) }), { quiet: true, typing: true });
    el.addEventListener('input', () => (clearTimeout(t), (t = setTimeout(save, 300))));
    el.addEventListener('change', save);
  };
  wire('[data-meta]', META, 'meta');
  wire('[data-ch]', CHARTER, 'charter');
}
