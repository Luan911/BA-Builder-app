// SQL workbench: practise and validate with real SQL against the data model, filled with
// realistic sample data. Runs SQLite in the browser (sql.js, MIT licence, loaded on first use).
import { project, update } from '../store.js';
import { esc, $, $$, toast, download, fileSafe, pickFile } from '../ui.js';
import { uid } from '../model.js';
import { sqliteSchema, sampleRows, insertStatements, exampleQueries } from '../gen/sqldata.js';
import { csv } from '../gen/exports.js';
import { parseCsv } from './settings.js';
import { renderCollection, openItem } from './collection.js';

const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
let SQL = null; // the sql.js module
let db = null;
let dbFor = ''; // project id + model fingerprint the database was built for
let lastSql = '';

function loadEngine() {
  if (SQL) return Promise.resolve(SQL);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${BASE}sql-wasm.js`;
    s.onload = () => window.initSqlJs({ locateFile: (f) => `${BASE}${f}` }).then((m) => resolve((SQL = m))).catch(reject);
    s.onerror = () => reject(new Error('Could not load the SQL engine — check your internet connection.'));
    document.head.appendChild(s);
  });
}

const fingerprint = (p) => `${p.id}:${JSON.stringify(p.entities.map((e) => [e.name, (e.fields || []).map((f) => [f.name, f.type, f.pk, f.fk])]))}`;

/** (Re)build the in-memory database from the data model and sample data. */
function build(p) {
  if (db) db.close();
  db = new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  const schema = sqliteSchema(p);
  for (const stmt of schema) db.exec(stmt);
  const inserts = insertStatements(p, sampleRows(p, 8));
  db.exec('BEGIN;');
  for (const stmt of inserts) { try { db.exec(stmt); } catch { /* a generated row that breaks a rule is skipped */ } }
  db.exec('COMMIT;');
  dbFor = fingerprint(p);
}

function run(sqlText) {
  const t0 = performance.now();
  const res = db.exec(sqlText);
  const changed = db.getRowsModified();
  return { res, ms: Math.round(performance.now() - t0), changed };
}

function tableHtml(r) {
  const rows = r.values.slice(0, 500);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td${typeof v === 'number' ? ' class="num"' : ''}>${v === null ? '<span class="muted">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${r.values.length > 500 ? `<p class="small muted" style="padding:0 16px">Showing 500 of ${r.values.length} rows.</p>` : ''}`;
}

export function renderSql(root) {
  const p = project();
  const examples = exampleQueries(p);
  root.innerHTML = `
    <div class="page-head"><div><h1>SQL workbench</h1><p>Ask your data model questions in SQL. Tables are built from your entities and filled with realistic sample data, so you can practise SELECT, WHERE, JOIN and GROUP BY, check data rules, and prove a requirement before a developer writes code.</p></div></div>
    ${p.entities.length ? `
    <div class="sqlgrid">
      <section class="card flush"><div class="card-head"><h2>Tables</h2></div><div data-schema class="small" style="padding:8px 14px;max-height:520px;overflow:auto">Loading the SQL engine…</div></section>
      <div>
        <section class="card">
          <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <select data-ex style="max-width:340px" aria-label="Example queries"><option value="">Examples for this model…</option>${examples.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select>
            <span class="grow"></span>
            <button class="btn sm" data-reset title="Rebuild the tables and sample data">Reset data</button>
            <button class="btn sm" data-import title="Load a CSV file into a table">Import CSV</button>
            <button class="btn sm" data-save>Save query</button>
            <button class="btn primary" data-run>Run ▶</button>
          </div>
          <textarea data-sql rows="9" spellcheck="false" style="font-family:var(--mono);font-size:13px;width:100%" aria-label="SQL">${esc(lastSql || examples[0]?.sql || '')}</textarea>
          <p class="small muted" style="margin:6px 0 0" data-hint>Ctrl + Enter runs the query. Changes (INSERT, UPDATE, DELETE) stay until you reset the data or reload the page.</p>
        </section>
        <section class="card flush" style="margin-top:12px"><div class="card-head"><h2>Result</h2><span class="grow"></span><span class="small muted" data-meta></span><button class="btn sm" data-csv disabled>Export CSV</button></div><div data-out><p class="muted" style="padding:0 16px 12px">Run a query to see the result.</p></div></section>
      </div>
    </div>
    <div data-saved style="margin-top:16px"></div>` : '<div class="empty">Add entities under <a href="#/data">Data model</a> first — the workbench builds its tables from them.</div>'}`;
  if (!p.entities.length) return;

  const ta = $('[data-sql]', root);
  const out = $('[data-out]', root);
  const meta = $('[data-meta]', root);
  let lastResult = null;
  const showSchema = () => {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]?.values.map((v) => v[0]) || [];
    $('[data-schema]', root).innerHTML = tables.map((t) => {
      const cols = db.exec(`PRAGMA table_info("${t.replace(/"/g, '""')}")`)[0]?.values || [];
      const n = db.exec(`SELECT COUNT(*) FROM "${t.replace(/"/g, '""')}"`)[0].values[0][0];
      return `<details open><summary><a href="#" data-ins="${esc(t)}"><b>${esc(t)}</b></a> <span class="muted">${n} rows</span></summary><ul style="margin:4px 0 10px;padding-left:18px">${cols.map((c) => `<li><a href="#" data-ins="${esc(c[1])}">${esc(c[1])}</a> <span class="muted">${esc(c[2])}${c[5] ? ' · PK' : ''}${c[3] ? ' · not null' : ''}</span></li>`).join('')}</ul></details>`;
    }).join('');
    $$('[data-ins]', root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText(`"${a.dataset.ins}"`, s, ta.selectionEnd, 'end'); ta.focus(); }));
  };
  const exec = () => {
    lastSql = ta.value;
    if (!ta.value.trim()) return;
    try {
      const { res, ms, changed } = run(ta.value);
      lastResult = res[res.length - 1] || null;
      const isQuery = /^\s*(--[^\n]*\n\s*)*(select|with|pragma)\b/i.test(ta.value);
      meta.textContent = lastResult ? `${lastResult.values.length} row${lastResult.values.length === 1 ? '' : 's'} · ${ms} ms` : isQuery ? `0 rows · ${ms} ms` : `${changed} row${changed === 1 ? '' : 's'} changed · ${ms} ms`;
      out.innerHTML = lastResult ? tableHtml(lastResult) : isQuery ? '<p style="padding:0 16px 12px">No rows match. For a data check, that means nothing breaks the rule.</p>' : `<p style="padding:0 16px 12px">✓ Done — ${changed} row${changed === 1 ? '' : 's'} changed.</p>`;
      $('[data-csv]', root).disabled = !lastResult;
      if (!lastResult || /\b(create|drop|alter|insert|delete|update)\b/i.test(ta.value)) showSchema();
    } catch (err) {
      lastResult = null;
      meta.textContent = '';
      out.innerHTML = `<div class="callout warn" style="margin:0 16px 12px"><b>SQL error:</b> ${esc(err.message)}<div class="small muted" style="margin-top:4px">Check table and column names on the left (names with capitals need "double quotes"), commas between columns, and that text values use 'single quotes'.</div></div>`;
    }
  };

  loadEngine().then(() => {
    if (!db || dbFor !== fingerprint(p)) build(p);
    showSchema();
    exec();
  }).catch((e) => ($('[data-schema]', root).innerHTML = `<div class="err">${esc(e.message)}</div>`));

  $('[data-run]', root).onclick = exec;
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(); } });
  $('[data-ex]', root).onchange = (e) => {
    const x = examples[+e.target.value];
    if (!x) return;
    ta.value = x.sql;
    $('[data-hint]', root).innerHTML = `<b>${esc(x.name)}:</b> ${esc(x.purpose)}`;
    e.target.value = '';
    exec();
  };
  $('[data-reset]', root).onclick = () => { if (!SQL) return; build(p); showSchema(); toast('Tables and sample data rebuilt'); exec(); };
  $('[data-csv]', root).onclick = () => lastResult && download(csv(lastResult.columns, lastResult.values), 'query-result.csv', 'text/csv');
  $('[data-save]', root).onclick = () => {
    if (!ta.value.trim()) return toast('Write a query first', 'err');
    const id = uid('qry');
    update((pr) => pr.queries.push({ id, name: (ta.value.match(/^--\s*(.+)$/m) || [])[1] || 'New query', sql: ta.value, purpose: '', requirementIds: [] }));
    openItem('queries', id);
  };
  $('[data-import]', root).onclick = async () => {
    if (!db) return;
    const file = await pickFile('.csv,text/csv');
    if (!file) return;
    const [head, ...rows] = parseCsv(file.text.replace(/^﻿/, ''));
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map((v) => v[0]) || [];
    const guess = tables.find((t) => file.name.toLowerCase().startsWith(t.toLowerCase())) || tables[0];
    const table = prompt(`Load ${rows.length} rows into which table?\n${tables.join(', ')}`, guess);
    if (!table || !tables.includes(table)) return toast('No table chosen', 'err');
    let ok = 0, bad = 0;
    const stmt = db.prepare(`INSERT INTO "${table.replace(/"/g, '""')}" (${head.map((h) => `"${h.replace(/"/g, '""')}"`).join(', ')}) VALUES (${head.map(() => '?').join(', ')})`);
    for (const r of rows) { try { stmt.run(r.map((v) => (v === '' ? null : v))); ok++; } catch { bad++; } }
    stmt.free();
    showSchema();
    toast(`${ok} rows loaded into ${table}${bad ? `, ${bad} rejected (keys or required fields)` : ''}`, bad ? 'err' : 'ok');
  };
  renderCollection($('[data-saved]', root), 'queries', { heading: false, title: 'Saved queries', addLabel: 'Add query' });
  // the Run button in a saved query's row loads it into the editor (instead of opening the row)
  $('[data-saved]', root).addEventListener('click', (e) => {
    const b = e.target.closest('[data-runq]');
    if (!b) return;
    e.stopPropagation();
    const q = project().queries.find((x) => x.id === b.dataset.runq);
    if (q) { ta.value = q.sql; ta.scrollIntoView({ block: 'center' }); exec(); }
  }, true);
}
