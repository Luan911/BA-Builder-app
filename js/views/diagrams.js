// Generated diagrams: pick one, zoom / fit / search, click a box to open it, export SVG / PNG / Mermaid,
// copy into the studio, or use the focus view to see one item and everything linked to it.
import { project, update, getSettings, saveSettings } from '../store.js';
import { esc, $, $$, toast, download, fileSafe } from '../ui.js';
import { allDiagrams, focusGraph, FOCUS_TYPES, nodeId } from '../gen/diagrams.js';
import { render, sized, svgToPng, canTidy } from '../mermaid.js';
import { uid } from '../model.js';
import { openItem } from './collection.js';

let zoom = 1;
let fit = true;
let lanes = true;
const focus = { coll: 'requirements', id: '', depth: 2 };

/** Link to the focus view for an item (used by editors and other screens). */
export const focusHref = (coll, id) => `#/diagrams/${encodeURIComponent(`focus:${coll}:${id}`)}`;

export function renderDiagrams(root, key) {
  const p = project();
  const all = allDiagrams(p).filter((d) => d.def.id !== 'custom');
  const focusDef = { key: 'focus', def: { id: 'focus', group: 'Explore', edit: '#/trace' }, title: 'Focus: an item and its links' };
  let cur;
  if (String(key || '').startsWith('focus')) {
    const [, coll, id, depth] = String(key).split(':');
    if (coll && FOCUS_TYPES[coll]) focus.coll = coll;
    if (id) focus.id = id;
    if (depth) focus.depth = Math.max(1, Math.min(4, +depth || 2));
    if (!focus.id || !p[focus.coll].some((x) => x.id === focus.id)) focus.id = p[focus.coll][0]?.id || '';
    cur = { ...focusDef, code: focusGraph(p, focus.coll, focus.id, focus.depth) };
  } else {
    cur = all.find((d) => d.key === key) || all.find((d) => d.def.id === key) || all[0];
  }
  if (cur.def.id === 'process' && !lanes) {
    const proc = p.processes.find((x) => cur.key.endsWith(x.id));
    cur.code = cur.def.build(p, proc, { lanes: false, direction: 'TD' });
  }
  const groups = [...new Set(all.map((d) => d.def.group))];
  const nav = `<div class="nav-label">Explore</div><a href="#/diagrams/focus" class="${cur.key === 'focus' ? 'on' : ''}">Focus: an item and its links</a>` +
    groups.map((g) => `<div class="nav-label">${esc(g)}</div>${all.filter((d) => d.def.group === g).map((d) => `<a href="#/diagrams/${encodeURIComponent(d.key)}" class="${d.key === cur.key ? 'on' : ''}">${esc(d.def.parts ? d.title.replace(/^[^—]+— /, '') : d.title)}</a>`).join('')}`).join('');
  const focusBar = cur.key === 'focus' ? `<div class="row" style="padding:10px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">
      <label class="small muted">Show</label>
      <select data-fc style="max-width:170px">${Object.entries(FOCUS_TYPES).filter(([k]) => p[k].length).map(([k, t]) => `<option value="${k}" ${k === focus.coll ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
      <select data-fi style="max-width:340px">${p[focus.coll].map((x) => `<option value="${esc(x.id)}" ${x.id === focus.id ? 'selected' : ''}>${esc(FOCUS_TYPES[focus.coll].name(x).slice(0, 80))}</option>`).join('')}</select>
      <label class="small muted">Links away</label>
      <select data-fd style="width:auto">${[1, 2, 3, 4].map((n) => `<option ${n === focus.depth ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <span class="small muted">Click any box to focus on it; double-click to edit it.</span></div>` : '';
  root.innerHTML = `
    <div class="page-head"><div><h1>Diagrams</h1><p>Generated from your analysis, so they always match the documents. Big models are also split into readable parts. Use Focus to see one item and everything linked to it.</p></div></div>
    <div class="docs">
      <nav class="card doc-list" aria-label="Diagrams">${nav}</nav>
      <section class="card flush" style="min-width:0">
        <div class="card-head" style="flex-wrap:wrap"><h2>${esc(cur.title)}</h2><span class="grow"></span>
          ${cur.def.id === 'process' ? `<label class="row small"><input type="checkbox" data-lanes ${lanes ? 'checked' : ''}> Swimlanes</label>` : ''}
          <input type="search" data-find placeholder="Find a box…" style="max-width:150px" aria-label="Find a box in the diagram">
          <a class="btn sm" href="${cur.def.edit}">Edit data</a>
          ${canTidy(cur.code) ? `<label class="row small" title="Square-cornered lines and fewer crossings. Also used in exported documents."><input type="checkbox" data-tidy ${getSettings().tidy ? 'checked' : ''}> Tidy layout</label>` : ''}
          <button class="btn sm ${fit ? 'primary' : ''}" data-fit title="Fit the diagram to the width">Fit</button>
          <button class="btn sm" data-z="-1" aria-label="Zoom out">−</button><button class="btn sm" data-z="1" aria-label="Zoom in">+</button>
          <button class="btn sm" data-svg>SVG</button><button class="btn sm" data-png>PNG</button><button class="btn sm" data-mmd>Mermaid</button>
          <button class="btn sm" data-copy>Customise in studio</button>
        </div>
        ${focusBar}
        <div class="stage" data-stage>Drawing…</div>
        <details style="padding:10px 16px"><summary class="small muted">Diagram source (Mermaid)</summary><pre class="code" style="margin-top:8px">${esc(cur.code)}</pre></details>
      </section>
    </div>`;
  const stage = $('[data-stage]', root);
  let svg = '';
  const applyZoom = () => {
    const el = $('svg', stage);
    if (!el) return;
    const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    el.style.maxWidth = 'none';
    if (fit) el.style.width = `${Math.min(vb[2] || 800, stage.clientWidth - 24)}px`;
    else if (vb[2]) el.style.width = `${vb[2] * zoom}px`;
    el.style.height = 'auto';
  };
  const t0 = performance.now();
  stage.innerHTML = '<div class="muted" style="padding:16px">Drawing…</div>';
  render(cur.code, { tidy: !!getSettings().tidy }).then((s) => {
    svg = s;
    stage.innerHTML = s;
    applyZoom();
    if (performance.now() - t0 > 4000) toast('Large diagram: try Focus or the split parts for a quicker view');
  }).catch((e) => (stage.innerHTML = `<div class="err">${esc(e.message)}</div>`));

  $$('[data-z]', root).forEach((b) => (b.onclick = () => {
    if (fit) { const el = $('svg', stage); const vb = (el?.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number); zoom = el && vb[2] ? el.getBoundingClientRect().width / vb[2] : 1; fit = false; $('[data-fit]', root).classList.remove('primary'); }
    zoom = Math.max(0.2, Math.min(4, zoom * (+b.dataset.z > 0 ? 1.25 : 0.8)));
    applyZoom();
  }));
  $('[data-fit]', root).onclick = (e) => { fit = !fit; e.target.classList.toggle('primary', fit); applyZoom(); };

  // find a box: highlight every match and scroll to the first
  $('[data-find]', root).addEventListener('input', (e) => {
    const qy = e.target.value.trim().toLowerCase();
    $$('.hit', stage).forEach((n) => n.classList.remove('hit'));
    if (!qy) return;
    const nodes = $$('g.node, g[id^="entity-"], g.classGroup, g[id^="classId-"], g.actor, rect.actor', stage).filter((n) => (n.textContent || '').toLowerCase().includes(qy));
    nodes.forEach((n) => n.classList.add('hit'));
    nodes[0]?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    if (!nodes.length) toast('No box matches', 'err');
  });

  // click a box to open the item behind it (focus view: click = refocus, double-click = edit)
  const PRE = Object.fromEntries(Object.entries(FOCUS_TYPES).map(([k, t]) => [t.pre, k]));
  const itemFor = (target) => {
    const g = target.closest('g.node, g[id^="entity-"], g[id^="classId-"]');
    if (!g) return null;
    const raw = g.id || '';
    const flow = raw.match(/^flowchart-(.+)-\d+$/);
    if (flow) {
      const [pre] = flow[1].split('_');
      const coll = PRE[pre];
      const x = coll && p[coll].find((it) => nodeId(pre, it.id) === flow[1]);
      if (x) return [coll, x.id];
    }
    const name = raw.replace(/^(entity|classId)-/, '').replace(/-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/, '');
    const e = p.entities.find((x) => x.name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') === name);
    return e ? ['entities', e.id] : null;
  };
  stage.addEventListener('click', (e) => {
    const hit = itemFor(e.target);
    if (!hit) return;
    if (cur.key === 'focus') location.hash = focusHref(hit[0], hit[1]);
    else openItem(hit[0], hit[1]);
  });
  stage.addEventListener('dblclick', (e) => { const hit = itemFor(e.target); if (hit && cur.key === 'focus') openItem(hit[0], hit[1]); });
  stage.addEventListener('mouseover', (e) => { const g = itemFor(e.target); stage.style.cursor = g ? 'pointer' : ''; });

  if (cur.key === 'focus') {
    $('[data-fc]', root).onchange = (e) => (location.hash = focusHref(e.target.value, p[e.target.value][0]?.id || ''));
    $('[data-fi]', root).onchange = (e) => (location.hash = focusHref(focus.coll, e.target.value));
    $('[data-fd]', root).onchange = (e) => (location.hash = `#/diagrams/${encodeURIComponent(`focus:${focus.coll}:${focus.id}:${e.target.value}`)}`);
  }
  $('[data-tidy]', root)?.addEventListener('change', (e) => saveSettings({ tidy: e.target.checked }));
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
