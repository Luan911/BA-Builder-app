// Mermaid loader + SVG/PNG export helpers. The library loads on first use.
const URL_MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
let ready = null;
let seq = 0;

function lib() {
  ready ||= import(URL_MERMAID).then((m) => {
    const mm = m.default;
    mm.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: 'Segoe UI, Arial, sans-serif',
      themeVariables: { primaryColor: '#e6f6f4', primaryBorderColor: '#0f766e', primaryTextColor: '#0e1a22', lineColor: '#5b6b75', secondaryColor: '#f0f3f5', tertiaryColor: '#ffffff', clusterBkg: '#f8fafb', clusterBorder: '#c9d1d8', fontSize: '14px', quadrant1Fill: '#e6f6f4', quadrant2Fill: '#eef6ff', quadrant3Fill: '#f5f7f8', quadrant4Fill: '#fff8eb' },
      flowchart: { curve: 'basis', padding: 12, htmlLabels: false },
      sequence: { mirrorActors: false },
    });
    return mm;
  }).catch((e) => {
    ready = null;
    throw new Error(`Could not load the diagram library — check your internet connection. (${e.message})`);
  });
  return ready;
}

/** Render Mermaid source to an SVG string. Throws with a readable message on syntax errors. */
export async function render(code) {
  const mm = await lib();
  const elId = `mmd${Date.now().toString(36)}${seq++}`;
  try {
    const { svg } = await mm.render(elId, code);
    return svg;
  } catch (e) {
    document.getElementById(elId)?.remove();
    document.getElementById(`d${elId}`)?.remove();
    throw new Error(String(e?.message || e).split('\n').slice(0, 6).join('\n'));
  }
}

export async function validate(code) {
  const mm = await lib();
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

export function svgToPng(svg, scale = 2) {
  const { svg: s, w, h } = sized(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * scale);
      c.height = Math.ceil(h * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('PNG export failed'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;
  });
}
