// Projects, import / export, technical exports and preferences.
import { project, projects, switchProject, newProject, loadSample, deleteProject, addProject, update, getSettings, saveSettings, templates, saveTemplate, deleteTemplate, workspace, restoreProjects, replaceWorkspace } from '../store.js';
import { backupFile, backupName, parseBackup, restorePlan, mergeSettings, savePoint, listPoints, readPoint, INTERVALS } from '../backup.js';
import { templateFrom } from '../gen/capture.js';
import { jiraExportModal, jiraImport } from './capture.js';
import { esc, $, $$, toast, download, pickFile, fileSafe, confirmBox } from '../ui.js';
import { COLLECTIONS, uid, ensureCode, normalize } from '../model.js';
import { openApi, sqlDdl, jsonSchemas, rtmCsv, toCsv, postmanCollection, parseCsv } from '../gen/exports.js';
import { DOC_LIST, buildDoc } from '../gen/docs.js';
import { allDiagrams } from '../gen/diagrams.js';
import { exportSvg } from './canvas.js';
import { zipFiles } from '../gen/zip.js';
import { DEFAULT_BRAND } from '../gen/docx.js';

/** Download a backup of every project and remember when. */
export function backupNow() {
  const now = new Date();
  download(JSON.stringify(backupFile(projects(), getSettings(), now), null, 1), backupName(now), 'application/json');
  saveSettings({ lastBackup: now.toISOString(), backupSnooze: '' }, { quiet: true });
  // ask the browser not to clear this site's data when space runs low (no prompt in most browsers)
  navigator.storage?.persist?.().catch(() => {});
  toast(`Backup downloaded — ${projects().length} project${projects().length === 1 ? '' : 's'}. Keep the file somewhere safe (e.g. OneDrive or Google Drive).`);
}

const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtWhen = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '—' : `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; };

/** Restore from a backup file (or a single project file) after showing what will happen. */
async function restoreFromFile() {
  const f = await pickFile('.json,application/json');
  if (!f) return;
  try {
    const b = parseBackup(f.text);
    const plan = restorePlan(projects(), b.projects);
    const lines = [
      plan.replace.length ? `Replace ${plan.replace.length}: ${plan.replace.join(', ')}` : '',
      plan.newer.length ? `(${plan.newer.join(', ')} ${plan.newer.length === 1 ? 'has' : 'have'} newer changes here than in the backup)` : '',
      plan.add.length ? `Add ${plan.add.length}: ${plan.add.join(', ')}` : '',
      plan.keep.length ? `Keep ${plan.keep.length} other project${plan.keep.length === 1 ? '' : 's'} as they are` : '',
    ].filter(Boolean).join('. ');
    if (!(await confirmBox(`Restore from ${f.name}${b.createdAt ? ` (${fmtWhen(b.createdAt)})` : ''}? ${lines}. A restore point of your current work is saved first.`, 'Restore'))) return;
    await savePoint(workspace(), 'Before restoring a backup', 'before').catch(() => {});
    restoreProjects(b.projects, b.settings ? mergeSettings(getSettings(), b.settings) : null);
    toast(`Restored ${b.projects.length} project${b.projects.length === 1 ? '' : 's'}`);
  } catch (e) { toast(`Could not restore: ${e.message}`, 'err'); }
}

/** Fill in the offline status, storage use and restore points (all asynchronous). */
async function fillSafety(root) {
  const off = $('[data-offline]', root);
  if (off) {
    const sw = navigator.serviceWorker;
    if (!sw || !/^https?:$/.test(location.protocol)) off.textContent = 'Not available in this browser.';
    else if (location.hostname === 'localhost') off.textContent = 'Running from this computer (localhost): every file, including the diagram and SQL libraries, is already local, so no internet is needed. When the app is opened from a web address it also saves itself on the device for offline use.';
    else if (!sw.controller) off.textContent = 'Saving BA Builder on this device… (reload once it is done to be sure).';
    else {
      off.textContent = 'Ready — BA Builder is saved on this device and opens without internet.';
      sw.addEventListener('message', (e) => { if (e.data?.type === 'status') off.textContent = `Ready — BA Builder is saved on this device (${e.data.files} files, version ${e.data.version}) and opens without internet.`; }, { once: true });
      sw.controller.postMessage('status');
    }
  }
  const st = $('[data-storage]', root);
  if (st && navigator.storage?.estimate) {
    try {
      const [{ usage, quota }, kept] = await Promise.all([navigator.storage.estimate(), navigator.storage.persisted?.() ?? false]);
      st.textContent = `This browser holds ${fmtSize(usage || 0)} for BA Builder${quota ? ` (of about ${fmtSize(quota)} available)` : ''}. ${kept ? 'Protected: the browser will not clear it to free space.' : 'Not yet protected from automatic clean-up — backing up asks the browser to keep it.'}`;
    } catch { st.textContent = ''; }
  }
  const box = $('[data-points]', root);
  if (!box) return;
  try {
    const pts = await listPoints();
    box.innerHTML = pts.length ? `<div class="tbl-wrap"><table class="tbl points"><thead><tr><th>Restore point</th><th>Saved</th><th>Projects</th><th>Size</th><th></th></tr></thead><tbody>${pts.map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(fmtWhen(x.at))}</td><td>${x.projects}</td><td>${fmtSize(x.size)}</td><td><button class="btn sm" data-rp="${esc(x.id)}">Restore</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small" style="padding:0 16px 12px">No restore points yet — the first is saved a few seconds after you start working.</p>';
    $$('[data-rp]', box).forEach((b) => (b.onclick = async () => {
      const pt = pts.find((x) => x.id === b.dataset.rp);
      if (!(await confirmBox(`Go back to the restore point "${pt.label}" from ${fmtWhen(pt.at)}? Every project in this browser is replaced by that copy (${pt.projects} project${pt.projects === 1 ? '' : 's'}). Your current work is saved as a restore point first, so you can come back.`, 'Restore'))) return;
      try {
        const data = await readPoint(pt.id);
        await savePoint(workspace(), 'Before going back to a restore point', 'before');
        replaceWorkspace(data);
        toast('Restored');
      } catch (e) { toast(e.message, 'err'); }
    }));
  } catch (e) { box.innerHTML = `<p class="muted small" style="padding:0 16px 12px">${esc(e.message)}</p>`; }
}

/** Shrink a logo to at most 600 × 240 px and keep it as a PNG data URL (transparency kept). */
function logoFrom(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w0 = img.naturalWidth || 600, h0 = img.naturalHeight || 240;
      const k = Math.min(1, 600 / w0, 240 / h0);
      const c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w0 * k)), height: Math.max(1, Math.round(h0 * k)) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve({ url: c.toDataURL('image/png'), w: c.width, h: c.height });
    };
    img.onerror = () => reject(new Error('That file could not be read as an image'));
    img.src = url;
  });
}

export { parseCsv };

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
  const { docxBlob } = await import('./documents.js');
  const files = {};
  const zip = { file: (name, content) => (files[name] = content) };
  const code = fileSafe(p.meta.code || p.meta.name);
  for (const [i, d] of DOC_LIST.entries()) {
    onStep(`Document ${i + 1}/${DOC_LIST.length}`);
    const n = `${String(i + 1).padStart(2, '0')}_${fileSafe(d.title)}`;
    zip.file(`documents/${n}.md`, buildDoc(p, d.id).markdown);
    zip.file(`documents/${n}.docx`, new Uint8Array(await (await docxBlob(p, d.id)).arrayBuffer()));
  }
  for (const dg of allDiagrams(p)) zip.file(`diagrams/${fileSafe(dg.title)}.mmd`, dg.code);
  for (const c of p.canvases) zip.file(`diagrams/whiteboard_${fileSafe(c.name)}.svg`, exportSvg(c));
  zip.file('technical/openapi.yaml', openApi(p));
  zip.file('technical/postman_collection.json', JSON.stringify(postmanCollection(p), null, 2));
  zip.file('technical/schema.sql', sqlDdl(p));
  zip.file('technical/json-schemas.json', jsonSchemas(p));
  zip.file('technical/traceability_matrix.csv', rtmCsv(p));
  for (const k of Object.keys(COLLECTIONS)) if (p[k].length) zip.file(`registers/${fileSafe(COLLECTIONS[k].title)}.csv`, toCsv(k, p));
  zip.file(`${code}.babuilder.json`, JSON.stringify(p, null, 2));
  onStep('Compressing');
  return new Blob([await zipFiles(files)], { type: 'application/zip' });
}

export function renderSettings(root) {
  const p = project();
  const s = getSettings();
  const code = fileSafe(p.meta.code || p.meta.name);
  const brand = { ...DEFAULT_BRAND, ...(s.brand || {}) };
  root.innerHTML = `
    <div class="page-head"><div><h1>Projects & export</h1><p>Everything is stored in this browser. Export a project file to back it up or share it with another analyst.</p></div></div>
    <section class="card flush"><div class="card-head"><h2>Projects</h2><span class="grow"></span><input type="text" placeholder="New project name" data-pname style="max-width:240px">${templates().length ? `<select data-ptpl style="max-width:200px" aria-label="Template"><option value="">Blank</option>${templates().map((t) => `<option>${esc(t.name)}</option>`).join('')}</select>` : ''}<button class="btn sm primary" data-new>+ New project</button><button class="btn sm" data-sample>Add example project</button><button class="btn sm" data-import>Import project file</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Project</th><th>Code</th><th>Updated</th><th>Requirements</th><th></th></tr></thead><tbody>
      ${projects().map((x) => `<tr><td><b>${esc(x.meta.name || 'Untitled')}</b>${x.id === p.id ? ' <span class="pill ok">Open</span>' : ''}</td><td>${esc(x.meta.code)}</td><td class="small">${esc(String(x.updatedAt).slice(0, 16).replace('T', ' '))}</td><td>${x.requirements.length}</td>
        <td style="white-space:nowrap">${x.id !== p.id ? `<button class="btn sm" data-open="${x.id}">Open</button>` : ''}<button class="btn sm" data-dupp="${x.id}">Duplicate</button><button class="btn sm danger" data-delp="${x.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div></section>

    <section class="card flush" data-safety><div class="card-head"><h2>Backups & offline</h2><span class="grow"></span><button class="btn sm primary" data-backup>Back up everything (.json)</button><button class="btn sm" data-restore>Restore from a backup…</button></div>
      <div style="padding:0 16px 4px">
        <p class="small" style="margin:0 0 6px"><b>Last backup:</b> ${s.lastBackup ? esc(fmtWhen(s.lastBackup)) : 'never'} · one file with all ${projects().length} project${projects().length === 1 ? '' : 's'}, your templates and branding.</p>
        <label class="small">Remind me to back up <select data-bevery style="width:auto;display:inline-block;margin-left:6px">${Object.keys(INTERVALS).map((k) => `<option value="${k}" ${(s.backupEvery || 'weekly') === k ? 'selected' : ''}>${{ daily: 'every day', weekly: 'every week', monthly: 'every month', off: 'never' }[k]}</option>`).join('')}</select> when something has changed.</label>
        <p class="small muted" style="margin:8px 0 4px"><b>Offline:</b> <span data-offline>Checking…</span></p>
        <p class="small muted" style="margin:0 0 8px"><b>Storage:</b> <span data-storage></span></p>
        <h3 style="margin:12px 0 4px;font-size:14px">Restore points in this browser</h3>
        <p class="small muted" style="margin:0 0 8px">Saved automatically once a day while you work, and before you delete a project or restore a backup. They live in this browser only — a backup file is still the safe copy.</p>
      </div>
      <div data-points></div>
    </section>

    <section class="card"><h2>Export "${esc(p.meta.name || 'this project')}"</h2>
      <div class="grid g3" style="margin-top:12px">
        <button class="btn primary" data-zip>Complete pack (.zip)</button>
        <button class="btn" data-json>Project file (.json)</button>
        <button class="btn" data-oas>OpenAPI 3.0 (.yaml)</button>
        <button class="btn" data-postman>Postman collection (.json)</button>
        <button class="btn" data-sql>Database DDL (.sql)</button>
        <button class="btn" data-jss>JSON Schemas (.json)</button>
        <button class="btn" data-rtm>Traceability matrix (.csv)</button>
        <button class="btn" data-jiraout>Jira import file (.csv)</button>
      </div>
      <p class="muted small" style="margin-top:10px">The complete pack contains every document (Word .docx + Markdown), every diagram source, whiteboards, technical specs, CSV registers and the project file.</p>
    </section>

    <section class="card"><h2>Import from CSV / Excel</h2>
      <p class="muted small">Save a sheet as CSV with a heading row. Columns are matched to field names (e.g. Title, Requirement statement, Type, Priority).</p>
      <div class="row"><select data-ckey style="max-width:240px">${IMPORTABLE.map((k) => `<option value="${k}">${esc(COLLECTIONS[k].title)}</option>`).join('')}</select><button class="btn" data-csvin>Choose CSV file…</button><button class="btn ghost" data-tpl>Download template</button></div>
      <p class="muted small" style="margin-top:12px">From Jira: export your issues as CSV (all fields) and bring back status, priority, story points and issue keys. New Jira stories and bugs are added.</p>
      <div class="row"><button class="btn" data-jirain>Update from a Jira export…</button></div>
    </section>

    <section class="card flush"><div class="card-head"><h2>Project templates</h2><span class="grow"></span><button class="btn sm primary" data-savetpl>Save "${esc(p.meta.name || 'this project')}" as a template</button></div>
      <p class="muted small" style="padding:0 16px">A template keeps the reusable parts of a project — user roles, stakeholders, glossary, quality requirements (NFRs), general business rules, assumptions and dependencies, day rates and the BA plan — so a new project starts well ahead.</p>
      ${templates().length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Template</th><th>Contains</th><th>Saved</th><th></th></tr></thead><tbody>${templates().map((t) => `<tr><td><b>${esc(t.name)}</b></td><td class="small">${['personas', 'stakeholders', 'glossary', 'requirements', 'rules', 'raid'].map((k) => `${(t.data?.[k] || []).length} ${k === 'requirements' ? 'NFRs' : k}`).join(' · ')}</td><td class="small">${esc(String(t.createdAt || '').slice(0, 10))}</td><td><button class="btn sm danger" data-deltpl="${esc(t.name)}">Delete</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="padding:0 16px 12px">No templates yet.</p>'}
    </section>

    <section class="card"><h2>Document branding</h2>
      <p class="muted small">Used in Word (.docx) files: cover page, header, footer, heading colour and table headers. HTML, PDF and rich-text copies use the colour too.</p>
      <div class="form" style="margin-top:10px">
        <label class="field"><span>Organisation</span><input type="text" data-org value="${esc(s.org)}" placeholder="Your company or client"></label>
        <label class="field"><span>Footer note</span><input type="text" data-bfoot value="${esc(brand.footer || '')}" placeholder="e.g. Confidential"></label>
        <label class="field"><span>Brand colour</span><span class="row" style="gap:8px"><input type="color" data-bcol value="${esc(brand.colour)}" style="width:56px;height:34px;padding:2px"><button class="btn sm ghost" data-bcolreset type="button">Default</button></span></label>
        <div class="field"><span>Logo (PNG, JPG or SVG)</span><span class="row" style="gap:8px;align-items:center">${brand.logo?.url ? `<img src="${esc(brand.logo.url)}" alt="Logo" data-blogoimg style="max-height:40px;max-width:160px;background:#fff;padding:3px;border-radius:4px">` : ''}<button class="btn sm" data-blogo type="button">${brand.logo?.url ? 'Change' : 'Upload logo'}</button>${brand.logo?.url ? '<button class="btn sm danger" data-blogox type="button">Remove</button>' : ''}</span></div>
        <label class="small"><input type="checkbox" data-bcover ${brand.cover ? 'checked' : ''}> Cover page</label>
        <label class="small"><input type="checkbox" data-btoc ${brand.toc ? 'checked' : ''}> Contents list</label>
      </div>
    </section>`;

  $('[data-new]', root).onclick = () => { newProject($('[data-pname]', root).value.trim() || 'New project', templates().find((t) => t.name === $('[data-ptpl]', root)?.value) || null); location.hash = '#/charter'; };
  $('[data-savetpl]', root).onclick = () => {
    const name = (prompt('Template name', `${p.meta.domain || p.meta.client || 'My'} starter`) || '').trim();
    if (!name) return;
    if (templates().some((t) => t.name === name) && !confirm(`Replace the template "${name}"?`)) return;
    saveTemplate(templateFrom(p, name));
    toast(`Template "${name}" saved — choose it when you start a new SRS or project`);
  };
  $$('[data-deltpl]', root).forEach((b) => (b.onclick = async () => { if (await confirmBox(`Delete the template "${b.dataset.deltpl}"? Projects made from it are not affected.`)) deleteTemplate(b.dataset.deltpl); }));
  $('[data-sample]', root).onclick = () => (loadSample(), toast('Example project added'));
  $('[data-import]', root).onclick = async () => {
    const f = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const data = JSON.parse(f.text);
      if (data.kind === 'ba-builder-backup') throw new Error('this is a full backup — use "Restore from a backup" under Backups & offline');
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
    if (!(await confirmBox(`Delete "${x.meta.name}"? A restore point is saved first, so you can still get it back from "Backups & offline" in this browser.`))) return;
    await savePoint(workspace(), `Before deleting "${x.meta.name}"`, 'before').catch(() => {});
    deleteProject(x.id);
  }));
  $('[data-json]', root).onclick = () => download(JSON.stringify(p, null, 2), `${code}.babuilder.json`, 'application/json');
  $('[data-oas]', root).onclick = () => download(openApi(p), `${code}_openapi.yaml`, 'application/yaml');
  $('[data-postman]', root).onclick = () => download(JSON.stringify(postmanCollection(p), null, 2), `${code}.postman_collection.json`, 'application/json');
  $('[data-sql]', root).onclick = () => download(sqlDdl(p), `${code}_schema.sql`, 'application/sql');
  $('[data-jss]', root).onclick = () => download(jsonSchemas(p), `${code}_schemas.json`, 'application/json');
  $('[data-rtm]', root).onclick = () => download(rtmCsv(p), `${code}_RTM.csv`, 'text/csv');
  $('[data-jiraout]', root).onclick = () => jiraExportModal('stories');
  $('[data-jirain]', root).onclick = () => jiraImport();
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
  $('[data-backup]', root).onclick = () => { backupNow(); setTimeout(() => renderSettings(root), 50); };
  $('[data-restore]', root).onclick = () => restoreFromFile();
  $('[data-bevery]', root).onchange = (e) => saveSettings({ backupEvery: e.target.value });
  fillSafety(root);
  $('[data-org]', root).onchange = (e) => saveSettings({ org: e.target.value.trim() }, { quiet: true });
  const setBrand = (patch, quiet = true) => saveSettings({ brand: { ...DEFAULT_BRAND, ...(getSettings().brand || {}), ...patch } }, { quiet });
  $('[data-bfoot]', root).onchange = (e) => setBrand({ footer: e.target.value.trim() });
  $('[data-bcol]', root).onchange = (e) => setBrand({ colour: e.target.value });
  $('[data-bcolreset]', root).onclick = () => setBrand({ colour: DEFAULT_BRAND.colour }, false);
  $('[data-bcover]', root).onchange = (e) => setBrand({ cover: e.target.checked });
  $('[data-btoc]', root).onchange = (e) => setBrand({ toc: e.target.checked });
  $('[data-blogo]', root).onclick = async () => {
    const f = await pickFile('image/png,image/jpeg,image/svg+xml', 'dataurl');
    if (!f) return;
    try { setBrand({ logo: await logoFrom(f.text) }, false); toast('Logo saved — it appears on Word documents'); } catch (e) { toast(e.message, 'err'); }
  };
  const lx = $('[data-blogox]', root);
  if (lx) lx.onclick = () => setBrand({ logo: null }, false);
}
