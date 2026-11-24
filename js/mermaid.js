// Mermaid loader + SVG/PNG export helpers. The library loads on first use, from the bundled copy in
// /vendor (works offline); the CDN is only a fallback if that copy is missing.
const LOCAL_MERMAID = new URL('../vendor/mermaid/mermaid.esm.min.js', import.meta.url).href;
const CDN_MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
// Optional "tidy" layout engine (ELK, MIT licence): square-cornered lines and fewer crossings on big flowcharts.
const LOCAL_ELK = new URL('../vendor/layout-elk/mermaid-layout-elk.esm.min.js', import.meta.url).href;
const CDN_ELK = 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.1.7/dist/mermaid-layout-elk.esm.min.mjs';
const importEither = (local, cdn) => import(local).catch(() => import(cdn));
let elkReady = null;
// Diagrams this big are always drawn with the standard engine: ELK can freeze the page on huge graphs.
const ELK_MAX_LINES = 600;
let ready = null;
let seq = 0;
let current = '';

// Screen theme: black canvas, green shapes, red connectors. Light theme: used for Word / HTML exports.
const THEMES = {
  dark: { darkMode: true, background: '#000000', primaryColor: '#0d2416', primaryBorderColor: '#22c55e', primaryTextColor: '#f2f2f2', secondaryColor: '#2a0e0e', secondaryBorderColor: '#ef4444', secondaryTextColor: '#f2f2f2', tertiaryColor: '#111111', tertiaryBorderColor: '#3a3a3a', tertiaryTextColor: '#f2f2f2', lineColor: '#ef4444', textColor: '#f2f2f2', mainBkg: '#0d2416', nodeBorder: '#22c55e', clusterBkg: '#080808', clusterBorder: '#3a3a3a', titleColor: '#4ade80', edgeLabelBackground: '#000000', noteBkgColor: '#2a0e0e', noteBorderColor: '#ef4444', noteTextColor: '#f2f2f2', actorBkg: '#0d2416', actorBorder: '#22c55e', actorTextColor: '#f2f2f2', actorLineColor: '#555555', signalColor: '#f2f2f2', signalTextColor: '#f2f2f2', labelBoxBkgColor: '#0d2416', labelBoxBorderColor: '#22c55e', labelTextColor: '#f2f2f2', loopTextColor: '#f2f2f2', sequenceNumberColor: '#000000', attributeBackgroundColorOdd: '#0a0a0a', attributeBackgroundColorEven: '#141414', quadrant1Fill: '#0d2416', quadrant2Fill: '#112b19', quadrant3Fill: '#1a0b0b', quadrant4Fill: '#2a0e0e', quadrant1TextFill: '#f2f2f2', quadrant2TextFill: '#f2f2f2', quadrant3TextFill: '#f2f2f2', quadrant4TextFill: '#f2f2f2', quadrantPointFill: '#ef4444', quadrantPointTextFill: '#f2f2f2', quadrantXAxisTextFill: '#cfcfcf', quadrantYAxisTextFill: '#cfcfcf', quadrantTitleFill: '#4ade80', quadrantInternalBorderStrokeFill: '#3a3a3a', quadrantExternalBorderStrokeFill: '#3a3a3a', pie1: '#22c55e', pie2: '#ef4444', pie3: '#15803d', pie4: '#b91c1c', pie5: '#4ade80', pie6: '#f87171', pieTitleTextColor: '#f2f2f2', pieSectionTextColor: '#000000', pieLegendTextColor: '#f2f2f2', pieStrokeColor: '#000000', gridColor: '#262626', sectionBkgColor: '#0d2416', altSectionBkgColor: '#111111', taskBkgColor: '#22c55e', taskBorderColor: '#15803d', taskTextColor: '#000000', taskTextOutsideColor: '#f2f2f2', activeTaskBkgColor: '#ef4444', doneTaskBkgColor: '#15803d', critBkgColor: '#ef4444', todayLineColor: '#ef4444', cScale0: '#15803d', cScale1: '#b91c1c', cScale2: '#166534', cScale3: '#991b1b', fillType0: '#0d2416', fillType1: '#2a0e0e', fontSize: '14px' },
  light: { primaryColor: '#e9f9ef', primaryBorderColor: '#16a34a', primaryTextColor: '#111111', secondaryColor: '#fdecec', tertiaryColor: '#ffffff', lineColor: '#dc2626', textColor: '#111111', clusterBkg: '#fafafa', clusterBorder: '#cccccc', edgeLabelBackground: '#ffffff', noteBkgColor: '#fdecec', noteBorderColor: '#dc2626', quadrant1Fill: '#e9f9ef', quadrant2Fill: '#f2fbf5', quadrant3Fill: '#fafafa', quadrant4Fill: '#fdecec', quadrantPointFill: '#dc2626', pie1: '#16a34a', pie2: '#dc2626', pie3: '#15803d', pie4: '#b91c1c', taskBkgColor: '#16a34a', critBkgColor: '#dc2626', fontSize: '14px' },
};

function lib(mode) {
  ready ||= importEither(LOCAL_MERMAID, CDN_MERMAID).catch((e) => {
    ready = null;
    throw new Error(`Could not load the diagram library — check your internet connection. (${e.message})`);
  });
  return ready.then((m) => {
    const mm = m.default;
    if (current !== mode) {
      mm.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        maxTextSize: 2000000, // large projects produce big diagrams (default limit is 50 000 chars)
        maxEdges: 5000,
        theme: 'base',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        themeVariables: THEMES[mode],
        flowchart: { curve: 'basis', padding: 12, htmlLabels: false },
        sequence: { mirrorActors: false },
      });
      current = mode;
    }
    return mm;
  });
}

/** Can this diagram use the tidy (ELK) layout? Flowcharts and state diagrams of a sensible size. */
export const canTidy = (code) => /^\s*(flowchart|graph|stateDiagram)/.test(code) && code.split('\n').length <= ELK_MAX_LINES;

/** Render Mermaid source to an SVG string. `light: true` for documents exported to white pages; `tidy: true` uses ELK. */
export async function render(code, { light = false, tidy = false } = {}) {
  const mm = await lib(light ? 'light' : 'dark');
  if (tidy && canTidy(code)) {
    try {
      elkReady ||= importEither(LOCAL_ELK, CDN_ELK).then((m) => mm.registerLayoutLoaders(m.default));
      await elkReady;
      code = `%%{init: {"layout": "elk"}}%%\n${code}`;
    } catch { elkReady = null; } // offline or blocked: fall back to the standard layout
  }
  const elId = `mmd${Date.now().toString(36)}${seq++}`;
  try {
    const { svg } = await mm.render(elId, code);
    return umlLinks(svg, code);
  } catch (e) {
    document.getElementById(elId)?.remove();
    document.getElementById(`d${elId}`)?.remove();
    throw new Error(String(e?.message || e).split('\n').slice(0, 6).join('\n'));
  }
}

/**
 * UML-correct link ends for flowchart-based diagrams. Mermaid puts an arrowhead even on plain
 * `---` links, so associations (actor — use case) get no arrowhead, and `-->|is a|` links get the
 * UML generalisation hollow triangle.
 */
function umlLinks(svg, code) {
  if (!/^\s*(%%.*\n\s*)*(flowchart|graph)\b/.test(code) || !/ --- |\|is a\|/.test(code)) return svg;
  const plain = [], general = [];
  for (const line of code.split('\n')) {
    let m = line.match(/^\s*(\S+) --- (\S+)\s*$/);
    if (m) plain.push(`L_${m[1]}_${m[2]}_`);
    m = line.match(/^\s*(\S+) -->\|is a\| (\S+)\s*$/);
    if (m) general.push(`L_${m[1]}_${m[2]}_`);
  }
  if (!plain.length && !general.length) return svg;
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName === 'parsererror' || root.querySelector('parsererror')) return svg;
  const paths = [...root.querySelectorAll('path[id^="L_"]')];
  const starts = (id, list) => list.some((pre) => id.startsWith(pre) || id.replace(/^[^_]*-/, '').startsWith(pre));
  for (const p of paths) if (starts(p.id, plain)) { p.removeAttribute('marker-end'); p.removeAttribute('marker-start'); }
  const gen = paths.filter((p) => starts(p.id, general));
  if (gen.length) {
    const ns = 'http://www.w3.org/2000/svg';
    let defs = root.querySelector('defs');
    if (!defs) { defs = doc.createElementNS(ns, 'defs'); root.insertBefore(defs, root.firstChild); }
    const mid = `${root.id || 'm'}-uml-generalisation`;
    const mk = doc.createElementNS(ns, 'marker');
    for (const [k, v] of Object.entries({ id: mid, viewBox: '0 0 12 12', refX: '11', refY: '6', markerWidth: '14', markerHeight: '14', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' })) mk.setAttribute(k, v);
    const tri = doc.createElementNS(ns, 'path');
    tri.setAttribute('d', 'M1,1 L11,6 L1,11 Z');
    tri.setAttribute('fill', '#000000');
    tri.setAttribute('stroke', paths[0] ? getComputedStroke(gen[0]) : '#ef4444');
    tri.setAttribute('stroke-width', '1.5');
    mk.appendChild(tri);
    defs.appendChild(mk);
    for (const p of gen) p.setAttribute('marker-end', `url(#${mid})`);
  }
  return new XMLSerializer().serializeToString(root);
}
const getComputedStroke = (p) => p.getAttribute('stroke') || (p.getAttribute('style') || '').match(/stroke:\s*([^;]+)/)?.[1] || '#ef4444';

export async function validate(code) {
  const mm = await lib('dark');
  try {
    await mm.parse(code);
    return null;
  } catch (e) {
    return String(e?.message || e);
  }
}

/** Give an SVG explicit width/height from its viewBox so it exports correctly. */
export function sized(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.documentElement;
  const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const w = vb[2] || parseFloat(el.getAttribute('width')) || 800;
  const h = vb[3] || parseFloat(el.getAttribute('height')) || 600;
  el.setAttribute('width', w);
  el.setAttribute('height', h);
  el.removeAttribute('style');
  el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return { svg: new XMLSerializer().serializeToString(el), w, h };
}

export function svgToPng(svg, scale = 2, bg = '#000000') {
  const { svg: s, w, h } = sized(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * scale);
      c.height = Math.ceil(h * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('PNG export failed'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  });
}
