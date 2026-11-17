// Projects, import / export, technical exports and preferences.
import { project, projects, switchProject, newProject, loadSample, deleteProject, addProject, update, getSettings, saveSettings } from '../store.js';
import { esc, $, $$, toast, download, pickFile, fileSafe, confirmBox } from '../ui.js';
import { COLLECTIONS, uid, ensureCode, normalize } from '../model.js';
import { openApi, sqlDdl, jsonSchemas, rtmCsv, toCsv } from '../gen/exports.js';
import { DOC_LIST, buildDoc } from '../gen/docs.js';
import { allDiagrams } from '../gen/diagrams.js';
import { exportSvg } from './canvas.js';

/** Minimal RFC 4180 CSV parser. */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim()));
}

const IMPORTABLE = ['requirements', 'stories', 'stakeholders', 'glossary', 'raid', 'tests', 'questions'];

function importCsv(key, text) {
  const c = COLLECTIONS[key];
  const [head, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  if (!head) throw new Error('The file is empty');
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const map = head.map((h) => c.fields.find((f) => norm(f.label) === norm(h) || norm(f.key) === norm(h) || norm(f.label).startsWith(norm(h))));
  if (!map.some(Boolean)) throw new Error(`No columns matched. Use headings like: ${c.fields.slice(0, 5).map((f) => f.label).join(', ')}`);
  const items = rows.map((r) => {
    const it = { id: uid(key.slice(0, 3)), ...(c.defaults ? c.defaults() : {}) };
    r.forEach((v, i) => {
      const f = map[i];
      if (!f || f.type === 'multi' || f.type === 'rows') return;
      if (f.type === 'list') it[f.key] = v.split(/;|\n/).map((s) => s.trim()).filter(Boolean);
      else if (f.type === 'number') it[f.key] = v === '' ? '' : Number(v);
      else if (f.type === 'check') it[f.key] = /^(y|yes|true|1)$/i.test(v.trim());
      else if (f.type === 'select' && typeof f.options !== 'function') {
        const opt = f.options.map((o) => (typeof o === 'object' ? o.value : o)).find((o) => norm(o) === norm(v) || norm(o).startsWith(norm(v)));
        if (opt) it[f.key] = opt;
      } else if (f.type !== 'select') it[f.key] = v.trim();
    });
    return it;
  });
  update((pr) => items.forEach((it) => (ensureCode(key, it, pr[key]), pr[key].push(it))));
  return items.length;
}

async function zipAll(p, onStep) {
  await new Promise((res, rej) => {
    if (window.JSZip) return res();
    const s = Object.assign(document.createElement('script'), { src: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', onload: res, onerror: () => rej(new Error('Could not load the ZIP library — check your connection')) });
    document.head.appendChild(s);
  });
  const { docHtml } = await import('./documents.js');
  const zip = new window.JSZip();
  const code = fileSafe(p.meta.code || p.meta.name);
  for (const [i, d] of DOC_LIST.entries()) {
    onStep(`Document ${i + 1}/${DOC_LIST.length}`);
    const n = `${String(i + 1).padStart(2, '0')}_${fileSafe(d.title)}`;
    zip.file(`documents/${n}.md`, buildDoc(p, d.id).markdown);
    zip.file(`documents/${n}.doc`, await docHtml(p, d.id, 'png'));
  }
  for (const dg of allDiagrams(p)) zip.file(`diagrams/${fileSafe(dg.title)}.mmd`, dg.code);
  for (const c of p.canvases) zip.file(`diagrams/whiteboard_${fileSafe(c.name)}.svg`, exportSvg(c));
  zip.file('technical/openapi.yaml', openApi(p));
  zip.file('technical/schema.sql', sqlDdl(p));
  zip.file('technical/json-schemas.json', jsonSchemas(p));
  zip.file('technical/traceability_matrix.csv', rtmCsv(p));
  for (const k of Object.keys(COLLECTIONS)) if (p[k].length) zip.file(`registers/${fileSafe(COLLECTIONS[k].title)}.csv`, toCsv(k, p));
  zip.file(`${code}.babuilder.json`, JSON.stringify(p, null, 2));
  onStep('Compressing');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function renderSettings(root) {
  const p = project();
  const s = getSettings();
  const code = fileSafe(p.meta.code || p.meta.name);
  root.innerHTML = `
    <div class="page-head"><div><h1>Projects & export</h1><p>Everything is stored in this browser. Export a project file to back it up or share it with another analyst.</p></div></div>
    <section class="card flush"><div class="card-head"><h2>Projects</h2><span class="grow"></span><input type="text" placeholder="New project name" data-pname style="max-width:240px"><button class="btn sm primary" data-new>+ New project</button><button class="btn sm" data-sample>Add example project</button><button class="btn sm" data-import>Import project file</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Project</th><th>Code</th><th>Updated</th><th>Requirements</th><th></th></tr></thead><tbody>
      ${projects().map((x) => `<tr><td><b>${esc(x.meta.name || 'Untitled')}</b>${x.id === p.id ? ' <span class="pill ok">Open</span>' : ''}</td><td>${esc(x.meta.code)}</td><td class="small">${esc(String(x.updatedAt).slice(0, 16).replace('T', ' '))}</td><td>${x.requirements.length}</td>
        <td style="white-space:nowrap">${x.id !== p.id ? `<button class="btn sm" data-open="${x.id}">Open</button>` : ''}<button class="btn sm" data-dupp="${x.id}">Duplicate</button><button class="btn sm danger" data-delp="${x.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div></section>

    <section class="card"><h2>Export "${esc(p.meta.name || 'this project')}"</h2>
      <div class="grid g3" style="margin-top:12px">
        <button class="btn primary" data-zip>Complete pack (.zip)</button>
        <button class="btn" data-json>Project file (.json)</button>
        <button class="btn" data-oas>OpenAPI 3.0 (.yaml)</button>
        <button class="btn" data-sql>Database DDL (.sql)</button>
        <button class="btn" data-jss>JSON Schemas (.json)</button>
        <button class="btn" data-rtm>Traceability matrix (.csv)</button>
      </div>
      <p class="muted small" style="margin-top:10px">The complete pack contains all 18 documents (Word + Markdown), every diagram source, whiteboards, technical specs, CSV registers and the project file.</p>
    </section>

    <section class="card"><h2>Import from CSV / Excel</h2>
      <p class="muted small">Save a sheet as CSV with a heading row. Columns are matched to field names (e.g. Title, Requirement statement, Type, Priority).</p>
      <div class="row"><select data-ckey style="max-width:240px">${IMPORTABLE.map((k) => `<option value="${k}">${esc(COLLECTIONS[k].title)}</option>`).join('')}</select><button class="btn" data-csvin>Choose CSV file…</button><button class="btn ghost" data-tpl>Download template</button></div>
    </section>

    <section class="card"><h2>Preferences</h2>
      <div class="form" style="margin-top:10px">
        <label class="field"><span>Theme</span><select data-theme>${['auto', 'light', 'dark'].map((t) => `<option ${s.theme === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Organisation (document footer)</span><input type="text" data-org value="${esc(s.org)}"></label>
      </div>
    </section>`;

  $('[data-new]', root).onclick = () => { newProject($('[data-pname]', root).value.trim() || 'New project'); location.hash = '#/charter'; };
  $('[data-sample]', root).onclick = () => (loadSample(), toast('Example project added'));
  $('[data-import]', root).onclick = async () => {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const data = JSON.parse(f.text);
      if (!data.meta) throw new Error('not a BA Builder project');
      const x = normalize(data);
      if (projects().some((y) => y.id === x.id)) x.id = uid('prj');
      addProject(x);
      toast(`Imported "${x.meta.name}"`);
    } catch (e) { toast(`Could not import: ${e.message}`, 'err'); }
  };
  $$('[data-open]', root).forEach((b) => (b.onclick = () => switchProject(b.dataset.open)));
  $$('[data-dupp]', root).forEach((b) => (b.onclick = () => {
    const src = projects().find((x) => x.id === b.dataset.dupp);
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid('prj');
    copy.meta.name = `${copy.meta.name} (copy)`;
    addProject(copy);
    toast('Project duplicated');
  }));
  $$('[data-delp]', root).forEach((b) => (b.onclick = async () => {
    const x = projects().find((y) => y.id === b.dataset.delp);
    if (await confirmBox(`Permanently delete "${x.meta.name}"? Export it first if you may need it again. This cannot be undone.`)) deleteProject(x.id);
  }));
  $('[data-json]', root).onclick = () => download(JSON.stringify(p, null, 2), `${code}.babuilder.json`, 'application/json');
  $('[data-oas]', root).onclick = () => download(openApi(p), `${code}_openapi.yaml`, 'application/yaml');
  $('[data-sql]', root).onclick = () => download(sqlDdl(p), `${code}_schema.sql`, 'application/sql');
  $('[data-jss]', root).onclick = () => download(jsonSchemas(p), `${code}_schemas.json`, 'application/json');
  $('[data-rtm]', root).onclick = () => download(rtmCsv(p), `${code}_RTM.csv`, 'text/csv');
  $('[data-zip]', root).onclick = async (e) => {
    const btn = e.target;
    btn.disabled = true;
    try { download(await zipAll(p, (m) => (btn.textContent = m)), `${code}_BA_pack.zip`); toast('Pack downloaded'); } catch (err) { toast(err.message, 'err'); } finally { btn.disabled = false; btn.textContent = 'Complete pack (.zip)'; }
  };
  $('[data-csvin]', root).onclick = async () => {
    const key = $('[data-ckey]', root).value;
    const f = await pickFile('.csv,text/csv');
    if (!f) return;
    try { toast(`Imported ${importCsv(key, f.text)} ${COLLECTIONS[key].title.toLowerCase()}`); } catch (e) { toast(e.message, 'err'); }
  };
  $('[data-tpl]', root).onclick = () => {
    const key = $('[data-ckey]', root).value;
    download(`${COLLECTIONS[key].fields.filter((f) => !['multi', 'rows'].includes(f.type) && !(f.type === 'select' && typeof f.options === 'function')).map((f) => f.label).join(',')}\r\n`, `${fileSafe(COLLECTIONS[key].title)}_template.csv`, 'text/csv');
  };
  $('[data-theme]', root).onchange = (e) => saveSettings({ theme: e.target.value });
  $('[data-org]', root).onchange = (e) => saveSettings({ org: e.target.value.trim() });
}
