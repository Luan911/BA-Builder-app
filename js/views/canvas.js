// Whiteboard: free-form drag-and-drop diagrams and low-fidelity wireframes (SVG).
import { project, update } from '../store.js';
import { esc, $, $$, toast, download, fileSafe, confirmBox, pickFile } from '../ui.js';
import { svgToPng } from '../mermaid.js';
import { uid } from '../model.js';

const SHAPES = {
  Flow: [['process', 'Process', 140, 60], ['terminal', 'Start / end', 140, 50], ['decision', 'Decision', 120, 90], ['data', 'Input / output', 150, 60], ['database', 'Database', 110, 80], ['document', 'Document', 130, 70], ['actor', 'Actor', 60, 90], ['note', 'Sticky note', 150, 100], ['text', 'Text', 140, 30], ['lane', 'Swimlane', 700, 150]],
  Wireframe: [['screen', 'Screen', 360, 520], ['header', 'Header bar', 340, 44], ['button', 'Button', 120, 36], ['input', 'Text input', 240, 36], ['image', 'Image', 160, 110], ['list', 'List', 260, 120], ['checkbox', 'Checkbox', 160, 24]],
};
const FILL = { process: '#e6f6f4', terminal: '#dcfce7', decision: '#fef3c7', data: '#dbeafe', database: '#ede9fe', document: '#f1f5f9', actor: 'none', note: '#fef9c3', text: 'none', lane: '#f8fafc', screen: '#ffffff', header: '#334155', button: '#0f766e', input: '#ffffff', image: '#e2e8f0', list: '#ffffff', checkbox: 'none' };
const STROKE = '#334155';

let state = null; // { canvasId, sel: {kind, id}, zoom, panX, panY }

function shapeSvg(n) {
  const { w, h } = n;
  const f = n.fill || FILL[n.type] || '#fff';
  const s = `stroke="${STROKE}" stroke-width="1.5"`;
  switch (n.type) {
    case 'terminal': return `<rect width="${w}" height="${h}" rx="${h / 2}" fill="${f}" ${s}/>`;
    case 'decision': return `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="${f}" ${s}/>`;
    case 'data': return `<polygon points="${w * 0.15},0 ${w},0 ${w * 0.85},${h} 0,${h}" fill="${f}" ${s}/>`;
    case 'database': return `<path d="M0,10 a${w / 2},10 0 0,0 ${w},0 v${h - 20} a${w / 2},10 0 0,1 -${w},0 z" fill="${f}" ${s}/><ellipse cx="${w / 2}" cy="10" rx="${w / 2}" ry="10" fill="${f}" ${s}/>`;
    case 'document': return `<path d="M0,0 H${w} V${h - 10} Q${w * 0.75},${h - 22} ${w / 2},${h - 10} T0,${h - 10} Z" fill="${f}" ${s}/>`;
    case 'actor': return `<rect width="${w}" height="${h}" fill="transparent"/><g stroke="${STROKE}" stroke-width="2" fill="none"><circle cx="${w / 2}" cy="12" r="10"/><path d="M${w / 2},22 V${h - 38} M${w / 2 - 20},36 H${w / 2 + 20} M${w / 2},${h - 38} L${w / 2 - 16},${h - 18} M${w / 2},${h - 38} L${w / 2 + 16},${h - 18}"/></g>`;
    case 'note': return `<path d="M0,0 H${w} V${h - 16} L${w - 16},${h} H0 Z" fill="${f}" stroke="#ca8a04" stroke-width="1.2"/>`;
    case 'text': case 'checkbox': return `<rect width="${w}" height="${h}" fill="transparent" stroke="${n.type === 'checkbox' ? 'none' : '#cbd5e1'}" stroke-dasharray="3 3"/>${n.type === 'checkbox' ? `<rect x="2" y="${h / 2 - 8}" width="16" height="16" rx="3" fill="#fff" ${s}/>` : ''}`;
    case 'lane': return `<rect width="${w}" height="${h}" fill="${f}" ${s}/><rect width="34" height="${h}" fill="#e2e8f0" ${s}/>`;
    case 'screen': return `<rect width="${w}" height="${h}" rx="14" fill="${f}" stroke="#0f172a" stroke-width="2"/><rect x="${w / 2 - 30}" y="8" width="60" height="6" rx="3" fill="#cbd5e1"/>`;
    case 'header': return `<rect width="${w}" height="${h}" rx="4" fill="${f}"/>`;
    case 'button': return `<rect width="${w}" height="${h}" rx="8" fill="${f}"/>`;
    case 'input': return `<rect width="${w}" height="${h}" rx="6" fill="${f}" stroke="#94a3b8" stroke-width="1.2"/>`;
    case 'image': return `<rect width="${w}" height="${h}" fill="${f}" stroke="#94a3b8"/><path d="M0,0 L${w},${h} M${w},0 L0,${h}" stroke="#94a3b8"/>`;
    case 'list': return `<rect width="${w}" height="${h}" fill="${f}" stroke="#94a3b8"/>${[1, 2, 3].map((i) => `<line x1="0" x2="${w}" y1="${(h / 4) * i}" y2="${(h / 4) * i}" stroke="#e2e8f0"/>`).join('')}`;
    default: return `<rect width="${w}" height="${h}" rx="6" fill="${f}" ${s}/>`;
  }
}

function textSvg(n) {
  const light = ['header', 'button'].includes(n.type);
  const maxChars = Math.max(4, Math.floor((n.type === 'decision' ? n.w * 0.6 : n.w - 16) / 7.2));
  const lines = [];
  for (const raw of String(n.text || '').split('\n')) {
    let line = '';
    for (const word of raw.split(' ')) {
      if ((`${line} ${word}`).trim().length > maxChars && line) (lines.push(line), (line = word));
      else line = `${line} ${word}`.trim();
    }
    lines.push(line);
  }
  const lh = 16;
  let x = n.w / 2, y = n.h / 2 - ((lines.length - 1) * lh) / 2, anchor = 'middle';
  if (n.type === 'actor') y = n.h - 4 + lh / 2;
  if (n.type === 'lane') return `<text transform="translate(17 ${n.h / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="600" fill="#0f172a">${esc(n.text)}</text>`;
  if (['input', 'checkbox', 'list'].includes(n.type) || n.type === 'note') { x = n.type === 'checkbox' ? 26 : 10; anchor = 'start'; }
  if (n.type === 'list' || n.type === 'note') y = 18;
  if (n.type === 'screen') y = 30;
  return `<text text-anchor="${anchor}" font-size="13" fill="${light ? '#ffffff' : n.type === 'input' ? '#64748b' : '#0f172a'}" font-family="Segoe UI, Arial, sans-serif">${lines.map((l, i) => `<tspan x="${x}" y="${y + i * lh}" dominant-baseline="central">${esc(l)}</tspan>`).join('')}</text>`;
}

function border(n, tx, ty) {
  // Point on the node's bounding box in the direction of (tx, ty).
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const sx = n.w / 2 / Math.abs(dx || 1e-9), sy = n.h / 2 / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return [cx + dx * s, cy + dy * s];
}

function edgeSvg(e, nodes, sel) {
  const a = nodes.find((n) => n.id === e.from), b = nodes.find((n) => n.id === e.to);
  if (!a || !b) return '';
  const [x1, y1] = border(a, b.x + b.w / 2, b.y + b.h / 2);
  const [x2, y2] = border(b, a.x + a.w / 2, a.y + a.h / 2);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `<g class="edge ${sel ? 'sel' : ''}" data-edge="${e.id}"><path d="M${x1},${y1} L${x2},${y2}" stroke="transparent" stroke-width="12"/><path d="M${x1},${y1} L${x2},${y2}" stroke="#475569" stroke-width="1.6" fill="none" ${e.dashed ? 'stroke-dasharray="6 4"' : ''} marker-end="${e.arrow === false ? '' : 'url(#arr)'}"/>${e.label ? `<rect x="${mx - e.label.length * 3.6 - 4}" y="${my - 10}" width="${e.label.length * 7.2 + 8}" height="20" rx="4" fill="#fff"/><text x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#334155" font-family="Segoe UI, Arial, sans-serif">${esc(e.label)}</text>` : ''}</g>`;
}

export function exportSvg(c) {
  const ns = c.nodes;
  if (!ns.length) return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"></svg>';
  const minX = Math.min(...ns.map((n) => n.x)) - 20, minY = Math.min(...ns.map((n) => n.y)) - 20;
  const maxX = Math.max(...ns.map((n) => n.x + n.w)) + 20, maxY = Math.max(...ns.map((n) => n.y + n.h)) + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${maxX - minX}" height="${maxY - minY}"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs><rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="#fff"/>${ns.map((n) => `<g transform="translate(${n.x} ${n.y})">${shapeSvg(n)}${textSvg(n)}</g>`).join('')}${c.edges.map((e) => edgeSvg(e, ns, false)).join('')}</svg>`;
}

export function renderCanvas(root, id) {
  const p = project();
  if (!id && p.canvases.length) id = p.canvases[0].id;
  const c0 = p.canvases.find((x) => x.id === id);
  root.innerHTML = `
    <div class="page-head"><div><h1>Whiteboard</h1><p>Drag-and-drop flowcharts, context sketches and low-fidelity wireframes. Drag from the green dot on a shape to connect it; drag the background to pan; scroll to zoom; Delete removes the selection.</p></div><span class="grow"></span>
      ${p.canvases.length ? `<select data-pick style="width:auto">${p.canvases.map((x) => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
      <button class="btn primary" data-new>+ New board</button></div>
    ${c0 ? `<div class="canvas-wrap">
      <div class="card palette">${Object.entries(SHAPES).map(([g, list]) => `<div class="nav-label" style="padding-left:0">${g}</div>${list.map(([t, l]) => `<button class="btn sm" data-shape="${t}">${esc(l)}</button>`).join('')}`).join('')}</div>
      <div class="canvas" data-canvas><svg data-svg tabindex="0" aria-label="Whiteboard"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs><g data-world></g><line data-ghost stroke="#0f766e" stroke-width="2" stroke-dasharray="4 3" visibility="hidden"/></svg></div>
      <div class="card inspector" data-insp></div>
    </div>` : '<div class="card empty">No boards yet. Create one to start drawing.</div>'}`;

  $('[data-new]', root).onclick = () => {
    const nid = uid('cv');
    update((pr) => pr.canvases.push({ id: nid, name: `Board ${pr.canvases.length + 1}`, nodes: [], edges: [] }), { quiet: true });
    location.hash = `#/canvas/${nid}`;
  };
  $('[data-pick]', root)?.addEventListener('change', (e) => (location.hash = `#/canvas/${e.target.value}`));
  if (!c0) return;

  const c = JSON.parse(JSON.stringify(c0));
  if (!state || state.canvasId !== c.id) state = { canvasId: c.id, sel: null, zoom: 1, panX: 0, panY: 0 };
  const svg = $('[data-svg]', root), world = $('[data-world]', root), ghost = $('[data-ghost]', root);
  const persist = () => update((pr) => {
    const i = pr.canvases.findIndex((x) => x.id === c.id);
    pr.canvases[i] = JSON.parse(JSON.stringify(c));
  }, { quiet: true });

  // Redraw shapes + connectors. The inspector is rebuilt only by draw(), so typing keeps focus.
  const drawShapes = () => {
    world.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`);
    world.innerHTML = c.nodes.map((n) => `<g class="node ${state.sel?.id === n.id ? 'sel' : ''}" data-node="${n.id}" transform="translate(${n.x} ${n.y})">${shapeSvg(n)}${textSvg(n)}${n.type !== 'lane' && n.type !== 'screen' ? `<circle class="port" data-port="${n.id}" cx="${n.w}" cy="${n.h / 2}" r="6"/>` : ''}${state.sel?.id === n.id ? `<rect data-resize="${n.id}" x="${n.w - 5}" y="${n.h - 5}" width="10" height="10" fill="#0f766e" style="cursor:nwse-resize"/>` : ''}</g>`).join('') +
      c.edges.map((e) => edgeSvg(e, c.nodes, state.sel?.id === e.id)).join('');
  };
  const draw = () => (drawShapes(), inspector());

  const toWorld = (ev) => {
    const r = svg.getBoundingClientRect();
    return [(ev.clientX - r.left - state.panX) / state.zoom, (ev.clientY - r.top - state.panY) / state.zoom];
  };
  const snap = (v) => Math.round(v / 10) * 10;

  function inspector() {
    const box = $('[data-insp]', root);
    const sel = state.sel && (state.sel.kind === 'node' ? c.nodes.find((n) => n.id === state.sel.id) : c.edges.find((e) => e.id === state.sel.id));
    const header = `<label class="field"><span>Board name</span><input type="text" data-bname value="${esc(c.name)}"></label>
      <div class="row" style="margin:10px 0"><button class="btn sm" data-zoom="1">+</button><button class="btn sm" data-zoom="-1">−</button><button class="btn sm" data-fit>Reset view</button></div>
      <div class="row" style="margin-bottom:12px"><button class="btn sm" data-esvg>SVG</button><button class="btn sm" data-epng>PNG</button><button class="btn sm" data-ejson>JSON</button><button class="btn sm" data-ijson>Import</button><button class="btn sm danger" data-bdel>Delete board</button></div><hr style="border:0;border-top:1px solid var(--border)">`;
    if (!sel) box.innerHTML = `${header}<p class="muted small">Select a shape or connector to edit it. ${c.nodes.length} shapes, ${c.edges.length} connectors.</p>`;
    else if (state.sel.kind === 'node') box.innerHTML = `${header}<h3 style="margin:10px 0">Shape</h3>
      <label class="field"><span>Text</span><textarea rows="3" data-t>${esc(sel.text)}</textarea></label>
      <div class="form" style="margin-top:8px"><label class="field"><span>Width</span><input type="number" data-w value="${sel.w}"></label><label class="field"><span>Height</span><input type="number" data-h value="${sel.h}"></label></div>
      <label class="field" style="margin-top:8px"><span>Fill</span><input type="color" data-fill value="${/^#/.test(sel.fill || FILL[sel.type]) ? sel.fill || FILL[sel.type] : '#ffffff'}"></label>
      <label class="field" style="margin-top:8px"><span>Connect to</span><select data-conn><option value="">—</option>${c.nodes.filter((n) => n.id !== sel.id).map((n) => `<option value="${n.id}">${esc(n.text || n.type)}</option>`).join('')}</select></label>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-front>Bring to front</button><button class="btn sm" data-back>Send to back</button><button class="btn sm" data-dup>Duplicate</button><button class="btn sm danger" data-delsel>Delete</button></div>`;
    else box.innerHTML = `${header}<h3 style="margin:10px 0">Connector</h3>
      <label class="field"><span>Label</span><input type="text" data-elabel value="${esc(sel.label || '')}"></label>
      <label class="row" style="margin-top:8px"><input type="checkbox" data-dash ${sel.dashed ? 'checked' : ''}> Dashed</label>
      <label class="row"><input type="checkbox" data-arrow ${sel.arrow === false ? '' : 'checked'}> Arrow head</label>
      <div class="row" style="margin-top:10px"><button class="btn sm" data-flip>Reverse</button><button class="btn sm danger" data-delsel>Delete</button></div>`;
    const on = (s, ev, fn) => $(s, box)?.addEventListener(ev, fn);
    on('[data-bname]', 'change', (e) => { c.name = e.target.value.trim() || 'Board'; persist(); renderCanvas(root, c.id); });
    $$('[data-zoom]', box).forEach((b) => (b.onclick = () => ((state.zoom = Math.max(0.3, Math.min(3, state.zoom + +b.dataset.zoom * 0.15))), draw())));
    on('[data-fit]', 'click', () => ((state.zoom = 1), (state.panX = 0), (state.panY = 0), draw()));
    on('[data-esvg]', 'click', () => download(exportSvg(c), `${fileSafe(c.name)}.svg`, 'image/svg+xml'));
    on('[data-epng]', 'click', async () => download(await svgToPng(exportSvg(c), 2), `${fileSafe(c.name)}.png`));
    on('[data-ejson]', 'click', () => download(JSON.stringify(c, null, 2), `${fileSafe(c.name)}.board.json`, 'application/json'));
    on('[data-ijson]', 'click', async () => {
      const f = await pickFile('.json,application/json');
      if (!f) return;
      try {
        const data = JSON.parse(f.text);
        if (!Array.isArray(data.nodes)) throw new Error('not a board file');
        c.nodes = data.nodes; c.edges = Array.isArray(data.edges) ? data.edges : [];
        persist(); draw(); toast('Board imported');
      } catch (e) { toast(`Could not import: ${e.message}`, 'err'); }
    });
    on('[data-bdel]', 'click', async () => {
      if (!(await confirmBox(`Delete board "${c.name}"?`))) return;
      update((pr) => (pr.canvases = pr.canvases.filter((x) => x.id !== c.id)), { quiet: true });
      state = null;
      location.hash = '#/canvas';
      renderCanvas(root);
    });
    if (!sel) return;
    const live = (s, fn) => on(s, 'input', (e) => (fn(e.target), drawShapes()));
    live('[data-t]', (t) => (sel.text = t.value));
    live('[data-w]', (t) => (sel.w = Math.max(10, +t.value || 10)));
    live('[data-h]', (t) => (sel.h = Math.max(10, +t.value || 10)));
    live('[data-fill]', (t) => (sel.fill = t.value));
    live('[data-elabel]', (t) => (sel.label = t.value));
    for (const s of ['[data-t]', '[data-w]', '[data-h]', '[data-fill]', '[data-elabel]']) on(s, 'change', persist);
    on('[data-dash]', 'change', (e) => ((sel.dashed = e.target.checked), persist(), draw()));
    on('[data-arrow]', 'change', (e) => ((sel.arrow = e.target.checked), persist(), draw()));
    on('[data-flip]', 'click', () => (([sel.from, sel.to] = [sel.to, sel.from]), persist(), draw()));
    on('[data-conn]', 'change', (e) => e.target.value && (c.edges.push({ id: uid('e'), from: sel.id, to: e.target.value }), persist(), draw()));
    on('[data-front]', 'click', () => ((c.nodes = [...c.nodes.filter((n) => n !== sel), sel]), persist(), draw()));
    on('[data-back]', 'click', () => ((c.nodes = [sel, ...c.nodes.filter((n) => n !== sel)]), persist(), draw()));
    on('[data-dup]', 'click', () => { const n = { ...sel, id: uid('n'), x: sel.x + 20, y: sel.y + 20 }; c.nodes.push(n); state.sel = { kind: 'node', id: n.id }; persist(); draw(); });
    on('[data-delsel]', 'click', removeSel);
  }
  function removeSel() {
    if (!state.sel) return;
    if (state.sel.kind === 'node') {
      c.nodes = c.nodes.filter((n) => n.id !== state.sel.id);
      c.edges = c.edges.filter((e) => e.from !== state.sel.id && e.to !== state.sel.id);
    } else c.edges = c.edges.filter((e) => e.id !== state.sel.id);
    state.sel = null;
    persist();
    draw();
  }

  $$('[data-shape]', root).forEach((b) => (b.onclick = () => {
    const [t, label, w, h] = Object.values(SHAPES).flat().find((s) => s[0] === b.dataset.shape);
    const r = svg.getBoundingClientRect();
    const x = snap((r.width / 2 - state.panX) / state.zoom - w / 2 + (c.nodes.length % 5) * 20);
    const y = snap((r.height / 2 - state.panY) / state.zoom - h / 2 + (c.nodes.length % 5) * 20);
    const n = { id: uid('n'), type: t, x, y, w, h, text: ['actor', 'text', 'button', 'input', 'header', 'lane', 'screen', 'checkbox', 'list', 'note'].includes(t) ? label : '' };
    if (t === 'input') n.text = 'Placeholder…';
    if (t === 'list') n.text = 'Item one\nItem two\nItem three';
    if (t === 'lane') n.x = snap(-state.panX / state.zoom + 20);
    c.nodes[t === 'lane' || t === 'screen' ? 'unshift' : 'push'](n);
    state.sel = { kind: 'node', id: n.id };
    persist();
    draw();
  }));

  let drag = null;
  svg.addEventListener('pointerdown', (ev) => {
    const port = ev.target.closest('[data-port]');
    const rs = ev.target.closest('[data-resize]');
    const nodeEl = ev.target.closest('[data-node]');
    const edgeEl = ev.target.closest('[data-edge]');
    const [wx, wy] = toWorld(ev);
    svg.setPointerCapture(ev.pointerId);
    if (port) {
      drag = { kind: 'connect', from: port.dataset.port };
      const n = c.nodes.find((x) => x.id === drag.from);
      ghost.setAttribute('visibility', 'visible');
      drag.sx = n.x + n.w; drag.sy = n.y + n.h / 2;
    } else if (rs) {
      const n = c.nodes.find((x) => x.id === rs.dataset.resize);
      drag = { kind: 'resize', n, ox: wx - n.w, oy: wy - n.h };
    } else if (nodeEl) {
      const n = c.nodes.find((x) => x.id === nodeEl.dataset.node);
      state.sel = { kind: 'node', id: n.id };
      drag = { kind: 'move', n, ox: wx - n.x, oy: wy - n.y, moved: false };
      draw();
    } else if (edgeEl) {
      state.sel = { kind: 'edge', id: edgeEl.dataset.edge };
      drag = null;
      draw();
    } else {
      state.sel = null;
      drag = { kind: 'pan', x: ev.clientX - state.panX, y: ev.clientY - state.panY };
      draw();
    }
  });
  svg.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const [wx, wy] = toWorld(ev);
    if (drag.kind === 'move') {
      drag.n.x = snap(wx - drag.ox); drag.n.y = snap(wy - drag.oy); drag.moved = true;
      drawShapes();
    } else if (drag.kind === 'resize') {
      drag.n.w = Math.max(20, snap(wx - drag.ox)); drag.n.h = Math.max(20, snap(wy - drag.oy));
      drawShapes();
    } else if (drag.kind === 'pan') {
      state.panX = ev.clientX - drag.x; state.panY = ev.clientY - drag.y;
      world.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`);
    } else if (drag.kind === 'connect') {
      const r = svg.getBoundingClientRect();
      ghost.setAttribute('x1', drag.sx * state.zoom + state.panX); ghost.setAttribute('y1', drag.sy * state.zoom + state.panY);
      ghost.setAttribute('x2', ev.clientX - r.left); ghost.setAttribute('y2', ev.clientY - r.top);
    }
  });
  svg.addEventListener('pointerup', (ev) => {
    if (!drag) return;
    if (drag.kind === 'connect') {
      ghost.setAttribute('visibility', 'hidden');
      const [wx, wy] = toWorld(ev);
      const target = [...c.nodes].reverse().find((n) => n.id !== drag.from && wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h && n.type !== 'lane');
      if (target) {
        const e = { id: uid('e'), from: drag.from, to: target.id };
        c.edges.push(e);
        state.sel = { kind: 'edge', id: e.id };
        persist();
      }
      draw();
    } else if (drag.kind === 'move' || drag.kind === 'resize') {
      persist();
      draw();
    }
    drag = null;
  });
  svg.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('[data-node]')) setTimeout(() => $('[data-t]', root)?.focus(), 0);
  });
  svg.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const r = svg.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const z = Math.max(0.3, Math.min(3, state.zoom * (ev.deltaY < 0 ? 1.1 : 0.9)));
    state.panX = mx - ((mx - state.panX) * z) / state.zoom;
    state.panY = my - ((my - state.panY) * z) / state.zoom;
    state.zoom = z;
    world.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`);
  }, { passive: false });
  svg.addEventListener('keydown', (ev) => {
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && state.sel) (ev.preventDefault(), removeSel());
    const n = state.sel?.kind === 'node' && c.nodes.find((x) => x.id === state.sel.id);
    const mv = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[ev.key];
    if (n && mv) { ev.preventDefault(); n.x += mv[0]; n.y += mv[1]; persist(); draw(); }
  });
  svg.addEventListener('pointerdown', () => svg.focus({ preventScroll: true }));
  draw();
}
