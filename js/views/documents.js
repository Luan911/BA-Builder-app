// Documents: list of generated documents, a reader view, Read Aloud and exports.
import { getProject, getEvaluation, getSettings } from '../store.js';
import { generateDocs } from '../generators/docs.js';
import { allDiagrams } from '../generators/diagrams.js';
import { markdownToHtml, toSpeech } from '../markdown.js';
import { documentPdf, packPdf, zipPack, downloadBlob, downloadText } from '../export.js';
import { esc, icon, $, readAloudBar, busy, toast, attachMenu } from '../ui/dom.js';

export function renderDocuments(root, docId) {
  const p = getProject();
  const ev = getEvaluation();
  const docs = generateDocs(p, ev);
  const doc = docs.find((d) => d.id === docId) || docs[0];

  root.innerHTML = `
    <header class="page-head simple">
      <h1>Documents</h1>
      <p class="lead">Written for you from your answers. Change an answer and the documents update.</p>
    </header>
    <div class="docs-layout">
      <nav class="doc-list card flush" aria-label="Documents">
        ${docs
          .map((d) => `<a href="#/docs/${d.id}" class="${d.id === doc.id ? 'active' : ''}" ${d.id === doc.id ? 'aria-current="page"' : ''}><span class="doc-title">${esc(d.title)}</span></a>`)
          .join('')}
        <div class="doc-list-foot">
          <button class="btn primary block" data-pack>${icon('download', 15)}<span>Download all (PDF)</span></button>
        </div>
      </nav>
      <section class="doc-view">
        <div class="doc-toolbar card">
          <div class="tb-left" data-tts></div>
          <div class="tb-right">
            <button class="btn sm primary" data-pdf>${icon('download', 14)}<span>Download PDF</span></button>
            <button class="icon-btn sm" data-more aria-label="More options" title="More options">${icon('more', 18)}</button>
          </div>
        </div>
        <article class="paper doc-body">${markdownToHtml(doc.markdown)}</article>
      </section>
    </div>`;

  $('[data-tts]', root).appendChild(readAloudBar(() => toSpeech(doc.markdown), 'document'));
  attachMenu($('[data-more]', root), [
    {
      label: 'Copy text', icon: 'copy',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(doc.markdown);
          toast('Copied');
        } catch {
          toast('Copy was blocked by the browser — use "Download as Markdown" instead.', 'err');
        }
      },
    },
    { label: 'Download as Markdown (.md)', icon: 'download', onClick: () => downloadText(doc.markdown, `${doc.filename}.md`, 'text/markdown') },
    ...(doc.csv ? [{ label: 'Download for Excel (.csv)', icon: 'download', onClick: () => downloadText(doc.csv, `${doc.filename}.csv`, 'text/csv') }] : []),
    { label: 'Download everything (.zip)', icon: 'folder', onClick: () => downloadZip(p, ev, docs) },
  ]);
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
}

function downloadZip(p, ev, docs) {
  return busy($('[data-pack]'), 'Packaging ZIP…', async (progress) => {
    const blob = await zipPack(p, docs, allDiagrams(p, ev, { lanes: getSettings().lanes }), getSettings(), { onProgress: progress });
    downloadBlob(blob, `${(p.meta.code || 'Project').replace(/\W+/g, '')}_AutoSpec_Pack.zip`);
    toast('ZIP downloaded');
  });
}
