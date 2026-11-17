// Stress test: a huge, messy project must still build every document, diagram and export,
// quickly and without broken output. Run: node tests/stress.mjs
import { bigProject } from './big-project.js';
import { businessCase, lintRequirement, COLLECTIONS, normalize } from '../js/model.js';
import { estimate } from '../js/estimate.js';
import { DOC_LIST, buildDoc } from '../js/gen/docs.js';
import { allDiagrams } from '../js/gen/diagrams.js';
import { openApi, sqlDdl, rtmCsv, toCsv, jsonSchemas } from '../js/gen/exports.js';
import { mdToHtml } from '../js/markdown.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('FAIL', msg); } };
const BAD = /undefined|\[object Object\]|NaN|Infinity/;

for (const scale of [1, 3]) {
  const t0 = performance.now();
  const p = bigProject(scale);
  const counts = Object.keys(COLLECTIONS).reduce((a, k) => a + p[k].length, 0);
  // round-trips through JSON like a saved / imported project file
  const q = normalize(JSON.parse(JSON.stringify(p)));
  ok(q.requirements.length === p.requirements.length, 'JSON round trip');

  let docChars = 0;
  for (const d of DOC_LIST) {
    const doc = buildDoc(q, d.id);
    ok(doc && doc.markdown.length > 100, `doc ${d.id} built`);
    ok(!BAD.test(doc.markdown), `doc ${d.id} has no undefined/NaN (${(doc.markdown.match(BAD) || [])[0]})`);
    const html = mdToHtml(doc.markdown);
    ok(!/<script/i.test(html), `doc ${d.id} html is escaped`);
    docChars += doc.markdown.length;
  }
  const diags = allDiagrams(q);
  let maxDiag = 0;
  for (const dg of diags) {
    ok(dg.code && !BAD.test(dg.code), `diagram ${dg.key} clean`);
    maxDiag = Math.max(maxDiag, dg.code.length);
  }
  const api = openApi(q);
  ok(api.split('\n').filter((l) => /^ {2}\/v1/.test(l)).length > 0, 'openapi paths');
  ok(!BAD.test(api), 'openapi clean');
  ok(/CREATE TABLE/i.test(sqlDdl(q)) && !BAD.test(sqlDdl(q)), 'sql clean');
  ok(!BAD.test(rtmCsv(q)), 'rtm clean');
  JSON.parse(JSON.stringify(jsonSchemas(q)));
  for (const k of Object.keys(COLLECTIONS)) ok(!/undefined|\[object Object\]/.test(toCsv(k, q)), `csv ${k} clean`);
  const bc = businessCase(q);
  ok(Number.isFinite(bc.npv) && Number.isFinite(bc.roi), 'business case finite');
  const e = estimate(q);
  ok(Number.isFinite(e.total) && e.endDate > e.startDate, `estimate ok (${e.endDate})`);
  for (const r of q.requirements) lintRequirement(r, q);
  const ms = Math.round(performance.now() - t0);
  ok(ms < 15000, `scale ${scale} finished in time (${ms} ms)`);
  console.log(`scale x${scale}: ${counts} items, ${DOC_LIST.length} docs (${Math.round(docChars / 1024)} KB), ${diags.length} diagrams (largest ${Math.round(maxDiag / 1024)} KB), estimate ${Math.round(e.effort)} days → ${e.endDate}, ${ms} ms`);
}
console.log(fail ? `${fail} failure(s)` : 'Stress test passed');
process.exit(fail ? 1 : 0);
