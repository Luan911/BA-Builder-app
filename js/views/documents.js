// Documents: preview any generated deliverable and export to Word, PDF (print), HTML or Markdown.
import { project, getSettings } from '../store.js';
import { esc, $, $$, toast, download, fileSafe } from '../ui.js';
import { DOC_LIST, buildDoc } from '../gen/docs.js';
import { mdToHtml } from '../markdown.js';
import { render, sized, svgToPng } from '../mermaid.js';

const PAPER_CSS = `body{font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;max-width:900px;margin:32px auto;padding:0 24px}
h1{font-size:22pt;color:#0f4f4a;margin:0 0 4pt}h2{font-size:14pt;color:#0f4f4a;border-bottom:2px solid #ccebe7;padding-bottom:3pt;margin-top:20pt}h3{font-size:12pt;margin-top:14pt}
table{border-collapse:collapse;width:100%;margin:6pt 0 10pt;font-size:10pt}th,td{border:1px solid #c9d3d8;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#eef5f4}
code{font-family:Consolas,monospace;font-size:9.5pt;background:#f1f5f9}pre{background:#f1f5f9;padding:8pt;font-size:9pt;white-space:pre-wrap}img{max-width:100%}.footer{margin-top:30pt;color:#667;font-size:9pt}
@page Portrait{size:595.3pt 841.9pt;margin:56pt 56pt 56pt 56pt}@page Landscape{size:841.9pt 595.3pt;mso-page-orientation:landscape;margin:40pt 40pt 40pt 40pt}
div.Portrait{page:Portrait}div.Landscape{page:Landscape}`;

// Word page widths in CSS pixels (96 per inch) inside the margins: A4 portrait and landscape.
const PAGE = { portrait: 643, portraitHeight: 900, landscape: 1015, landscapeHeight: 660 };

/** Render every mermaid placeholder inside `el`. mode 'svg' (screen) or 'png' (portable img). */
async function drawDiagrams(el, mode = 'svg') {
  for (const box of $$('.mmd', el)) {
    try {
      const svg = await render(box.dataset.code, { light: box.dataset.light === '1', tidy: !!getSettings().tidy });
      if (mode === 'svg') box.innerHTML = svg;
      else {
        const { w, h } = sized(svg);
        // wide diagrams go on a landscape page; render at a resolution that stays sharp when printed
        const wide = w > PAGE.portrait * 1.15 && w / h > 1.2;
        let dw = Math.min(wide ? PAGE.landscape : PAGE.portrait, w);
        const maxH = wide ? PAGE.landscapeHeight : PAGE.portraitHeight;
        if ((dw / w) * h > maxH) dw = Math.max(120, Math.round((maxH / h) * w)); // never taller than a page
        // about 190 dpi on paper, capped at ~8 megapixels so files stay a sensible size
        const scale = Math.max(0.5, Math.min(3, (dw * 2) / w, Math.sqrt(8e6 / (w * h)), 14000 / w, 14000 / h));
        const blob = await svgToPng(svg, scale, '#ffffff');
        const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        box.outerHTML = `<p${wide ? ' data-landscape="1"' : ''}><img src="${url}" width="${Math.round(dw)}" alt="Diagram"></p>`;
      }
    } catch (e) {
      box.innerHTML = `<pre>${esc(box.dataset.code)}</pre><p style="color:#b91c1c">Diagram could not be drawn: ${esc(e.message)}</p>`;
    }
  }
}

export async function docHtml(p, id, mode = 'png') {
  const doc = buildDoc(p, id);
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
  return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${PAPER_CSS}</style></head><body>${body}<p class="footer">${esc(org ? `${org} · ` : '')}${esc(p.meta.name)} · ${esc(doc.title)} · v${esc(p.meta.version)} · Generated with BA Builder</p></body></html>`;
}

export function renderDocuments(root, id) {
  const p = project();
  const cur = DOC_LIST.find((d) => d.id === id) || DOC_LIST[0];
  const doc = buildDoc(p, cur.id);
  root.innerHTML = `
    <div class="page-head no-print"><div><h1>Documents</h1><p>Every deliverable is written from your analysis and updates when the data changes. Export to Word, PDF, HTML or Markdown.</p></div></div>
    <div class="docs">
      <nav class="card doc-list no-print" aria-label="Documents">${DOC_LIST.map((d) => `<a href="#/docs/${d.id}" class="${d.id === cur.id ? 'on' : ''}">${esc(d.title)}<small>${esc(d.audience)}</small></a>`).join('')}</nav>
      <div>
        <div class="card no-print" style="margin-bottom:12px"><div class="row">
          <button class="btn primary sm" data-word>Word (.doc)</button>
          <button class="btn sm" data-print>PDF / print</button>
          <button class="btn sm" data-html>HTML</button>
          <button class="btn sm" data-md>Markdown</button>
          <button class="btn sm" data-copy>Copy text</button>
          <span class="grow"></span><span class="muted small">${doc.markdown.split(/\s+/).length.toLocaleString()} words</span>
        </div></div>
        <article class="paper" data-paper>${mdToHtml(doc.markdown)}</article>
      </div>
    </div>`;
  const paper = $('[data-paper]', root);
  drawDiagrams(paper, 'svg');
  const base = `${fileSafe(p.meta.code || p.meta.name)}_${fileSafe(cur.title)}`;
  $('[data-md]', root).onclick = () => download(doc.markdown, `${base}.md`, 'text/markdown');
  $('[data-print]', root).onclick = () => window.print();
  $('[data-copy]', root).onclick = async () => {
    try { await navigator.clipboard.writeText(doc.markdown); toast('Copied as Markdown'); } catch { toast('Copy blocked by the browser', 'err'); }
  };
  const busy = async (btn, fn) => {
    const t = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Preparing…';
    try { await fn(); } catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; btn.textContent = t; }
  };
  $('[data-word]', root).onclick = (e) => busy(e.target, async () => download(await docHtml(p, cur.id, 'png'), `${base}.doc`, 'application/msword'));
  $('[data-html]', root).onclick = (e) => busy(e.target, async () => download(await docHtml(p, cur.id, 'svg'), `${base}.html`, 'text/html'));
}
