// Settings: document branding, Read Aloud voice, appearance and project data.
import { getSettings, updateSettings, getProject, newBlankProject, loadSample, DEFAULT_SETTINGS } from '../store.js';
import { getVoices, onVoicesReady, speak, speechSupported } from '../speech.js';
import { downloadText } from '../export.js';
import { esc, icon, $, toast, confirmDialog, readFileAsDataUrl } from '../ui/dom.js';

/** Convert any image (incl. SVG) to a small PNG data URL that PDFs can embed. */
async function toPngLogo(file) {
  const src = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const h = 120;
      const w = Math.max(1, Math.round((img.naturalWidth / img.naturalHeight) * h)) || 120;
      const c = document.createElement('canvas');
      c.width = Math.min(w, 600);
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = src;
  });
}

export function renderSettings(root) {
  const s = getSettings();
  root.innerHTML = `
    <header class="page-head">
      <div class="eyebrow">Tools</div>
      <h1>${icon('settings', 22)} Settings</h1>
      <p class="lead">Branding for exported documents, the Read Aloud voice, appearance and your project data.</p>
    </header>
    <div class="layout-2">
      <div class="stack">
        <section class="card">
          <h2 class="card-title">Document branding</h2>
          <div class="form-grid">
            <label class="field"><span class="label">Company / team name</span><input type="text" data-set="company" value="${esc(s.company)}"></label>
            <label class="field"><span class="label">Brand colour</span><input type="color" data-set="accent" value="${esc(s.accent)}"></label>
            <label class="field span-2"><span class="label">Footer / classification text</span><input type="text" data-set="footer" value="${esc(s.footer)}" placeholder="e.g. Confidential — for client use only"></label>
            <div class="field span-2"><span class="label">Logo (PNG, JPG or SVG)</span>
              <div class="row gap">
                <label class="btn sm">${icon('image', 14)}<span>${s.logo ? 'Replace logo' : 'Upload logo'}</span><input type="file" accept="image/*" data-logo hidden></label>
                ${s.logo ? `<button class="btn sm ghost" data-clear-logo>${icon('trash', 14)}<span>Remove</span></button>` : ''}
              </div>
            </div>
          </div>
          <h4>PDF header preview</h4>
          <div class="pdf-preview" style="--brand:${esc(s.accent)}">
            <div class="pp-head">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : ''}<b>${esc(s.company || 'AutoSpec')}</b><span>Business Requirements (BRD)</span></div>
            <div class="pp-lines"><span></span><span></span><span></span></div>
            <div class="pp-foot"><span>${esc(s.footer)}</span><span>${esc(getProject().meta.code || 'CODE')} · v${esc(getProject().meta.version || '0.1')}</span><span>Page 1 of 9</span></div>
          </div>
        </section>

        <section class="card">
          <h2 class="card-title">Read Aloud</h2>
          ${
            speechSupported
              ? `<div class="form-grid">
                  <label class="field"><span class="label">Voice</span><select data-voice><option value="">Default voice</option></select></label>
                  <label class="field"><span class="label">Speed <span data-rate-val>${s.rate}×</span></span><input type="range" min="0.5" max="2" step="0.05" value="${s.rate}" data-rate></label>
                </div>
                <button class="btn sm" data-test>${icon('volume', 14)}<span>Test voice</span></button>
                <p class="small muted">Voices come from your operating system and browser. Microsoft Edge and Chrome offer the most natural voices.</p>`
              : `<p class="muted">Read Aloud is not supported in this browser.</p>`
          }
        </section>

        <section class="card">
          <h2 class="card-title">Appearance</h2>
          <div class="segmented" role="radiogroup" aria-label="Theme">
            ${['auto', 'light', 'dark'].map((t) => `<button role="radio" aria-checked="${s.theme === t}" class="${s.theme === t ? 'on' : ''}" data-theme-set="${t}">${t === 'auto' ? 'Match system' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
          </div>
          <label class="check-row"><input type="checkbox" data-lanes ${s.lanes ? 'checked' : ''}><span>Draw swimlanes in process diagrams</span></label>
        </section>

        <section class="card">
          <h2 class="card-title">Project data</h2>
          <p class="muted small">Everything is stored in this browser only. Save a project file regularly as a backup.</p>
          <div class="row gap wrap">
            <button class="btn" data-save>${icon('save', 15)}<span>Save project file</span></button>
            <a class="btn" href="#/import?tab=file">${icon('folder', 15)}<span>Open project file</span></a>
            <button class="btn" data-sample>${icon('book', 15)}<span>Load example project</span></button>
            <button class="btn danger ghost" data-new>${icon('plus', 15)}<span>Start a new blank project</span></button>
          </div>
          <button class="btn ghost sm" data-reset-settings>Reset settings to defaults</button>
        </section>
      </div>
      <aside class="tips"><h3>${icon('info', 15)} About AutoSpec Studio</h3><ul>
        <li>Every check, document and diagram is produced by fixed rules and templates — no AI, so results are repeatable.</li>
        <li>Runs entirely in your browser; suitable for hosting on GitHub Pages.</li>
        <li>Diagram, PDF and ZIP libraries load from a public CDN the first time they are used.</li>
      </ul></aside>
    </div>`;

  root.querySelectorAll('[data-set]').forEach((el) =>
    el.addEventListener('change', () => {
      updateSettings({ [el.dataset.set]: el.value });
      renderSettings(root);
    })
  );
  $('[data-logo]', root).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      updateSettings({ logo: await toPngLogo(f) });
      toast('Logo saved');
      renderSettings(root);
    } catch (err) {
      toast(err.message, 'err');
    }
  });
  $('[data-clear-logo]', root)?.addEventListener('click', () => {
    updateSettings({ logo: '' });
    renderSettings(root);
  });
  if (speechSupported) {
    const sel = $('[data-voice]', root);
    onVoicesReady(() => {
      const cur = getSettings().voiceURI;
      sel.innerHTML = `<option value="">Default voice</option>${getVoices().map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === cur ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}`;
    });
    sel.addEventListener('change', () => updateSettings({ voiceURI: sel.value }));
    $('[data-rate]', root).addEventListener('input', (e) => {
      $('[data-rate-val]', root).textContent = `${e.target.value}×`;
      updateSettings({ rate: Number(e.target.value) });
    });
    $('[data-test]', root).addEventListener('click', () =>
      speak('This is how documents will sound when they are read aloud.', { rate: getSettings().rate, voiceURI: getSettings().voiceURI })
    );
  }
  root.querySelectorAll('[data-theme-set]').forEach((b) =>
    b.addEventListener('click', () => {
      updateSettings({ theme: b.dataset.themeSet });
      renderSettings(root);
    })
  );
  $('[data-lanes]', root).addEventListener('change', (e) => updateSettings({ lanes: e.target.checked }));
  $('[data-save]', root).addEventListener('click', () => {
    const p = getProject();
    downloadText(JSON.stringify(p, null, 2), `${(p.meta.code || 'project').replace(/\W+/g, '')}_autospec.json`, 'application/json');
  });
  $('[data-sample]', root).addEventListener('click', async () => {
    if (await confirmDialog('Replace the current project with the example project? You can undo this.', { okLabel: 'Load example' })) {
      loadSample();
      location.hash = '#/';
    }
  });
  $('[data-new]', root).addEventListener('click', async () => {
    if (await confirmDialog('Start a new blank project? The current project will be replaced (save a project file first if you want to keep it). You can undo this.', { okLabel: 'Start new project', danger: true })) {
      newBlankProject();
      location.hash = '#/project';
    }
  });
  $('[data-reset-settings]', root).addEventListener('click', () => {
    updateSettings({ ...DEFAULT_SETTINGS });
    renderSettings(root);
  });
}
