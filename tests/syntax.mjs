// Strict syntax check of every script as an ES module. (Plain `node --check file.js` can miss errors
// in .js files because Node first guesses the module type.) Run: node tests/syntax.mjs
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js)$/.test(f)) files.push(p); } };
walk('js'); walk('tests');
let bad = 0;
// inline module scripts in the test pages too
const pages = readdirSync('tests').filter((f) => f.endsWith('.html')).map((f) => join('tests', f));
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].forEach((m, i) => {
    const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: m[1] });
    if (r.status !== 0) { bad++; console.error(`SYNTAX ERROR in ${page} (script ${i + 1})\n${String(r.stderr).split('\n').slice(0, 4).join('\n')}`); }
  });
}
for (const f of files) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(f) });
  if (r.status !== 0) { bad++; console.error(`SYNTAX ERROR in ${f}\n${String(r.stderr).split('\n').slice(0, 4).join('\n')}`); }
}
console.log(bad ? `${bad} file(s) with syntax errors` : `${files.length} files and ${pages.length} test pages: syntax OK`);
process.exit(bad ? 1 : 0);
