// Diagrams: rendered from project data, with a spoken "Describe diagram" and exports.
import { getProject, getEvaluation, getSettings } from '../store.js';
import { DIAGRAM_DEFS, buildDiagram } from '../generators/diagrams.js';
import { renderMermaid, svgToPng, exportableSvg, downloadBlob, downloadText } from '../export.js';
import { esc, icon, $, $$, readAloudBar, toast } from '../ui/dom.js';
import { slug } from '../model.js';

const EDIT_LINK = {
  process: ['#/s/processes', 'Edit processes'],
  sequence: ['#/s/processes', 'Edit processes'],
  erd: ['#/s/entities', 'Edit data model'],
  architecture: ['#/s/components', 'Edit architecture'],
  usecase: ['#/s/requirements', 'Edit requirements'],
  lifecycle: ['#/lifecycle', 'Open lifecycle'],
  roadmap: ['#/s/releases', 'Edit releases'],
};

export function renderDiagrams(root, kind, procId) {
  const p = getProject();
  const ev = getEvaluation();
  const def = DIAGRAM_DEFS.find((d) => d.id === kind) || DIAGRAM_DEFS[0];
  const proc = p.processes.find((x) => x.id === procId) || p.processes[0];
  const needsProcess = def.perProcess && !proc;
  const dg = needsProcess ? null : buildDiagram(p, ev, def.id, proc?.id, { lanes: getSettings().lanes });
  let svgCache = '';
  let zoom = 1;

  root.innerHTML = `
    <header class="page-head">
      <div class="eyebrow">Outputs</div>
      <h1>${icon('shapes', 22)} Diagrams</h1>
      <p class="lead">Drawn automatically from your data, so they always match the documents. To change a diagram, change the data behind it.</p>
    </header>
    <div class="tabs" role="tablist">${DIAGRAM_DEFS.map(
      (d) => `<a role="tab" href="#/diagrams/${d.id}${d.perProcess && proc ? `/${proc.id}` : ''}" class="${d.id === def.id ? 'active' : ''}" aria-selected="${d.id === def.id}">${esc(d.title)}</a>`
    ).join('')}</div>
    <section class="card flush diagram-card">
      <div class="doc-toolbar">
        <div class="tb-left">
          ${def.perProcess && p.processes.length > 1 ? `<select data-proc aria-label="Process">${p.processes.map((x) => `<option value="${x.id}" ${x.id === proc?.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
          <a class="btn sm ghost" href="${EDIT_LINK[def.id][0]}">${icon('edit', 14)}<span>${EDIT_LINK[def.id][1]}</span></a>
        </div>
        <div class="tb-right">
          <button class="icon-btn sm" data-zoom="-1" aria-label="Zoom out">${icon('zoomOut', 16)}</button>
          <button class="icon-btn sm" data-zoom="1" aria-label="Zoom in">${icon('zoomIn', 16)}</button>
          <button class="btn sm" data-code>${icon('code', 14)}<span>Mermaid</span></button>
          <button class="btn sm" data-svg>${icon('download', 14)}<span>SVG</span></button>
          <button class="btn sm primary" data-png>${icon('image', 14)}<span>PNG</span></button>
        </div>
      </div>
      <div class="diagram-stage" data-stage>${needsProcess ? `<div class="empty-block"><p>No processes yet.</p><a class="btn sm" href="#/s/processes">${icon('plus', 14)}<span>Map a process</span></a></div>` : '<div class="loading"><span class="spinner"></span> Drawing…</div>'}</div>
      <pre class="code-view" data-codeview hidden><code>${esc(dg?.code || '')}</code></pre>
    </section>
    ${
      dg
        ? `<section class="card describe">
            <div class="describe-head"><h2 class="card-title">${icon('volume', 16)} Describe diagram</h2><div data-tts></div></div>
            <p class="describe-text">${esc(dg.description)}</p>
          </section>`
        : ''
    }`;

  $('[data-proc]', root)?.addEventListener('change', (e) => (location.hash = `#/diagrams/${def.id}/${e.target.value}`));
  if (!dg) return;
  $('[data-tts]', root).appendChild(readAloudBar(() => dg.description, 'diagram description'));

  const stage = $('[data-stage]', root);
  renderMermaid(dg.code)
    .then((svg) => {
      svgCache = svg;
      stage.innerHTML = `<div class="svg-wrap">${svg}</div>`;
      // Open fitted to the available width (never enlarged beyond 100%).
      const vb = ($('svg', stage)?.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      if (vb.length === 4 && vb[2] > 0) zoom = Math.max(0.3, Math.min(1, (stage.clientWidth - 48) / vb[2]));
      applyZoom();
    })
    .catch((e) => {
      stage.innerHTML = `<div class="callout err">${icon('alert', 16)}<span>${esc(e.message || 'The diagram could not be drawn.')}</span></div>`;
    });

  function applyZoom() {
    const svg = $('svg', stage);
    if (!svg) return;
    svg.style.maxWidth = 'none';
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (vb.length === 4) svg.style.width = `${vb[2] * zoom}px`;
  }
  $$('[data-zoom]', root).forEach((b) =>
    b.addEventListener('click', () => {
      zoom = Math.min(3, Math.max(0.3, zoom + Number(b.dataset.zoom) * 0.2));
      applyZoom();
    })
  );
  $('[data-code]', root).addEventListener('click', () => {
    const v = $('[data-codeview]', root);
    v.hidden = !v.hidden;
  });
  const name = slug(dg.title);
  $('[data-svg]', root).addEventListener('click', () => {
    if (!svgCache) return toast('The diagram is still drawing.', 'info');
    downloadText(exportableSvg(svgCache), `${name}.svg`, 'image/svg+xml');
  });
  $('[data-png]', root).addEventListener('click', async () => {
    if (!svgCache) return toast('The diagram is still drawing.', 'info');
    try {
      const { canvas } = await svgToPng(svgCache, 2.5);
      canvas.toBlob((b) => b && downloadBlob(b, `${name}.png`), 'image/png');
    } catch (e) {
      toast(e.message, 'err');
    }
  });
}
