// Rendering and export: Mermaid diagrams, branded PDFs (jsPDF) and ZIP packs (JSZip).
// Libraries are loaded from a CDN only when first needed, so the editor itself works offline.
import { parseBlocks, stripInline } from './markdown.js';
import { today } from './model.js';

const LIBS = {
  mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs',
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
};

const scriptCache = {};
function loadScript(url) {
  scriptCache[url] ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      delete scriptCache[url];
      reject(new Error('Could not load a required library. Check your internet connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return scriptCache[url];
}

// ---------------- Mermaid ----------------
let mermaidPromise = null;
export function getMermaid() {
  mermaidPromise ||= import(LIBS.mermaid)
    .then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        htmlLabels: false,
        fontFamily: 'Arial, Helvetica, sans-serif',
        themeVariables: {
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '14px',
          primaryColor: '#eef2ff',
          primaryBorderColor: '#4f46e5',
          primaryTextColor: '#111827',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#ffffff',
          clusterBkg: '#f8fafc',
          clusterBorder: '#cbd5e1',
          actorBkg: '#eef2ff',
          actorBorder: '#4f46e5',
          noteBkgColor: '#fef9c3',
          noteBorderColor: '#eab308',
        },
        flowchart: { htmlLabels: false, curve: 'basis', padding: 12 },
        sequence: { mirrorActors: false, useMaxWidth: false },
        er: { useMaxWidth: false },
        gantt: { useMaxWidth: false },
      });
      return mermaid;
    })
    .catch((e) => {
      mermaidPromise = null;
      throw new Error(`Could not load the diagram library (${e.message}). Check your internet connection.`);
    });
  return mermaidPromise;
}

let renderSeq = 0;
export async function renderMermaid(code) {
  const mermaid = await getMermaid();
  const id = `mmd-${Date.now().toString(36)}-${renderSeq++}`;
  const { svg } = await mermaid.render(id, code);
  return svg;
}

/** Give the SVG explicit pixel size (from its viewBox) so it rasterises correctly. */
function sizedSvg(svg) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const el = doc.documentElement;
  const vb = (el.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  const width = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(el.getAttribute('width')) || 800;
  const height = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(el.getAttribute('height')) || 600;
  el.setAttribute('width', String(width));
  el.setAttribute('height', String(height));
  el.removeAttribute('style');
  el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return { svg: new XMLSerializer().serializeToString(el), width, height };
}

export function svgToPng(svg, scale = 2) {
  const { svg: s, width, height } = sizedSvg(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 4000;
      const k = Math.min(scale, max / width, max / height);
      canvas.width = Math.round(width * k);
      canvas.height = Math.round(height * k);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height, canvas });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not convert the diagram to an image.'));
    };
    img.src = url;
  });
}

export const exportableSvg = (svg) => sizedSvg(svg).svg;

// ---------------- downloads ----------------
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export const downloadText = (text, filename, type = 'text/plain') => downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);

// ---------------- PDF ----------------
async function getJsPdf() {
  await loadScript(LIBS.jspdf);
  await loadScript(LIBS.autotable);
  if (!window.jspdf?.jsPDF) throw new Error('PDF library failed to initialise.');
  return window.jspdf.jsPDF;
}

const hexToRgb = (hex) => {
  const m = String(hex || '').replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [79, 70, 229];
};

// Standard PDF fonts only cover Latin-1; map common symbols to safe equivalents.
const SAFE = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '×': 'x', '✓': 'v', '✗': 'x', '…': '...', ' ': ' ', '−': '-' };
export function pdfSafe(s) {
  return String(s ?? '')
    .replace(/[→←≥≤×✓✗… −]/g, (c) => SAFE[c])
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\xff•]/g, '');
}

const PAGE = { w: 210, h: 297, left: 18, right: 18, top: 26, bottom: 20 };

class PdfWriter {
  constructor(jsPDF, settings, project) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    this.settings = settings;
    this.project = project;
    this.accent = hexToRgb(settings.accent);
    this.y = PAGE.top;
    this.pageTitles = {};
    this.width = PAGE.w - PAGE.left - PAGE.right;
    this.noChrome = new Set();
  }
  get page() {
    return this.doc.getCurrentPageInfo().pageNumber;
  }
  newPage(title) {
    this.doc.addPage();
    this.y = PAGE.top;
    if (title) this.pageTitles[this.page] = title;
  }
  ensure(h, title) {
    if (this.y + h > PAGE.h - PAGE.bottom) this.newPage(title || this.currentTitle);
  }
  text(str, { size = 10, style = 'normal', color = [33, 37, 41], font = 'helvetica', indent = 0, lh = 1.45, gapAfter = 2 } = {}) {
    const d = this.doc;
    d.setFont(font, style);
    d.setFontSize(size);
    d.setTextColor(...color);
    const lines = d.splitTextToSize(pdfSafe(str), this.width - indent);
    const lineH = (size * 0.3528) * lh;
    for (const line of lines) {
      this.ensure(lineH);
      d.text(line, PAGE.left + indent, this.y + lineH * 0.75);
      this.y += lineH;
    }
    this.y += gapAfter;
  }
  heading(text, level) {
    const sizes = { 1: 17, 2: 13, 3: 11, 4: 10 };
    const size = sizes[level] || 10;
    this.ensure(size * 0.6 + 8);
    this.y += level === 1 ? 0 : level === 2 ? 3 : 1.5;
    this.text(stripInline(text), { size, style: 'bold', color: level <= 2 ? this.accent : [17, 24, 39], gapAfter: level === 1 ? 2 : 1.5 });
    if (level === 2) {
      this.doc.setDrawColor(...this.accent);
      this.doc.setLineWidth(0.3);
      this.doc.line(PAGE.left, this.y - 0.5, PAGE.left + 18, this.y - 0.5);
      this.y += 2;
    }
  }
  table(header, rows) {
    const cols = header.length;
    this.doc.autoTable({
      head: [header.map((h) => pdfSafe(stripInline(h)))],
      body: rows.map((r) => header.map((_, i) => pdfSafe(stripInline(r[i] ?? '')))),
      startY: this.y,
      margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.bottom },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: cols > 7 ? 7 : cols > 5 ? 7.6 : 8.4, cellPadding: 1.6, overflow: 'linebreak', textColor: [33, 37, 41], lineColor: [222, 226, 230], lineWidth: 0.15, valign: 'top' },
      headStyles: { fillColor: this.accent, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      didDrawPage: () => {
        this.pageTitles[this.page] ||= this.currentTitle;
      },
    });
    this.y = this.doc.lastAutoTable.finalY + 4;
  }
  code(text) {
    const d = this.doc;
    d.setFont('courier', 'normal');
    d.setFontSize(8.4);
    const lineH = 3.9;
    const lines = pdfSafe(text).split('\n').flatMap((l) => d.splitTextToSize(l || ' ', this.width - 6));
    this.y += 1;
    for (const line of lines) {
      this.ensure(lineH);
      d.setFillColor(245, 246, 248);
      d.rect(PAGE.left, this.y, this.width, lineH, 'F');
      d.setTextColor(30, 41, 59);
      d.setFont('courier', 'normal');
      d.setFontSize(8.4);
      d.text(line, PAGE.left + 3, this.y + 2.9);
      this.y += lineH;
    }
    this.y += 3;
  }
  list(items, ordered) {
    items.forEach((it, i) => {
      const bullet = it.task ? (it.checked ? '[x]' : '[ ]') : ordered ? `${i + 1}.` : '•';
      const d = this.doc;
      d.setFont('helvetica', 'normal');
      d.setFontSize(10);
      const lines = d.splitTextToSize(pdfSafe(stripInline(it.text)), this.width - 7);
      const lineH = 10 * 0.3528 * 1.45;
      lines.forEach((line, k) => {
        this.ensure(lineH);
        d.setTextColor(33, 37, 41);
        if (k === 0) d.text(bullet, PAGE.left + 1, this.y + lineH * 0.75);
        d.text(line, PAGE.left + 7, this.y + lineH * 0.75);
        this.y += lineH;
      });
    });
    this.y += 2;
  }
  markdown(md, title) {
    this.currentTitle = title;
    this.pageTitles[this.page] ||= title;
    for (const b of parseBlocks(md)) {
      if (b.type === 'h') this.heading(b.text, b.level);
      else if (b.type === 'p') this.text(stripInline(b.text));
      else if (b.type === 'quote') {
        const start = this.y;
        this.text(stripInline(b.text), { style: 'italic', indent: 4, color: [55, 65, 81] });
        this.doc.setDrawColor(...this.accent);
        this.doc.setLineWidth(0.8);
        this.doc.line(PAGE.left + 1, Math.max(start, PAGE.top), PAGE.left + 1, this.y - 2);
      } else if (b.type === 'ul' || b.type === 'ol') this.list(b.items, b.type === 'ol');
      else if (b.type === 'table') this.table(b.header, b.rows);
      else if (b.type === 'code') this.code(b.text);
      else if (b.type === 'hr') {
        this.ensure(4);
        this.doc.setDrawColor(220);
        this.doc.line(PAGE.left, this.y + 1.5, PAGE.w - PAGE.right, this.y + 1.5);
        this.y += 4;
      }
    }
  }
  image(dataUrl, wPx, hPx, title) {
    const maxW = this.width;
    const maxH = PAGE.h - PAGE.bottom - this.y - 2;
    let w = maxW;
    let h = (hPx / wPx) * w;
    if (h > maxH) {
      h = maxH;
      w = (wPx / hPx) * h;
    }
    this.doc.addImage(dataUrl, 'PNG', PAGE.left + (maxW - w) / 2, this.y, w, h, undefined, 'FAST');
    this.y += h + 4;
    this.pageTitles[this.page] ||= title;
  }
  chrome() {
    const d = this.doc;
    const n = d.getNumberOfPages();
    const s = this.settings;
    const p = this.project;
    for (let i = 1; i <= n; i++) {
      if (this.noChrome.has(i)) continue;
      d.setPage(i);
      let x = PAGE.left;
      if (s.logo && /^data:image\/(png|jpe?g)/.test(s.logo)) {
        try {
          const props = d.getImageProperties(s.logo);
          const h = 8;
          const w = Math.min(30, (props.width / props.height) * h);
          d.addImage(s.logo, s.logo.includes('png') ? 'PNG' : 'JPEG', x, 9, w, h);
          x += w + 3;
        } catch {
          /* ignore broken logo */
        }
      }
      d.setFont('helvetica', 'bold');
      d.setFontSize(10);
      d.setTextColor(...this.accent);
      d.text(pdfSafe(s.company || 'AutoSpec'), x, 14.5);
      d.setFont('helvetica', 'normal');
      d.setFontSize(8.5);
      d.setTextColor(102, 112, 133);
      d.text(pdfSafe(this.pageTitles[i] || ''), PAGE.w - PAGE.right, 14.5, { align: 'right' });
      d.setDrawColor(...this.accent);
      d.setLineWidth(0.5);
      d.line(PAGE.left, 19, PAGE.w - PAGE.right, 19);
      d.setDrawColor(225);
      d.setLineWidth(0.2);
      d.line(PAGE.left, PAGE.h - 13, PAGE.w - PAGE.right, PAGE.h - 13);
      d.setFontSize(8);
      d.setTextColor(120, 128, 140);
      d.text(pdfSafe(s.footer || ''), PAGE.left, PAGE.h - 8);
      d.text(pdfSafe(`${p.meta.code || ''} · v${p.meta.version || ''} · ${today()}`), PAGE.w / 2, PAGE.h - 8, { align: 'center' });
      d.text(`Page ${i} of ${n}`, PAGE.w - PAGE.right, PAGE.h - 8, { align: 'right' });
    }
  }
  cover(subtitle) {
    const d = this.doc;
    const p = this.project;
    this.noChrome.add(this.page);
    d.setFillColor(...this.accent);
    d.rect(0, 0, PAGE.w, 92, 'F');
    if (this.settings.logo && /^data:image\/(png|jpe?g)/.test(this.settings.logo)) {
      try {
        const props = d.getImageProperties(this.settings.logo);
        const h = 14;
        d.addImage(this.settings.logo, this.settings.logo.includes('png') ? 'PNG' : 'JPEG', PAGE.left, 18, Math.min(50, (props.width / props.height) * h), h);
      } catch {
        /* ignore */
      }
    }
    d.setTextColor(255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(12);
    d.text(pdfSafe(this.settings.company || 'AutoSpec'), PAGE.left, 44);
    d.setFontSize(26);
    d.text(d.splitTextToSize(pdfSafe(p.meta.name || 'Untitled project'), PAGE.w - 36), PAGE.left, 60);
    d.setFont('helvetica', 'normal');
    d.setFontSize(13);
    d.text(pdfSafe(subtitle), PAGE.left, 84);
    d.setTextColor(55, 65, 81);
    d.setFontSize(10.5);
    const rows = [
      ['Client', p.meta.client],
      ['Project code', p.meta.code],
      ['Version', p.meta.version],
      ['Date', today()],
      ['Prepared by', p.meta.preparedBy],
      ['Methodology', p.meta.methodology],
      ['Classification', this.settings.footer],
    ].filter(([, v]) => v);
    let y = 112;
    for (const [k, v] of rows) {
      d.setFont('helvetica', 'bold');
      d.text(pdfSafe(k), PAGE.left, y);
      d.setFont('helvetica', 'normal');
      d.text(pdfSafe(v), PAGE.left + 40, y);
      y += 8;
    }
  }
}

/** One document as a branded PDF. */
export async function documentPdf(doc, project, settings) {
  const jsPDF = await getJsPdf();
  const w = new PdfWriter(jsPDF, settings, project);
  w.markdown(doc.markdown, doc.title);
  w.chrome();
  return w.doc.output('blob');
}

/** Full documentation pack: cover, contents, every document, every diagram. */
export async function packPdf(docs, diagrams, project, settings, onProgress = () => {}) {
  const jsPDF = await getJsPdf();
  const w = new PdfWriter(jsPDF, settings, project);
  w.cover('Project Documentation Pack');
  w.newPage('Contents');
  const tocPage = w.page;
  const starts = [];
  for (const [i, d] of docs.entries()) {
    onProgress(`Writing ${d.title} (${i + 1}/${docs.length})`);
    w.newPage(d.title);
    starts.push([d.title, w.page]);
    w.markdown(d.markdown, d.title);
  }
  if (diagrams.length) {
    w.newPage('Diagrams');
    starts.push(['Diagrams', w.page]);
    w.currentTitle = 'Diagrams';
    w.heading('Diagrams', 1);
    w.text('Generated from the project data. Each diagram is followed by a plain-English description.', { color: [102, 112, 133] });
    for (const [i, dg] of diagrams.entries()) {
      onProgress(`Drawing ${dg.title} (${i + 1}/${diagrams.length})`);
      try {
        const svg = await renderMermaid(dg.code);
        const png = await svgToPng(svg, 2);
        if (i > 0) w.newPage('Diagrams');
        w.heading(dg.title, 2);
        w.text(dg.description, { size: 9, color: [75, 85, 99], gapAfter: 4 });
        w.image(png.dataUrl, png.width, png.height, 'Diagrams');
      } catch (e) {
        w.heading(dg.title, 2);
        w.text(`This diagram could not be drawn: ${e.message}`, { color: [185, 28, 28] });
      }
    }
  }
  // Contents page
  w.doc.setPage(tocPage);
  w.y = PAGE.top;
  w.currentTitle = 'Contents';
  w.heading('Contents', 1);
  for (const [title, page] of starts) {
    const d = w.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(11);
    d.setTextColor(33, 37, 41);
    d.text(pdfSafe(title), PAGE.left, w.y + 4);
    d.text(String(page), PAGE.w - PAGE.right, w.y + 4, { align: 'right' });
    d.setDrawColor(230);
    d.setLineDashPattern([0.5, 1], 0);
    d.line(PAGE.left + d.getTextWidth(pdfSafe(title)) + 2, w.y + 4, PAGE.w - PAGE.right - 8, w.y + 4);
    d.setLineDashPattern([], 0);
    w.y += 8;
  }
  w.chrome();
  return w.doc.output('blob');
}

// ---------------- ZIP ----------------
export async function loadZipLib() {
  await loadScript(LIBS.jszip);
  return window.JSZip;
}

export async function zipPack(project, docs, diagrams, settings, { includePdf = true, onProgress = () => {} } = {}) {
  await loadScript(LIBS.jszip);
  const zip = new window.JSZip();
  const code = (project.meta.code || 'PROJECT').replace(/[^A-Za-z0-9_-]/g, '');
  const docsFolder = zip.folder('01_Documents');
  for (const d of docs) {
    docsFolder.file(`${d.filename}.md`, d.markdown);
    if (d.csv) docsFolder.file(`${d.filename}.csv`, d.csv);
  }
  const diagFolder = zip.folder('02_Diagrams');
  for (const [i, dg] of diagrams.entries()) {
    onProgress(`Rendering diagram ${i + 1}/${diagrams.length}`);
    const base = `${String(i + 1).padStart(2, '0')}_${dg.file.replace(/[^A-Za-z0-9]+/g, '_')}`;
    diagFolder.file(`${base}.mmd`, dg.code);
    diagFolder.file(`${base}_description.txt`, dg.description);
    try {
      diagFolder.file(`${base}.svg`, exportableSvg(await renderMermaid(dg.code)));
    } catch {
      /* keep the .mmd source even if rendering fails */
    }
  }
  if (includePdf) {
    onProgress('Building PDF pack');
    zip.file(`${code}_Documentation_Pack.pdf`, await packPdf(docs, diagrams, project, settings, onProgress));
  }
  zip.file(`${code}_project.json`, JSON.stringify(project, null, 2));
  zip.file(
    'README.md',
    [
      `# ${project.meta.name || 'Project'} — documentation pack`,
      '',
      `Generated ${today()} by AutoSpec Studio (rule-based, no AI).`,
      '',
      '- `01_Documents/` — every document as Markdown (and the RTM as CSV for Excel).',
      '- `02_Diagrams/` — Mermaid source (`.mmd`), vector images (`.svg`) and spoken descriptions.',
      `- \`${code}_Documentation_Pack.pdf\` — the full branded pack.`,
      `- \`${code}_project.json\` — the project file. Open it in AutoSpec Studio to keep working.`,
      '',
    ].join('\n')
  );
  onProgress('Compressing');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
