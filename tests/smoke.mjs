// Node smoke test: every document, diagram and export builds for the sample and a blank project.
import { sampleProject } from '../js/sample.js';
import { blankProject, businessCase, lintRequirement, COLLECTIONS } from '../js/model.js';
import { DOC_LIST, buildDoc } from '../js/gen/docs.js';
import { allDiagrams } from '../js/gen/diagrams.js';
import { openApi, sqlDdl, rtmCsv, toCsv, jsonSchemas } from '../js/gen/exports.js';

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('FAIL', msg); } };
for (const [name, p] of [['sample', sampleProject()], ['blank', blankProject('x')]]) {
  for (const d of DOC_LIST) {
    const doc = buildDoc(p, d.id);
    ok(doc && doc.markdown.length > 100 && !/undefined|\[object Object\]|NaN/.test(doc.markdown), `${name} doc ${d.id}`);
  }
  const diags = allDiagrams(p);
  for (const dg of diags) ok(dg.code && !/undefined|NaN/.test(dg.code), `${name} diagram ${dg.key}`);
  ok(/^openapi: "?3.0.3/.test(openApi(p)), `${name} openapi`);
  ok(sqlDdl(p).includes('--'), `${name} sql`);
  rtmCsv(p); jsonSchemas(p);
  for (const k of Object.keys(COLLECTIONS)) toCsv(k, p);
  const bc = businessCase(p);
  ok(Number.isFinite(bc.npv), `${name} npv`);
  console.log(`${name}: ${DOC_LIST.length} docs, ${diags.length} diagrams, NPV ${Math.round(bc.npv)}, ROI ${bc.roi.toFixed(1)}%, payback ${bc.payback}`);
}
const s = sampleProject();
ok(lintRequirement(s.requirements.find((r) => r.code === 'NFR-002'), s).length >= 2, 'lint flags vague NFR');
ok(lintRequirement(s.requirements.find((r) => r.code === 'FR-001'), s).length === 0, 'lint passes good FR');
if (process.argv.includes('--print')) { console.log(openApi(s)); console.log(allDiagrams(s).map((d) => d.code).join('\n\n')); }
console.log(fail ? `${fail} failure(s)` : 'All checks passed');
process.exit(fail ? 1 : 0);
