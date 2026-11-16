import { sampleProject } from '../js/sample.js';
import { blankProject } from '../js/model.js';
import { evaluate, nextActions } from '../js/rules.js';
import { generateDocs } from '../js/generators/docs.js';
import { allDiagrams } from '../js/generators/diagrams.js';
for (const [name, p] of [['sample', sampleProject()], ['blank', blankProject()]]) {
  const ev = evaluate(p, { today: '2026-11-16' });
  console.log(`\n== ${name}: score ${ev.score}%, current ${ev.current.phase.id}, issues ${ev.issues.length}`);
  for (const ph of ev.phases) console.log(`  ${ph.phase.id}: ready ${ph.readiness}% errors ${ph.errors.length} canApprove ${ph.canApprove} approved ${ph.approved}`);
  const docs = generateDocs(p, ev);
  console.log('  docs:', docs.map(d => `${d.id}(${d.markdown.length})`).join(' '));
  const diags = allDiagrams(p, ev);
  console.log('  diagrams:', diags.map(d => d.id).join(' '));
  if (name === 'sample') {
    const na = nextActions(ev);
    console.log('  client:', na.client.map(i=>i.message));
    console.log('  dev:', na.dev.map(i=>i.message));
    console.log('  ba:', na.ba.map(i=>i.message));
    console.log(diags.find(d=>d.kind==='process').code);
    console.log(diags.find(d=>d.kind==='sequence').code);
    console.log(diags.find(d=>d.kind==='process').description);
  }
}
