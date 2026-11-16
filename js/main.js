// App shell: layout, navigation, router and global actions.
import { load, subscribe, getProject, getEvaluation, getSettings, updateSettings, undo, canUndo, lastSaveOk } from './store.js';
import { issuesBySection } from './rules.js';
import { esc, icon, $, $$, toast, attachMenu, busy, closeAllModals } from './ui/dom.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProject, renderSection } from './views/editor.js';
import { renderLifecycle } from './views/lifecycle.js';
import { renderDocuments } from './views/documents.js';
import { renderDiagrams } from './views/diagrams.js';
import { renderQuality } from './views/quality.js';
import { renderImport } from './views/importer.js';
import { renderSettings } from './views/settings.js';
import { generateDocs } from './generators/docs.js';
import { allDiagrams } from './generators/diagrams.js';
import { packPdf, zipPack, downloadBlob, downloadText } from './export.js';
import { stop as stopSpeech } from './speech.js';

const NAV = [
  { group: 'Overview', items: [['#/', 'Dashboard', 'dashboard', null], ['#/lifecycle', 'Lifecycle & gates', 'lifecycle', 'lifecycle']] },
  {
    group: '1 · Initiation',
    items: [
      ['#/project', 'Project & scope', 'flag', 'project'],
      ['#/s/objectives', 'Objectives', 'target', 'objectives'],
      ['#/s/stakeholders', 'Stakeholders & users', 'users', 'stakeholders'],
      ['#/s/raid', 'RAID log', 'alert', 'raid'],
      ['#/s/decisions', 'Decisions & questions', 'chat', 'decisions'],
    ],
  },
  {
    group: '2 · Requirements',
    items: [
      ['#/s/requirements', 'Functional', 'list', 'requirements'],
      ['#/s/nfrs', 'Non-functional', 'gauge', 'nfrs'],
      ['#/s/rules', 'Business rules', 'scale', 'rules'],
    ],
  },
  {
    group: '3 · Design',
    items: [
      ['#/s/entities', 'Data model', 'database', 'entities'],
      ['#/s/processes', 'Processes', 'workflow', 'processes'],
      ['#/s/integrations', 'Integrations', 'plug', 'integrations'],
      ['#/s/components', 'Architecture', 'layers', 'components'],
    ],
  },
  { group: '4 · Delivery', items: [['#/s/releases', 'Releases', 'calendar', 'releases']] },
  {
    group: 'Outputs',
    items: [
      ['#/docs', 'Documents', 'file', null],
      ['#/diagrams', 'Diagrams', 'shapes', null],
      ['#/quality', 'Quality check', 'shield', null],
    ],
  },
  { group: 'Tools', items: [['#/import', 'Import', 'upload', null], ['#/settings', 'Settings', 'settings', null]] },
];

function shell() {
  document.getElementById('app').innerHTML = `
    <a class="skip" href="#view">Skip to content</a>
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <div class="brand"><span class="brand-mark">${icon('logo', 18)}</span><span><b>AutoSpec</b> Studio</span></div>
      <nav>${NAV.map(
        (g) => `<div class="nav-group"><div class="nav-label">${esc(g.group)}</div>${g.items
          .map(([href, label, ic, section]) => `<a href="${href}" data-nav="${href}" ${section ? `data-section="${section}"` : ''}>${icon(ic, 17)}<span>${esc(label)}</span><span class="badge" hidden></span></a>`)
          .join('')}</div>`
      ).join('')}</nav>
      <div class="sidebar-foot small muted">Rule-based · no AI · runs in your browser</div>
    </aside>
    <div class="scrim" data-scrim></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" data-menu aria-label="Open navigation">${icon('menu', 20)}</button>
        <div class="tb-project"><span class="tb-name" data-pname></span><span class="pill" data-pcode></span></div>
        <span class="save-state small muted" data-save-state></span>
        <span class="grow"></span>
        <a class="score-pill" href="#/quality" data-score title="Overall readiness"></a>
        <button class="icon-btn" data-undo aria-label="Undo" title="Undo (Ctrl+Z)">${icon('undo', 18)}</button>
        <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle theme"></button>
        <button class="btn primary sm" data-export>${icon('download', 15)}<span>Export</span>${icon('chevronDown', 14)}</button>
      </header>
      <main id="view" tabindex="-1"></main>
    </div>`;

  $('[data-menu]').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('[data-scrim]').addEventListener('click', () => document.body.classList.remove('nav-open'));
  $('[data-undo]').addEventListener('click', () => (undo() ? toast('Undone', 'info') : toast('Nothing to undo', 'info')));
  $('[data-theme-toggle]').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    updateSettings({ theme: dark ? 'light' : 'dark' });
    applyTheme();
  });
  const exportBtn = $('[data-export]');
  attachMenu(exportBtn, [
    {
      label: 'Full documentation pack (PDF)', icon: 'file',
      onClick: () => busy(exportBtn, 'Building PDF…', async (progress) => {
        const p = getProject();
        const ev = getEvaluation();
        downloadBlob(await packPdf(generateDocs(p, ev), allDiagrams(p, ev, { lanes: getSettings().lanes }), p, getSettings(), progress), `${(p.meta.code || 'Project').replace(/\W+/g, '')}_Documentation_Pack.pdf`);
        toast('Documentation pack downloaded');
      }),
    },
    {
      label: 'Everything as ZIP', icon: 'folder',
      onClick: () => busy(exportBtn, 'Packaging…', async (progress) => {
        const p = getProject();
        const ev = getEvaluation();
        downloadBlob(await zipPack(p, generateDocs(p, ev), allDiagrams(p, ev, { lanes: getSettings().lanes }), getSettings(), { onProgress: progress }), `${(p.meta.code || 'Project').replace(/\W+/g, '')}_AutoSpec_Pack.zip`);
        toast('ZIP downloaded');
      }),
    },
    {
      label: 'Project file (.json)', icon: 'save',
      onClick: () => {
        const p = getProject();
        downloadText(JSON.stringify(p, null, 2), `${(p.meta.code || 'project').replace(/\W+/g, '')}_autospec.json`, 'application/json');
      },
    },
  ]);
}

function applyTheme() {
  const t = getSettings().theme;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = $('[data-theme-toggle]');
  if (btn) btn.innerHTML = icon(dark ? 'sun' : 'moon', 18);
  document.documentElement.style.setProperty('--brand', getSettings().accent || '#4f46e5');
}

function refreshChrome() {
  const p = getProject();
  const ev = getEvaluation();
  $('[data-pname]').textContent = p.meta.name || 'Untitled project';
  const code = $('[data-pcode]');
  code.textContent = p.meta.code || '';
  code.hidden = !p.meta.code;
  const sc = $('[data-score]');
  const kind = ev.score >= 80 ? 'ok' : ev.score >= 50 ? 'warn' : 'err';
  sc.className = `score-pill ${kind}`;
  sc.innerHTML = `<span class="score-dot"></span>${ev.score}% ready`;
  $('[data-undo]').disabled = !canUndo();
  $('[data-save-state]').textContent = lastSaveOk() ? 'Saved' : 'Not saved — browser storage is full or blocked';
  const counts = issuesBySection(ev);
  const gateBlockers = ev.current.errors.length;
  for (const a of $$('[data-section]')) {
    const n = a.dataset.section === 'lifecycle' ? gateBlockers : counts[a.dataset.section] || 0;
    const b = $('.badge', a);
    b.hidden = !n;
    b.textContent = n;
  }
  document.title = `${p.meta.name ? `${p.meta.name} · ` : ''}AutoSpec Studio`;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query), path: `#/${path.replace(/^\//, '')}` };
}

let lastPath = '';
function renderView() {
  const { parts, params, path } = parseHash();
  const view = $('#view');
  const samePage = path === lastPath;
  const scroll = samePage ? window.scrollY : 0;
  if (!samePage) {
    stopSpeech();
    closeAllModals();
  }
  lastPath = path;
  try {
    const [a, b, c] = parts;
    if (!a) renderDashboard(view);
    else if (a === 'project') renderProject(view);
    else if (a === 's') renderSection(view, b);
    else if (a === 'lifecycle') renderLifecycle(view, params);
    else if (a === 'docs') renderDocuments(view, b);
    else if (a === 'diagrams') renderDiagrams(view, b, c);
    else if (a === 'quality') renderQuality(view, params);
    else if (a === 'import') renderImport(view, params);
    else if (a === 'settings') renderSettings(view);
    else view.innerHTML = `<div class="empty"><h1>Page not found</h1><a class="btn" href="#/">Go to dashboard</a></div>`;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="callout err">${icon('alert', 16)}<span>This page could not be shown: ${esc(e.message)}</span></div>`;
  }
  // Highlight the active nav item (longest matching prefix).
  const hash = location.hash || '#/';
  let best = null;
  for (const link of $$('[data-nav]')) {
    const href = link.dataset.nav;
    const match = href === '#/' ? hash === '#/' || hash === '#' || hash === '' : hash.startsWith(href);
    if (match && (!best || href.length > best.dataset.nav.length)) best = link;
  }
  $$('[data-nav]').forEach((l) => {
    l.classList.toggle('active', l === best);
    if (l === best) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
  });
  document.body.classList.remove('nav-open');
  if (samePage) window.scrollTo(0, scroll);
  else {
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }
}

function start() {
  const { firstRun } = load();
  shell();
  applyTheme();
  refreshChrome();
  renderView();
  window.addEventListener('hashchange', renderView);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  subscribe((info) => {
    if (info.settings) applyTheme();
    refreshChrome();
    if (info.rerender) renderView();
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing && !$('.modal-backdrop')) {
      e.preventDefault();
      if (undo()) toast('Undone', 'info');
    }
  });
  if (firstRun) toast('This is an example project. Start your own from Settings → "Start a new blank project".', 'info', 7000);
}

start();
