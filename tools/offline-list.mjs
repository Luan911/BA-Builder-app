// Lists every file the app needs offline (offline-files.json) and stamps sw.js with a version made
// from their contents, so browsers fetch the new files after any change.
// Run after changing the app: node tools/offline-list.mjs   (node tools/offline-list.mjs --check only checks)
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOTS = ['index.html', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'vendor'];
const SKIP = /(^|\/)(README\.md|LICENSE)$|\.map$/;
const TEXT = /\.(html|css|js|mjs|json|svg|webmanifest)$/;
// text is compared with LF line endings, so a Windows checkout (CRLF) gives the same version
const lf = (s) => s.split('\r\n').join('\n');

export function offlineFiles() {
  const out = [];
  const walk = (p) => {
    if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) walk(join(p, f));
    else out.push(p.split('\\').join('/'));
  };
  ROOTS.forEach(walk);
  return out.filter((f) => !SKIP.test(f));
}

export function offlineVersion(files) {
  const h = createHash('sha256');
  for (const f of files) h.update(f).update(TEXT.test(f) ? lf(readFileSync(f, 'utf8')) : readFileSync(f));
  return h.digest('hex').slice(0, 12);
}

/** { ok, version, files } — is offline-files.json and the version in sw.js up to date? */
export function offlineStatus() {
  const files = offlineFiles();
  const version = offlineVersion(files);
  const json = `${JSON.stringify({ version, files }, null, 1)}\n`;
  const sw = lf(readFileSync('sw.js', 'utf8'));
  const sw2 = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
  let current = '';
  try { current = lf(readFileSync('offline-files.json', 'utf8')); } catch { /* not written yet */ }
  return { ok: current === json && sw === sw2, version, files, json, sw2 };
}

const isMain = (process.argv[1] || '').split('\\').join('/').endsWith('tools/offline-list.mjs');
if (isMain) {
  const st = offlineStatus();
  if (process.argv.includes('--check')) {
    console.log(st.ok ? `Offline list is up to date (${st.files.length} files, version ${st.version})` : 'Offline list is out of date — run: node tools/offline-list.mjs');
    process.exit(st.ok ? 0 : 1);
  }
  writeFileSync('offline-files.json', st.json);
  writeFileSync('sw.js', st.sw2);
  console.log(`${st.files.length} files, version ${st.version}`);
}
