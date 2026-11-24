// Documents: preview any generated deliverable and export to Word, PDF (print), HTML or Markdown.
import { project, getSettings, saveSettings } from '../store.js';
import { esc, $, $$, toast, download, fileSafe } from '../ui.js';
import { DOC_LIST, buildDoc, SECTION_LIST, CORE_DOCS, buildComposed } from '../gen/docs.js';
import { mdToHtml } from '../markdown.js';
import { render, sized, svgToPng } from '../mermaid.js';
import { docxFiles, mermaidBlocks, DEFAULT_BRAND } from '../gen/docx.js';
import { zipFiles } from '../gen/zip.js';

const PAPER_CSS_BASE = `body{font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;max-width:900px;margin:32px auto;padding:0 24px}
h1{font-size:22pt;color:#0f4f4a;margin:0 0 4pt}h2{font-size:14pt;color:#0f4f4a;border-bottom:2px solid #ccebe7;padding-bottom:3pt;margin-top:20pt}h3{font-size:12pt;margin-top:14pt}
table{border-collapse:collapse;width:100%;margin:6pt 0 10pt;font-size:10pt}th,td{border:1px solid #c9d3d8;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#eef5f4}
code{font-family:Consolas,monospace;font-size:9.5pt;background:#f1f5f9}pre{background:#f1f5f9;padding:8pt;font-size:9pt;white-space:pre-wrap}img{max-width:100%}.footer{margin-top:30pt;color:#667;font-size:9pt}
@page Portrait{size:595.3pt 841.9pt;margin:56pt 56pt 56pt 56pt}@page Landscape{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:40pt 40pt 40pt 40pt}
div.Portrait{page:Portrait}div.Landscape{page:Landscape}`;

const brandOf = () => ({ ...DEFAULT_BRAND, ...(getSettings().brand || {}) });
const paperCss = () => { const c = /^#[0-9a-f]{6}$/i.test(brandOf().colour) ? brandOf().colour : DEFAULT_BRAND.colour; return PAPER_CSS_BASE.replace(/#0f4f4a/g, c); };

// Word page widths in CSS pixels (96 per inch) inside the margins: A4 portrait and landscape.
const PAGE = { portrait: 643, portraitHeight: 900, landscape: 1015, landscapeHeight: 660 };

/** A diagram as a print-quality PNG, with the size it should appear on the page (CSS px). */
async function pngOf(svg) {
  const { w, h } = sized(svg);
  // wide diagrams go on a landscape page; render at a resolution that stays sharp when printed
  const wide = w > PAGE.portrait * 1.15 && w / h > 1.2;
  let dw = Math.min(wide ? PAGE.landscape : PAGE.portrait, w);
  const maxH = wide ? PAGE.landscapeHeight : PAGE.portraitHeight;
  if ((dw / w) * h > maxH) dw = Math.max(120, Math.round((maxH / h) * w)); // never taller than a page
  // about 190 dpi on paper, capped at ~8 megapixels so files stay a sensible size
  const scale = Math.max(0.5, Math.min(3, (dw * 2) / w, Math.sqrt(8e6 / (w * h)), 14000 / w, 14000 / h));
  const blob = await svgToPng(svg, scale, '#ffffff');
  return { blob, dw, dh: Math.round((dw / w) * h), wide };
}

const dataUrlBytes = (url) => Uint8Array.from(atob(String(url).split(',')[1] || ''), (c) => c.charCodeAt(0));

/** A real Word document (.docx) for a document id or an already-built document. */
export async function docxBlob(p, id) {
  const doc = typeof id === 'object' ? id : buildDoc(p, id);
  const s = getSettings();
  const brand = brandOf();
  const images = [];
  for (const code of mermaidBlocks(doc.markdown)) {
    try {
      const { blob, dw, dh, wide } = await pngOf(await render(code, { light: true, tidy: !!s.tidy }));
      images.push({ data: new Uint8Array(await blob.arrayBuffer()), w: dw, h: dh, wide });
    } catch { images.push(null); }
  }
  const logo = brand.logo?.url ? { data: dataUrlBytes(brand.logo.url), type: /^data:image\/jpe?g/.test(brand.logo.url) ? 'jpeg' : 'png', w: brand.logo.w, h: brand.logo.h } : null;
  const { files } = docxFiles({ title: doc.title, markdown: doc.markdown, meta: p.meta, images, logo, org: s.org, author: s.author || p.meta.analyst, brand, date: new Date().toISOString() });
  return new Blob([await zipFiles(files)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/** Render every mermaid placeholder inside `el`. mode 'svg' (screen) or 'png' (portable img). */
async function drawDiagrams(el, mode = 'svg') {
  for (const box of $$('.mmd', el)) {
    try {
      const svg = await render(box.dataset.code, { light: box.dataset.light === '1', tidy: !!getSettings().tidy });
      if (mode === 'svg') box.innerHTML = svg;
      else {
        const { blob, dw, wide } = await pngOf(svg);
        const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        box.outerHTML = `<p${wide ? ' data-landscape="1"' : ''}><img src="${url}" width="${Math.round(dw)}" alt="Diagram"></p>`;
      }
    } catch (e) {
      box.innerHTML = `<pre>${esc(box.dataset.code)}</pre><p style="color:#b91c1c">Diagram could not be drawn: ${esc(e.message)}</p>`;
    }
  }
}

/** Word / HTML file for a document id, or for an already-built document ({ title, markdown }). */
export async function docHtml(p, id, mode = 'png') {
  const doc = typeof id === 'object' ? id : buildDoc(p, id);
  const div = document.createElement('div');
  div.innerHTML = mdToHtml(doc.markdown);
  div.querySelectorAll('.mmd').forEach((m) => (m.dataset.light = '1'));
  await drawDiagrams(div, mode);
  const org = getSettings().org;
  let body = div.innerHTML;
  if (mode === 'png' && div.querySelector('[data-landscape]')) {
    // Word sections: portrait text, each wide diagram on its own landscape page (with the heading above it)
    const brk = '<br clear="all" style="page-break-before:always;mso-break-type:section-break">';
    const parts = [];
    let cur = [];
    const kids = [...div.children];
    kids.forEach((el, i) => {
      if (el.matches('[data-landscape]')) {
        const head = cur.length && /^H[1-4]$/.test(cur[cur.length - 1].tagName) ? cur.pop() : null;
        if (cur.length) parts.push(['Portrait', cur]);
        parts.push(['Landscape', head ? [head, el] : [el]]);
        cur = [];
      } else cur.push(el);
      if (i === kids.length - 1 && cur.length) parts.push(['Portrait', cur]);
    });
    body = parts.map(([cls, els], i) => `${i ? brk : ''}<div class="${cls}">${els.map((e) => e.outerHTML).join('')}</div>`).join('');
  } else if (mode === 'png') body = `<div class="Portrait">${body}</div>`;
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${paperCss()}</style></head><body>${body}<p class="footer">${esc(org ? `${org} · ` : '')}${esc(p.meta.name)} · ${esc(doc.title)} · v${esc(p.meta.version)} · Generated with BA Builder</p></body></html>`;
}

const DEFAULT_COMPOSE = { title: 'Requirements Sign-off Pack', sections: ['control', 'problem', 'objectives', 'stories', 'functional', 'nfr', 'rules', 'signoff'] };

export function renderDocuments(root, id) {
  const p = project();
  const composing = id === 'compose';
  const comp = { ...DEFAULT_COMPOSE, ...(getSettings().compose || {}) };
  const cur = composing ? { id: 'compose', title: comp.title } : DOC_LIST.find((d) => d.id === id) || DOC_LIST.find((d) => d.core) || DOC_LIST[0];
  const doc = composing ? buildComposed(p, comp.title || 'Document', comp.sections) : buildDoc(p, cur.id);
  const others = DOC_LIST.filter((d) => !d.core);
  const showAll = getSettings().mode === 'full' || others.some((d) => d.id === cur.id);
  const link = (d) => `<a href="#/docs/${d.id}" class="${d.id === cur.id ? 'on' : ''}">${esc(d.title)}<small>${esc(d.audience)}</small></a>`;
  const groups = [...new Set(SECTION_LIST.map((x) => x.group))];
  root.innerHTML = `
    <div class="page-head no-print"><div><h1>Documents</h1><p>Written from your analysis and always up to date. Use the five core deliverables, or build your own from any sections. Export to Word, PDF, HTML or Markdown, or copy as rich text into Word, Confluence or email.</p></div></div>
    <div class="docs">
      <nav class="card doc-list no-print" aria-label="Documents">
        <div class="nav-label">Core deliverables</div>${CORE_DOCS.map((c) => link(DOC_LIST.find((d) => d.id === c.id))).join('')}
        <div class="nav-label">Custom</div><a href="#/docs/compose" class="${composing ? 'on' : ''}">Build a document<small>Pick the sections you need</small></a>
        <details ${showAll ? 'open' : ''}><summary class="nav-label" style="cursor:pointer">More documents (${others.length})</summary>${others.map(link).join('')}</details>
      </nav>
      <div style="min-width:0">
        ${composing ? `<div class="card no-print" style="margin-bottom:12px">
          <div class="row" style="gap:8px;flex-wrap:wrap"><label class="field" style="flex:1;min-width:220px;margin:0"><span>Document title</span><input type="text" data-ct value="${esc(comp.title)}"></label>
            <button class="btn sm" data-cpreset="core-functional">Start from a core deliverable…</button></div>
          <div class="grid g3" style="margin-top:10px">${groups.map((g) => `<div><b class="small" style="color:var(--green-2)">${esc(g)}</b>${SECTION_LIST.filter((x) => x.group === g).map((x) => `<label class="small" style="display:block;margin:3px 0"><input type="checkbox" data-sec="${x.id}" ${comp.sections.includes(x.id) ? 'checked' : ''}> ${esc(x.title)}</label>`).join('')}</div>`).join('')}</div>
          <p class="small muted" style="margin:8px 0 0">Sections with nothing in them yet are left out automatically. Your choice is remembered.</p>
        </div>` : ''}
        <div class="card no-print" style="margin-bottom:12px"><div class="row" style="flex-wrap:wrap">
          <button class="btn primary sm" data-word title="A real Word file with a cover page, contents, your logo and colours, page numbers, and wide diagrams on landscape pages">Word (.docx)</button>
          <button class="btn sm" data-print>PDF / print</button>
          <button class="btn sm" data-rich title="Paste into Word, Confluence, Google Docs or Outlook with headings and tables">Copy rich text</button>
          <button class="btn sm" data-html>HTML</button>
          <button class="btn sm" data-md>Markdown</button>
          <span class="grow"></span><span class="muted small">${doc.markdown.split(/\s+/).length.toLocaleString()} words</span>
        </div></div>
        <article class="paper" data-paper>${mdToHtml(doc.markdown)}</article>
      </div>
    </div>`;
  const paper = $('[data-paper]', root);
  drawDiagrams(paper, 'svg');
  const base = `${fileSafe(p.meta.code || p.meta.name)}_${fileSafe(doc.title)}`;
  $('[data-md]', root).onclick = () => download(doc.markdown, `${base}.md`, 'text/markdown');
  $('[data-print]', root).onclick = () => window.print();
  const busy = async (btn, fn) => {
    const t = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing…';
    try { await fn(); } catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; btn.textContent = t; }
  };
  $('[data-word]', root).onclick = (e) => busy(e.target, async () => download(await docxBlob(p, doc), `${base}.docx`));
  $('[data-html]', root).onclick = (e) => busy(e.target, async () => download(await docHtml(p, doc, 'svg'), `${base}.html`, 'text/html'));
  // rich text: headings, tables and diagrams (as images) paste cleanly into Word, Confluence, Google Docs, Outlook
  $('[data-rich]', root).onclick = (e) => busy(e.target, async () => {
    const html = await docHtml(p, doc, 'png');
    const body = html.replace(/^[\s\S]*?<body>/i, '').replace(/<\/body>[\s\S]*$/i, '');
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([body], { type: 'text/html' }), 'text/plain': new Blob([doc.markdown], { type: 'text/plain' }) })]);
      toast('Copied — paste into Word, Confluence, Google Docs or Outlook');
    } catch {
      await navigator.clipboard.writeText(doc.markdown).then(() => toast('Your browser only allowed plain text — copied as Markdown')).catch(() => toast('Copy was blocked by the browser', 'err'));
    }
  });
  if (composing) {
    const save = (patch) => saveSettings({ compose: { ...comp, ...patch } });
    const ct = $('[data-ct]', root);
    ct.onchange = () => save({ title: ct.value.trim() || 'Document' });
    root.querySelectorAll('[data-sec]').forEach((c) => (c.onchange = () => {
      const picked = SECTION_LIST.map((x) => x.id).filter((sid) => root.querySelector(`[data-sec="${sid}"]`).checked);
      save({ sections: picked });
    }));
    $('[data-cpreset]', root).onclick = () => {
      const pick = prompt(`Start from which deliverable?\n${CORE_DOCS.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}`, '2');
      const c = CORE_DOCS[(+pick || 0) - 1];
      if (c) save({ title: c.title, sections: [...c.sections] });
    };
  }
}
