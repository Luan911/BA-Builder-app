// App shell: navigation, routing, project switcher, undo.
import { load, project, projects, subscribe, switchProject, undo, saved } from './store.js';
import { esc, $, $$, toast } from './ui.js';
import { renderCollection } from './views/collection.js';
import { renderDashboard } from './views/dashboard.js';
import { renderCharter } from './views/charter.js';
import { renderStrategy } from './views/strategy.js';
import { renderBusinessCase } from './views/businesscase.js';
import { renderEstimate } from './views/estimate.js';
import { renderStakeholders } from './views/stakeholders.js';
import { renderBoard } from './views/board.js';
import { renderPrioritise } from './views/prioritise.js';
import { renderTrace } from './views/trace.js';
import { renderDiagrams } from './views/diagrams.js';
import { renderStudio } from './views/studio.js';
import { renderCanvas } from './views/canvas.js';
import { renderDocuments } from './views/documents.js';
import { renderSettings } from './views/settings.js';
import { renderDecisionTables } from './views/decisiontables.js';
import { renderWizard, startNewSrs } from './views/wizard.js';

// [route, label, count-key]
const NAV = [
  ['Overview', [['', 'Dashboard'], ['srs', 'SRS wizard (step by step)'], ['charter', 'Project charter']]],
  ['Strategy', [['c/objectives', 'Objectives', 'objectives'], ['strategy', 'SWOT & PESTLE'], ['c/gaps', 'Gap analysis', 'gaps'], ['business-case', 'Business case'], ['estimate', 'Cost & time estimate', 'workItems']]],
  ['Stakeholders', [['stakeholders', 'Stakeholders & RACI', 'stakeholders'], ['c/personas', 'Personas & actors', 'personas'], ['c/elicitation', 'Elicitation sessions', 'elicitation'], ['c/questions', 'Open questions', 'questions']]],
  ['Requirements', [['c/requirements', 'Requirements', 'requirements'], ['c/stories', 'User stories', 'stories'], ['board', 'Backlog board'], ['prioritise', 'Prioritisation'], ['c/usecases', 'Use cases', 'usecases'], ['c/rules', 'Business rules', 'rules'], ['decision-tables', 'Decision tables', 'decisionTables'], ['c/tests', 'Test cases (UAT)', 'tests'], ['trace', 'Traceability']]],
  ['Solution design', [['c/processes', 'Process models', 'processes'], ['data', 'Data model', 'entities'], ['c/states', 'State machines', 'states'], ['c/apis', 'API endpoints', 'apis'], ['c/integrations', 'Integrations', 'integrations']]],
  ['Control', [['c/raid', 'RAID log', 'raid'], ['c/decisions', 'Decision log', 'decisions'], ['c/changes', 'Change requests', 'changes'], ['c/releases', 'Releases', 'releases'], ['c/glossary', 'Glossary', 'glossary']]],
  ['Outputs', [['diagrams', 'Diagrams'], ['studio', 'Diagram studio', 'diagrams'], ['canvas', 'Whiteboard', 'canvases'], ['docs', 'Documents'], ['settings', 'Projects & export']]],
];

function shell() {
  $('#app').innerHTML = `
    <div class="layout">
      <aside class="side" aria-label="Navigation">
        <div class="brand"><i>BA</i> BA Builder</div>
        <div class="cta"><button class="btn primary" data-newsrs style="width:100%;justify-content:center">+ New SRS</button></div>
        <nav>${NAV.map(([g, items]) => `<div class="nav-group"><div class="nav-label">${esc(g)}</div>${items.map(([r, l, k]) => `<a class="nav" href="#/${r}" data-r="${r}">${esc(l)}${k ? `<span class="cnt" data-cnt="${k}"></span>` : ''}</a>`).join('')}</div>`).join('')}</nav>
      </aside>
      <div class="scrim" data-scrim></div>
      <div class="main">
        <header class="top">
          <button class="btn sm menu-btn" data-menu aria-label="Menu">☰</button>
          <select data-proj aria-label="Current project"></select>
          <span class="muted small" data-saved></span>
          <span class="grow"></span>
          <button class="btn sm" data-undo title="Undo (Ctrl+Z)">↶ Undo</button>
        </header>
        <main id="view" tabindex="-1"></main>
      </div>
    </div>`;
  $('[data-menu]').onclick = () => document.body.classList.toggle('nav-open');
  $('[data-scrim]').onclick = () => document.body.classList.remove('nav-open');
  $('[data-undo]').onclick = () => toast(undo() ? 'Undone' : 'Nothing to undo');
  $('[data-newsrs]').onclick = () => startNewSrs();
  $('[data-proj]').onchange = (e) => (e.target.value === '__manage' ? (location.hash = '#/settings') : switchProject(e.target.value));
}

function chrome() {
  const p = project();
  $('[data-proj]').innerHTML = projects().map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.meta.name || 'Untitled project')}</option>`).join('') + '<option value="__manage">Manage projects…</option>';
  $('[data-saved]').textContent = saved ? 'All changes saved' : '⚠ Not saved — browser storage is full or blocked';
  for (const el of $$('[data-cnt]')) el.textContent = (p[el.dataset.cnt] || []).length || '';
  document.title = `${p.meta.name ? `${p.meta.name} · ` : ''}BA Builder`;
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [a = '', b] = raw.split('/');
  const v = $('#view');
  try {
    if (!a) renderDashboard(v);
    else if (a === 'c' && b) renderCollection(v, b);
    else if (a === 'srs') renderWizard(v, b);
    else if (a === 'charter') renderCharter(v);
    else if (a === 'strategy') renderStrategy(v);
    else if (a === 'business-case') renderBusinessCase(v);
    else if (a === 'estimate') renderEstimate(v);
    else if (a === 'stakeholders') renderStakeholders(v);
    else if (a === 'board') renderBoard(v);
    else if (a === 'prioritise') renderPrioritise(v);
    else if (a === 'trace') renderTrace(v);
    else if (a === 'decision-tables') renderDecisionTables(v);
    else if (a === 'data') renderDataModel(v);
    else if (a === 'diagrams') renderDiagrams(v, b && decodeURIComponent(b));
    else if (a === 'studio') renderStudio(v, b);
    else if (a === 'canvas') renderCanvas(v, b);
    else if (a === 'docs') renderDocuments(v, b);
    else if (a === 'settings') renderSettings(v);
    else v.innerHTML = '<div class="empty"><h1>Page not found</h1><a href="#/">Back to dashboard</a></div>';
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="callout warn">This page could not be shown: ${esc(e.message)}</div>`;
  }
  const cur = a === 'c' ? `c/${b}` : a;
  $$('a.nav').forEach((l) => l.classList.toggle('active', l.dataset.r === cur));
  document.body.classList.remove('nav-open');
}

function renderDataModel(v) {
  v.innerHTML = `<div class="page-head"><div><h1>Data model</h1><p>Logical data model: entities with attributes, and the relationships between them. Drives the ERD, class diagram, data dictionary, SQL DDL and JSON Schema.</p></div><span class="grow"></span><a class="btn" href="#/diagrams/erd">View ERD</a></div><div data-a></div><div data-b style="margin-top:16px"></div>`;
  renderCollection($('[data-a]', v), 'entities', { heading: false });
  renderCollection($('[data-b]', v), 'relationships', { heading: false });
}

function start() {
  load();
  shell();
  chrome();
  route();
  window.addEventListener('hashchange', () => {
    route();
    window.scrollTo(0, 0);
  });
  subscribe((info) => {
    chrome();
    if (info.rerender && !document.querySelector('.backdrop')) {
      const y = window.scrollY;
      route();
      window.scrollTo(0, y);
    } else if (info.rerender) {
      // a modal is open (e.g. just saved and closing) — re-render on the next frame
      setTimeout(() => !document.querySelector('.backdrop') && route(), 0);
    }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing && !document.querySelector('.backdrop')) {
      e.preventDefault();
      toast(undo() ? 'Undone' : 'Nothing to undo');
    }
  });
}

start();
