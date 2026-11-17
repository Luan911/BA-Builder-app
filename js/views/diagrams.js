// Generated diagrams: pick one, zoom, export SVG / PNG / Mermaid, or copy into the studio to customise.
import { project, update } from '../store.js';
import { esc, $, $$, toast, download, fileSafe } from '../ui.js';
import { allDiagrams } from '../gen/diagrams.js';
import { render, sized, svgToPng } from '../mermaid.js';
import { uid } from '../model.js';

let zoom = 1;
let lanes = true;

export function renderDiagrams(root, key) {
  const p = project();
  const all = allDiagrams(p).filter((d) => d.def.id !== 'custom');
  const cur = all.find((d) => d.key === key) || all.find((d) => d.def.id === key) || all[0];
  if (cur.def.id === 'process' && !lanes) {
    const proc = p.processes.find((x) => cur.key.endsWith(x.id));
    cur.code = cur.def.build(p, proc, { lanes: false, direction: 'TD' });
  }
  const groups = [...new Set(all.map((d) => d.def.group))];
  root.innerHTML = `
    <div class="page-head"><div><h1>Diagrams</h1><p>Generated from your analysis, so they always match the documents. For anything else, use the Diagram studio or Whiteboard.</p></div></div>
    <div class="docs">
      <nav class="card doc-list" aria-label="Diagrams">${groups.map((g) => `<div class="nav-label">${esc(g)}</div>${all.filter((d) => d.def.group === g).map((d) => `<a href="#/diagrams/${encodeURIComponent(d.key)}" class="${d.key === cur.key ? 'on' : ''}">${esc(d.title)}</a>`).join('')}`).join('')}</nav>
      <section class="card flush">
        <div class="card-head"><h2>${esc(cur.title)}</h2><span class="grow"></span>
          ${cur.def.id === 'process' ? `<label class="row small"><input type="checkbox" data-lanes ${lanes ? 'checked' : ''}> Swimlanes</label>` : ''}
          <a class="btn sm" href="${cur.def.edit}">Edit data</a>
          <button class="btn sm" data-z="-1" aria-label="Zoom out">−</button><button class="btn sm" data-z="1" aria-label="Zoom in">+</button>
          <button class="btn sm" data-svg>SVG</button><button class="btn sm" data-png>PNG</button><button class="btn sm" data-mmd>Mermaid</button>
          <button class="btn sm primary" data-copy>Customise in studio</button>
        </div>
        <div class="stage" data-stage>Drawing…</div>
        <details style="padding:10px 16px"><summary class="small muted">Diagram source (Mermaid)</summary><pre class="code" style="margin-top:8px">${esc(cur.code)}</pre></details>
      </section>
    </div>`;
  const stage = $('[data-stage]', root);
  let svg = '';
  const applyZoom = () => {
    const el = $('svg', stage);
    if (!el) return;
    const vb = (el.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (vb[2]) el.style.width = `${vb[2] * zoom}px`;
  };
  render(cur.code).then((s) => {
    svg = s;
    stage.innerHTML = s;
    applyZoom();
  }).catch((e) => (stage.innerHTML = `<div class="err">${esc(e.message)}</div>`));
  $$('[data-z]', root).forEach((b) => (b.onclick = () => ((zoom = Math.max(0.3, Math.min(3, zoom + +b.dataset.z * 0.2))), applyZoom())));
  $('[data-lanes]', root)?.addEventListener('change', (e) => ((lanes = e.target.checked), renderDiagrams(root, cur.key)));
  const name = fileSafe(cur.title);
  const need = () => svg || (toast('Still drawing…', 'err'), '');
  $('[data-svg]', root).onclick = () => need() && download(sized(svg).svg, `${name}.svg`, 'image/svg+xml');
  $('[data-png]', root).onclick = async () => need() && download(await svgToPng(svg, 2), `${name}.png`);
  $('[data-mmd]', root).onclick = () => download(cur.code, `${name}.mmd`);
  $('[data-copy]', root).onclick = () => {
    const id = uid('dg');
    update((pr) => pr.diagrams.push({ id, name: `${cur.title} (custom)`, code: cur.code }), { quiet: true });
    location.hash = `#/studio/${id}`;
  };
}
