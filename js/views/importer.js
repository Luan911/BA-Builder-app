// Import: meeting notes (pattern matching), code / repository inventory,
// requirements spreadsheet (CSV) and project files.
import { getProject, update, replaceProject } from '../store.js';
import { extractFromText } from '../importers/text.js';
import { analyseCode, inventoryMarkdown, skipReason, MAX_FILE_BYTES } from '../importers/code.js';
import { applyTextCandidates, applyTables, applyRoutes, applyRequirementsCsv, REQUIREMENTS_CSV_TEMPLATE } from '../importers/apply.js';
import { loadZipLib, downloadText } from '../export.js';
import { markdownToHtml, toSpeech } from '../markdown.js';
import { esc, icon, $, $$, toast, confirmDialog, readFileAsText, readAloudBar, busy } from '../ui/dom.js';

const GROUPS = [
  ['stories', 'User stories', (x) => `As a ${x.actor}, I want to ${x.want}${x.benefit ? `, so that ${x.benefit}` : ''}`],
  ['requirements', 'Functional requirements', (x) => x.statement],
  ['nfrs', 'Non-functional requirements', (x) => `${x.category}: ${x.text}`],
  ['rules', 'Business rules', (x) => x.text],
  ['acceptance', 'Acceptance criteria', (x) => `Given ${x.given}, when ${x.when}, then ${x.then}`],
  ['risks', 'Risks', (x) => x.text],
  ['assumptions', 'Assumptions', (x) => x.text],
  ['constraints', 'Constraints', (x) => x.text],
  ['decisions', 'Decisions', (x) => x.text],
  ['questions', 'Questions', (x) => x.text],
];

const SAMPLE_NOTES = `Workshop notes - online ordering
- As a customer, I want to track my order online so that I don't need to call support.
- Customers must be able to reset their password by email.
- The system should respond within 2 seconds for 95% of requests.
- A customer may hold at most 3 open returns.
- Decision: we will use the existing payment gateway.
- Risk: the warehouse API might not be ready before March.
- We assume all stores have a stable internet connection.
- Do we need multi-currency support?`;

export function renderImport(root, params) {
  const tab = params.get('tab') || 'notes';
  root.innerHTML = `
    <header class="page-head">
      <div class="eyebrow">Tools</div>
      <h1>${icon('upload', 22)} Import</h1>
      <p class="lead">Bring in what you already have. Nothing is added until you confirm it, and nothing leaves your browser.</p>
    </header>
    <div class="tabs" role="tablist">
      ${[['notes', 'Notes & emails'], ['code', 'Code / repository'], ['csv', 'Requirements spreadsheet'], ['file', 'Project file']]
        .map(([id, label]) => `<a role="tab" href="#/import?tab=${id}" class="${tab === id ? 'active' : ''}" aria-selected="${tab === id}">${label}</a>`)
        .join('')}
    </div>
    <div data-panel></div>`;
  const panel = $('[data-panel]', root);
  ({ notes: notesPanel, code: codePanel, csv: csvPanel, file: filePanel })[tab]?.(panel);
}

// ---------- notes ----------
function notesPanel(panel) {
  panel.innerHTML = `
    <section class="card">
      <h2 class="card-title">Find requirements in notes, emails or a brief</h2>
      <p class="muted small">Recognises common phrasing: "As a … I want … so that …", "shall / must / should", Given / When / Then, "Decision:", "Risk:", "We assume", questions ending in "?", limits like "at most 3". Each line is a suggestion you confirm.</p>
      <textarea class="big" data-notes rows="10" placeholder="Paste meeting notes, an email or a client brief here…"></textarea>
      <div class="row gap"><button class="btn primary" data-scan>${icon('list', 15)}<span>Find items</span></button><button class="btn ghost" data-sample>Try an example</button></div>
    </section>
    <div data-results></div>`;
  $('[data-sample]', panel).addEventListener('click', () => ($('[data-notes]', panel).value = SAMPLE_NOTES));
  $('[data-scan]', panel).addEventListener('click', () => {
    const found = extractFromText($('[data-notes]', panel).value);
    const total = GROUPS.reduce((n, [k]) => n + found[k].length, 0);
    const out = $('[data-results]', panel);
    if (!total) {
      out.innerHTML = `<div class="callout warn">${icon('info', 16)}<span>Nothing recognisable was found. Try one requirement per line, using "shall", "must" or "As a … I want …".</span></div>`;
      return;
    }
    out.innerHTML = `
      <section class="card">
        <h2 class="card-title">Found ${total} item${total === 1 ? '' : 's'} <span class="muted small">untick anything you don't want</span></h2>
        ${GROUPS.filter(([k]) => found[k].length)
          .map(
            ([k, label, fmt]) => `<h4>${esc(label)} <span class="count">${found[k].length}</span></h4>
            <div class="checklist">${found[k].map((x, i) => `<label class="check-row"><input type="checkbox" data-pick="${k}:${i}" checked><span>${esc(fmt(x))}</span></label>`).join('')}</div>`
          )
          .join('')}
        <div class="row gap"><button class="btn primary" data-apply>${icon('plus', 15)}<span>Add selected to project</span></button></div>
        <p class="small muted">${icon('info', 13)} Imported requirements are marked "Proposed". The quality check will show what each still needs (actor, priority, acceptance criteria…).</p>
      </section>`;
    $('[data-apply]', out).addEventListener('click', () => {
      const picked = Object.fromEntries(GROUPS.map(([k]) => [k, []]));
      $$('[data-pick]:checked', out).forEach((cb) => {
        const [k, i] = cb.dataset.pick.split(':');
        picked[k].push(found[k][Number(i)]);
      });
      let counts;
      update((p) => (counts = applyTextCandidates(p, picked)));
      const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
      toast(summary ? `Added ${summary}` : 'Nothing selected', summary ? 'ok' : 'info', 5000);
      location.hash = '#/s/requirements';
    });
  });
}

// ---------- code ----------
async function gatherFiles(fileList, onProgress) {
  const files = [];
  let bytes = 0;
  const LIMIT_FILES = 4000;
  const LIMIT_BYTES = 40 * 1024 * 1024;
  for (const f of fileList) {
    if (/\.zip$/i.test(f.name)) {
      const JSZip = await loadZipLib();
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files).filter((e) => !e.dir);
      for (const [i, e] of entries.entries()) {
        if (files.length >= LIMIT_FILES || bytes > LIMIT_BYTES) break;
        const reason = skipReason(e.name, 0);
        if (reason) {
          files.push({ path: e.name, content: '', size: 0 });
          continue;
        }
        const content = await e.async('string');
        bytes += content.length;
        files.push({ path: e.name, content, size: content.length });
        if (i % 50 === 0) onProgress(`Reading ${i + 1}/${entries.length}`);
      }
    } else {
      const path = f.webkitRelativePath || f.name;
      if (files.length >= LIMIT_FILES || bytes > LIMIT_BYTES) break;
      const reason = skipReason(path, f.size);
      const content = reason || f.size > MAX_FILE_BYTES ? '' : await readFileAsText(f);
      bytes += content.length;
      files.push({ path, content, size: f.size });
    }
  }
  return files;
}

function codePanel(panel) {
  panel.innerHTML = `
    <section class="card">
      <h2 class="card-title">Document an existing codebase</h2>
      <p class="muted small">Reads source files as text in your browser — the code is <b>never run, changed or uploaded</b>. Recognises ${esc('JavaScript/TypeScript, Python, Java, Kotlin, C#, Go, PHP, Ruby, Rust, Swift, Dart, C/C++, SQL, Prisma')} and more. Files that may hold secrets (such as <code>.env</code> or private keys) are skipped.</p>
      <div class="dropzone" data-drop>
        ${icon('folder', 28)}
        <p><b>Drop a .zip or files here</b>, or choose:</p>
        <div class="row gap center">
          <label class="btn">${icon('upload', 15)}<span>Choose .zip</span><input type="file" accept=".zip" data-zip hidden></label>
          <label class="btn">${icon('folder', 15)}<span>Choose folder</span><input type="file" webkitdirectory directory multiple data-folder hidden></label>
          <label class="btn">${icon('file', 15)}<span>Choose files</span><input type="file" multiple data-files hidden></label>
        </div>
      </div>
      <p class="small muted">${icon('info', 13)} Static analysis finds structure (endpoints, tables, classes, dependencies, configuration). It cannot know business intent — review the results with the development team.</p>
    </section>
    <div data-out></div>`;
  const out = $('[data-out]', panel);
  const run = async (list) => {
    if (!list?.length) return;
    out.innerHTML = `<div class="card loading"><span class="spinner"></span> <span data-msg>Reading files…</span></div>`;
    try {
      const files = await gatherFiles([...list], (m) => ($('[data-msg]', out).textContent = m));
      const inv = analyseCode(files);
      const name = list[0]?.name?.replace(/\.zip$/i, '') || (list[0]?.webkitRelativePath || '').split('/')[0] || 'Codebase';
      showInventory(out, inv, name);
    } catch (e) {
      out.innerHTML = `<div class="callout err">${icon('alert', 16)}<span>${esc(e.message)}</span></div>`;
    }
  };
  $('[data-zip]', panel).addEventListener('change', (e) => run(e.target.files));
  $('[data-folder]', panel).addEventListener('change', (e) => run(e.target.files));
  $('[data-files]', panel).addEventListener('change', (e) => run(e.target.files));
  const drop = $('[data-drop]', panel);
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    run(e.dataTransfer.files);
  });
}

function showInventory(out, inv, name) {
  const md = inventoryMarkdown(inv, name);
  const langs = Object.keys(inv.languages).length;
  out.innerHTML = `
    <section class="card">
      <h2 class="card-title">${esc(name)} — ${inv.files} files, ${inv.lines.toLocaleString()} lines, ${langs} language${langs === 1 ? '' : 's'}</h2>
      <div class="stats compact">
        <div class="stat"><span class="stat-num">${inv.routes.length}</span><span class="stat-label">API endpoints</span></div>
        <div class="stat"><span class="stat-num">${inv.tables.length}</span><span class="stat-label">Data tables</span></div>
        <div class="stat"><span class="stat-num">${inv.classes.length}</span><span class="stat-label">Classes / types</span></div>
        <div class="stat"><span class="stat-num">${inv.dependencies.length}</span><span class="stat-label">Dependencies</span></div>
        <div class="stat"><span class="stat-num">${inv.skipped.length}</span><span class="stat-label">Files skipped</span></div>
      </div>
      <div class="row gap wrap">
        <button class="btn primary" data-tables ${inv.tables.length ? '' : 'disabled'}>${icon('database', 15)}<span>Add ${inv.tables.length} table${inv.tables.length === 1 ? '' : 's'} to data model</span></button>
        <button class="btn" data-routes ${inv.routes.length ? '' : 'disabled'}>${icon('list', 15)}<span>Add ${inv.routes.length} endpoint${inv.routes.length === 1 ? '' : 's'} as draft requirements</span></button>
        <button class="btn" data-dl>${icon('download', 15)}<span>Download inventory (.md)</span></button>
        <span data-tts></span>
      </div>
    </section>
    <article class="paper doc-body">${markdownToHtml(md)}</article>`;
  $('[data-tts]', out).appendChild(readAloudBar(() => toSpeech(md.split('## Modules')[0]), 'inventory'));
  $('[data-dl]', out).addEventListener('click', () => downloadText(md, `Technical_Inventory_${name.replace(/\W+/g, '_')}.md`, 'text/markdown'));
  $('[data-tables]', out).addEventListener('click', () => {
    let n = 0;
    update((p) => (n = applyTables(p, inv.tables)));
    toast(n ? `Added ${n} entit${n === 1 ? 'y' : 'ies'} to the data model` : 'Those entities already exist', n ? 'ok' : 'info');
  });
  $('[data-routes]', out).addEventListener('click', () => {
    let n = 0;
    update((p) => (n = applyRoutes(p, inv.routes)));
    toast(n ? `Added ${n} draft requirement${n === 1 ? '' : 's'} — review them in Requirements` : 'Those endpoints are already listed', n ? 'ok' : 'info');
  });
}

// ---------- CSV ----------
function csvPanel(panel) {
  panel.innerHTML = `
    <section class="card">
      <h2 class="card-title">Import requirements from a spreadsheet</h2>
      <p class="muted small">Save your spreadsheet as CSV. Columns are matched by name: <code>ID, Title, Statement, Actor, Benefit, Priority, Given, When, Then</code>. Only Title or Statement is required.</p>
      <div class="row gap">
        <label class="btn primary">${icon('upload', 15)}<span>Choose CSV file</span><input type="file" accept=".csv,text/csv" data-csv hidden></label>
        <button class="btn" data-template>${icon('download', 15)}<span>Download template</span></button>
      </div>
      <div data-msg></div>
    </section>`;
  $('[data-template]', panel).addEventListener('click', () => downloadText(REQUIREMENTS_CSV_TEMPLATE, 'requirements_template.csv', 'text/csv'));
  $('[data-csv]', panel).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await readFileAsText(f);
    let res;
    update((p) => (res = applyRequirementsCsv(p, text)));
    $('[data-msg]', panel).innerHTML = `<div class="callout ${res.added ? 'ok' : 'warn'}">${icon(res.added ? 'check' : 'alert', 16)}<div>Imported ${res.added} requirement${res.added === 1 ? '' : 's'}.${res.errors.length ? `<ul>${res.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`;
  });
}

// ---------- project file ----------
function filePanel(panel) {
  const p = getProject();
  panel.innerHTML = `
    <section class="card">
      <h2 class="card-title">Save or open a project file</h2>
      <p class="muted small">Your work is saved automatically in this browser. Save a project file to back it up, move it to another computer, or share it with a colleague.</p>
      <div class="row gap">
        <button class="btn primary" data-save>${icon('save', 15)}<span>Save project file (.json)</span></button>
        <label class="btn">${icon('folder', 15)}<span>Open project file…</span><input type="file" accept=".json,application/json" data-open hidden></label>
      </div>
    </section>`;
  $('[data-save]', panel).addEventListener('click', () =>
    downloadText(JSON.stringify(getProject(), null, 2), `${(p.meta.code || 'project').replace(/\W+/g, '')}_autospec.json`, 'application/json')
  );
  $('[data-open]', panel).addEventListener('change', (e) =>
    busy(null, '', async () => {
      const f = e.target.files[0];
      if (!f) return;
      const data = JSON.parse(await readFileAsText(f));
      if (!data || typeof data !== 'object' || !data.meta) throw new Error('This is not an AutoSpec project file.');
      if (!(await confirmDialog(`Open "${data.meta.name || f.name}"? It replaces the current project (you can undo).`, { okLabel: 'Open' }))) return;
      replaceProject(data);
      toast('Project opened');
      location.hash = '#/';
    })
  );
}
