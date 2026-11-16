// Documents: list of generated documents, a reader view, Read Aloud and exports.
import { getProject, getEvaluation, getSettings } from '../store.js';
import { generateDocs } from '../generators/docs.js';
import { allDiagrams } from '../generators/diagrams.js';
import { PHASE_BY_ID } from '../sdlc.js';
import { markdownToHtml, toSpeech } from '../markdown.js';
import { documentPdf, packPdf, zipPack, downloadBlob, downloadText } from '../export.js';
import { esc, icon, $, readAloudBar, busy, toast } from '../ui/dom.js';

export function renderDocuments(root, docId) {
  const p = getProject();
  const ev = getEvaluation();
  const docs = generateDocs(p, ev);
  const doc = docs.find((d) => d.id === docId) || docs[0];

  root.innerHTML = `
    <header class="page-head">
      <div class="eyebrow">Outputs</div>
      <h1>${icon('file', 22)} Documents</h1>
      <p class="lead">Written automatically from your project data using standard templates. Edit the data and every document updates.</p>
    </header>
    <div class="docs-layout">
      <nav class="doc-list card flush" aria-label="Documents">
        ${docs
          .map((d) => {
            const ph = PHASE_BY_ID[d.phase];
            return `<a href="#/docs/${d.id}" class="${d.id === doc.id ? 'active' : ''}" ${d.id === doc.id ? 'aria-current="page"' : ''}>
              <span class="doc-title">${esc(d.title)}</span>
              <span class="muted small">${ph.order}. ${esc(ph.short)} · ${esc(d.audience)}</span></a>`;
          })
          .join('')}
        <div class="doc-list-foot">
          <button class="btn primary block" data-pack>${icon('download', 15)}<span>Full pack (PDF)</span></button>
          <button class="btn block" data-zip>${icon('folder', 15)}<span>Everything (ZIP)</span></button>
        </div>
      </nav>
      <section class="doc-view">
        <div class="doc-toolbar card">
          <div class="tb-left" data-tts></div>
          <div class="tb-right">
            <button class="btn sm" data-copy title="Copy as Markdown">${icon('copy', 14)}<span>Copy</span></button>
            <button class="btn sm" data-md title="Download Markdown">${icon('download', 14)}<span>.md</span></button>
            ${doc.csv ? `<button class="btn sm" data-csv title="Download CSV for Excel">${icon('download', 14)}<span>.csv</span></button>` : ''}
            <button class="btn sm primary" data-pdf>${icon('download', 14)}<span>PDF</span></button>
          </div>
        </div>
        <article class="paper doc-body">${markdownToHtml(doc.markdown)}</article>
      </section>
    </div>`;

  $('[data-tts]', root).appendChild(readAloudBar(() => toSpeech(doc.markdown), 'document'));
  $('[data-copy]', root).addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(doc.markdown);
      toast('Copied as Markdown');
    } catch {
      toast('Copy was blocked by the browser — use the .md download instead.', 'err');
    }
  });
  $('[data-md]', root).addEventListener('click', () => downloadText(doc.markdown, `${doc.filename}.md`, 'text/markdown'));
  $('[data-csv]', root)?.addEventListener('click', () => downloadText(doc.csv, `${doc.filename}.csv`, 'text/csv'));
  $('[data-pdf]', root).addEventListener('click', (e) =>
    busy(e.currentTarget, 'Building PDF…', async () => {
      const blob = await documentPdf(doc, p, getSettings());
      downloadBlob(blob, `${doc.filename}.pdf`);
      toast('PDF downloaded');
    })
  );
  $('[data-pack]', root).addEventListener('click', (e) =>
    busy(e.currentTarget, 'Building pack…', async (progress) => {
      const blob = await packPdf(docs, allDiagrams(p, ev, { lanes: getSettings().lanes }), p, getSettings(), progress);
      downloadBlob(blob, `${(p.meta.code || 'Project').replace(/\W+/g, '')}_Documentation_Pack.pdf`);
      toast('Documentation pack downloaded');
    })
  );
  $('[data-zip]', root).addEventListener('click', (e) =>
    busy(e.currentTarget, 'Packaging…', async (progress) => {
      const blob = await zipPack(p, docs, allDiagrams(p, ev, { lanes: getSettings().lanes }), getSettings(), { onProgress: progress });
      downloadBlob(blob, `${(p.meta.code || 'Project').replace(/\W+/g, '')}_AutoSpec_Pack.zip`);
      toast('ZIP downloaded');
    })
  );
}
