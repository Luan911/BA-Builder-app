// Static code inventory: reads source files as text (never runs or changes them)
// and extracts structure with per-language patterns: languages, entry points,
// API endpoints, data tables, classes, functions, dependencies and config names.

export const LANGUAGES = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript (React)',
  ts: 'TypeScript', tsx: 'TypeScript (React)', py: 'Python', java: 'Java', kt: 'Kotlin', kts: 'Kotlin',
  cs: 'C#', vb: 'VB.NET', go: 'Go', rb: 'Ruby', php: 'PHP', rs: 'Rust', swift: 'Swift', dart: 'Dart',
  scala: 'Scala', c: 'C', h: 'C/C++ header', cpp: 'C++', cc: 'C++', hpp: 'C++ header', m: 'Objective-C',
  sql: 'SQL', prisma: 'Prisma', graphql: 'GraphQL', gql: 'GraphQL', proto: 'Protocol Buffers',
  sh: 'Shell', ps1: 'PowerShell', bat: 'Batch', r: 'R', lua: 'Lua', ex: 'Elixir', exs: 'Elixir',
  vue: 'Vue', svelte: 'Svelte', html: 'HTML', css: 'CSS', scss: 'SCSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', xml: 'XML', toml: 'TOML', md: 'Markdown', txt: 'Text',
  csproj: 'MSBuild', gradle: 'Gradle',
};

const SKIP_DIRS = /(^|\/)(node_modules|\.git|\.svn|dist|build|out|bin|obj|target|vendor|\.next|\.nuxt|coverage|__pycache__|\.venv|venv|\.idea|\.vscode|\.gradle|Pods)\//i;
const SKIP_FILES = /(^|\/)(\.env(\..*)?|.*\.lock|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|.*\.min\.(js|css)|.*\.map)$/i;
const SECRET_FILES = /(^|\/)(\.env(?!\.example)(\..*)?|.*\.(pem|key|pfx|p12)|id_rsa.*|secrets?\.(json|ya?ml))$/i;
export const MAX_FILE_BYTES = 400_000;

export function extOf(path) {
  const base = path.split('/').pop() || '';
  if (/^dockerfile$/i.test(base)) return 'dockerfile';
  const m = base.match(/\.([A-Za-z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

/** Decide whether a file should be read. Returns a reason string when skipped. */
export function skipReason(path, size = 0) {
  const p = path.replace(/\\/g, '/');
  if (SECRET_FILES.test(p)) return 'possible secrets (not read)';
  if (SKIP_DIRS.test(`${p}`)) return 'dependency / build folder';
  if (SKIP_FILES.test(p)) return 'lock / generated file';
  const ext = extOf(p);
  const known = LANGUAGES[ext] || ext === 'dockerfile' || /(^|\/)(requirements\.txt|gemfile|go\.mod|cargo\.toml|pom\.xml|composer\.json|package\.json)$/i.test(p);
  if (!known) return 'not a text / code file';
  if (size > MAX_FILE_BYTES) return 'too large';
  return '';
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function collect(re, text, fn) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(text))) {
    const v = fn(m);
    if (v) out.push(v);
    if (m.index === r.lastIndex) r.lastIndex++;
  }
  return out;
}

// ---------- endpoints ----------
function routes(path, ext, text) {
  const add = (method, route, framework) => (m) => ({
    method: (typeof method === 'function' ? method(m) : method).toUpperCase(),
    path: typeof route === 'function' ? route(m) : m[route],
    framework,
    file: path,
    line: lineOf(text, m.index),
  });
  const out = [];
  if (['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx'].includes(ext)) {
    out.push(...collect(/\b(?:app|router|server|api|routes?|fastify)\s*\.\s*(get|post|put|patch|delete|options|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi, text, add((m) => m[1], 2, 'Express / Fastify')));
    const base = (text.match(/@Controller\(\s*['"`]([^'"`]*)['"`]\s*\)/) || [])[1] || '';
    out.push(...collect(/@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g, text, add((m) => m[1], (m) => joinPath(base, m[2] || ''), 'NestJS')));
    if (/\/(pages|app)\/api\//.test(path) || /\/app\/.*\/route\.(t|j)s$/.test(path)) {
      const apiPath = '/' + path.replace(/^.*?\/(pages|app)\//, '').replace(/\/route\.(t|j)sx?$/, '').replace(/\.(t|j)sx?$/, '').replace(/\/index$/, '');
      const methods = collect(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g, text, (m) => m[1]);
      for (const mth of methods.length ? methods : ['ANY']) out.push({ method: mth, path: apiPath, framework: 'Next.js', file: path, line: 1 });
    }
  }
  if (ext === 'py') {
    out.push(
      ...collect(/@\w+\.(get|post|put|patch|delete|route)\(\s*['"]([^'"]+)['"](?:[^)]*methods\s*=\s*\[([^\]]+)\])?/gi, text, (m) => ({
        method: m[1].toLowerCase() === 'route' ? (m[3] ? m[3].replace(/['"\s]/g, '') : 'GET') : m[1].toUpperCase(),
        path: m[2], framework: 'Flask / FastAPI', file: path, line: lineOf(text, m.index),
      }))
    );
    out.push(...collect(/\b(?:re_)?path\(\s*r?['"]([^'"]*)['"]\s*,/g, text, add('ANY', (m) => '/' + m[1].replace(/^\^|\$$/g, ''), 'Django')));
  }
  if (ext === 'java' || ext === 'kt') {
    const base = ((text.match(/@RequestMapping\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"/) || [])[1]) || '';
    out.push(
      ...collect(/@(Get|Post|Put|Patch|Delete)Mapping(?:\(\s*(?:value\s*=\s*|path\s*=\s*)?\{?\s*"([^"]*)")?/g, text, add((m) => m[1], (m) => joinPath(base, m[2] || ''), 'Spring'))
    );
  }
  if (ext === 'cs') {
    const base = ((text.match(/\[Route\("([^"]*)"\)\]/) || [])[1] || '').replace('[controller]', controllerName(text));
    out.push(...collect(/\[Http(Get|Post|Put|Patch|Delete)(?:\(\s*"([^"]*)"\s*\))?\]/g, text, add((m) => m[1], (m) => joinPath(base, m[2] || ''), 'ASP.NET')));
    out.push(...collect(/\.Map(Get|Post|Put|Patch|Delete)\(\s*"([^"]+)"/g, text, add((m) => m[1], 2, 'ASP.NET minimal API')));
  }
  if (ext === 'go') {
    out.push(...collect(/\.(GET|POST|PUT|PATCH|DELETE)\(\s*"([^"]+)"/g, text, add((m) => m[1], 2, 'Gin / Echo')));
    out.push(...collect(/HandleFunc\(\s*"(?:(GET|POST|PUT|PATCH|DELETE)\s+)?([^"]+)"/g, text, add((m) => m[1] || 'ANY', 2, 'net/http')));
  }
  if (ext === 'php') out.push(...collect(/Route::(get|post|put|patch|delete|any)\(\s*['"]([^'"]+)['"]/gi, text, add((m) => m[1], 2, 'Laravel')));
  if (ext === 'rb') {
    out.push(...collect(/^\s*(get|post|put|patch|delete)\s+['"]([^'"]+)['"]/gim, text, add((m) => m[1], 2, 'Rails / Sinatra')));
    out.push(...collect(/^\s*resources?\s+:(\w+)/gim, text, add('CRUD', (m) => `/${m[1]}`, 'Rails resources')));
  }
  return out;
}

const joinPath = (a, b) => ('/' + [a, b].filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
const controllerName = (text) => ((text.match(/class\s+(\w+?)Controller\b/) || [])[1] || 'controller').toLowerCase();

// ---------- classes & functions ----------
const CLASS_RES = {
  default: /\b(?:class|interface|enum|record)\s+([A-Z]\w*)/g,
  go: /\btype\s+(\w+)\s+(?:struct|interface)\b/g,
  rs: /\b(?:struct|enum|trait)\s+([A-Z]\w*)/g,
};
const FUNC_RES = {
  js: [/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g, /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g],
  py: [/^\s*(?:async\s+)?def\s+(\w+)\s*\(/gm],
  go: [/^func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(/gm],
  java: [/(?:public|private|protected|internal|static|override|async|virtual)[\w\s<>\[\],.?]*?\s+(\w+)\s*\([^;{]*\)\s*(?:throws\s+[\w.,\s]+)?\s*\{/g],
  php: [/\bfunction\s+(\w+)\s*\(/g],
  rb: [/^\s*def\s+(?:self\.)?(\w+[?!]?)/gm],
  rs: [/\bfn\s+(\w+)/g],
  kt: [/\bfun\s+(?:<[^>]*>\s*)?(\w+)\s*\(/g],
  swift: [/\bfunc\s+(\w+)\s*\(/g],
  dart: [/^\s*(?:[\w<>?]+\s+)+(\w+)\s*\([^;]*\)\s*(?:async\s*)?\{/gm],
  c: [/^[A-Za-z_][\w\s*<>:,]*?\s\**(\w+)\s*\([^;{]*\)\s*\{/gm],
};
const FUNC_FAMILY = { js: 'js', mjs: 'js', cjs: 'js', ts: 'js', tsx: 'js', jsx: 'js', vue: 'js', svelte: 'js', py: 'py', go: 'go', java: 'java', cs: 'java', scala: 'java', php: 'php', rb: 'rb', rs: 'rs', kt: 'kt', swift: 'swift', dart: 'dart', c: 'c', cpp: 'c', cc: 'c', h: 'c', hpp: 'c' };
const NOT_FUNCS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'constructor', 'else', 'new', 'sizeof', 'main']);

// ---------- data model ----------
function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const unq = (s) => String(s || '').replace(/[`"[\]]/g, '');

export function parseSqlTables(text, file = '') {
  const tables = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:[`"[]?\w+[`"\]]?\.)?[`"[]?\w+[`"\]]?)\s*\(([\s\S]*?)\)[^;()]*;/gi;
  let m;
  while ((m = re.exec(text))) {
    const name = unq(m[1]).split('.').pop();
    const columns = [];
    const pks = new Set();
    const fks = {};
    for (const part of splitTopLevel(m[2])) {
      const pk = part.match(/^\s*(?:constraint\s+\w+\s+)?primary\s+key\s*\(([^)]+)\)/i);
      if (pk) { pk[1].split(',').forEach((c) => pks.add(unq(c).trim())); continue; }
      const fk = part.match(/^\s*(?:constraint\s+\w+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+([`"[]?[\w.]+[`"\]]?)/i);
      if (fk) { fk[1].split(',').forEach((c) => (fks[unq(c).trim()] = unq(fk[2]).split('.').pop())); continue; }
      if (/^\s*(unique|index|key|check|constraint)\b/i.test(part)) continue;
      const col = part.match(/^\s*([`"[]?\w+[`"\]]?)\s+([A-Za-z]+(?:\s*\([^)]*\))?)(.*)$/s);
      if (!col) continue;
      const rest = col[3] || '';
      const ref = rest.match(/references\s+([`"[]?[\w.]+[`"\]]?)/i);
      columns.push({
        name: unq(col[1]),
        type: col[2].replace(/\s+/g, '').toLowerCase(),
        pk: /primary\s+key/i.test(rest),
        required: /not\s+null/i.test(rest) || /primary\s+key/i.test(rest),
        unique: /\bunique\b/i.test(rest) || /primary\s+key/i.test(rest),
        fk: ref ? unq(ref[1]).split('.').pop() : '',
      });
    }
    for (const c of columns) {
      if (pks.has(c.name)) { c.pk = true; c.required = true; c.unique = true; }
      if (fks[c.name]) c.fk = fks[c.name];
    }
    tables.push({ name, columns, file, source: 'SQL' });
  }
  return tables;
}

export function parsePrismaModels(text, file = '') {
  const out = [];
  const scalar = /^(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)$/;
  for (const m of text.matchAll(/model\s+(\w+)\s*\{([^}]*)\}/g)) {
    const columns = [];
    const relFks = {};
    for (const line of m[2].split('\n')) {
      const f = line.trim().match(/^(\w+)\s+(\w+)(\[\])?(\?)?(.*)$/);
      if (!f || f[1].startsWith('@@')) continue;
      const rel = f[5].match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*\)/);
      if (rel) { rel[1].split(',').forEach((c) => (relFks[c.trim()] = f[2])); continue; }
      if (!scalar.test(f[2])) continue;
      columns.push({ name: f[1], type: f[2].toLowerCase(), pk: /@id\b/.test(f[5]), required: !f[4], unique: /@unique|@id/.test(f[5]), fk: '' });
    }
    for (const c of columns) if (relFks[c.name]) c.fk = relFks[c.name];
    out.push({ name: m[1], columns, file, source: 'Prisma' });
  }
  return out;
}

// ---------- dependencies & config ----------
function dependencies(path, text) {
  const base = path.split('/').pop().toLowerCase();
  const out = [];
  try {
    if (base === 'package.json') {
      const j = JSON.parse(text);
      for (const [k, v] of Object.entries({ ...(j.dependencies || {}) })) out.push({ name: k, version: v, ecosystem: 'npm' });
      for (const [k, v] of Object.entries({ ...(j.devDependencies || {}) })) out.push({ name: k, version: v, ecosystem: 'npm (dev)' });
    } else if (base === 'composer.json') {
      const j = JSON.parse(text);
      for (const [k, v] of Object.entries(j.require || {})) out.push({ name: k, version: v, ecosystem: 'Composer' });
    }
  } catch {
    /* invalid JSON: ignore */
  }
  if (base === 'requirements.txt')
    for (const l of text.split('\n')) {
      const m = l.trim().match(/^([A-Za-z0-9_.-]+)\s*([=<>!~]=?\s*[\w.*]+)?/);
      if (m && !l.trim().startsWith('#')) out.push({ name: m[1], version: (m[2] || '').replace(/\s/g, ''), ecosystem: 'pip' });
    }
  if (base === 'go.mod') for (const m of text.matchAll(/^\s*([\w./-]+\.[\w./-]+)\s+(v[\w.+-]+)/gm)) out.push({ name: m[1], version: m[2], ecosystem: 'Go' });
  if (base === 'gemfile') for (const m of text.matchAll(/^\s*gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/gm)) out.push({ name: m[1], version: m[2] || '', ecosystem: 'RubyGems' });
  if (base === 'cargo.toml') {
    const sec = text.split(/^\[dependencies\]\s*$/m)[1]?.split(/^\[/m)[0] || '';
    for (const m of sec.matchAll(/^\s*([\w-]+)\s*=\s*(?:"([^"]+)"|\{[^}]*version\s*=\s*"([^"]+)")/gm)) out.push({ name: m[1], version: m[2] || m[3] || '', ecosystem: 'Cargo' });
  }
  if (base === 'pom.xml') for (const m of text.matchAll(/<artifactId>([^<]+)<\/artifactId>\s*(?:<version>([^<]+)<\/version>)?/g)) out.push({ name: m[1], version: m[2] || '', ecosystem: 'Maven' });
  if (base.endsWith('.csproj')) for (const m of text.matchAll(/PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?/g)) out.push({ name: m[1], version: m[2] || '', ecosystem: 'NuGet' });
  return out;
}

function envVars(text) {
  const names = new Set();
  const res = [
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
    /os\.(?:environ(?:\.get)?\(?\[?|getenv\()\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
    /System\.getenv\(\s*"([A-Z_][A-Z0-9_]*)"/g,
    /GetEnvironmentVariable\(\s*"([A-Z_][A-Z0-9_]*)"/g,
    /os\.Getenv\(\s*"([A-Z_][A-Z0-9_]*)"/g,
    /ENV\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /\bgetenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  ];
  for (const re of res) for (const m of text.matchAll(re)) names.add(m[1]);
  return [...names];
}

const ENTRY_RE = /(^|\/)(main|index|app|server|program|manage|wsgi|asgi|startup)\.(js|mjs|ts|py|go|cs|java|kt|rb|php|rs|dart)$|(^|\/)Program\.cs$|(^|\/)Main\.java$/i;

/** Analyse a list of { path, content } files. */
export function analyseCode(files) {
  const inv = {
    files: 0, lines: 0, languages: {}, entryPoints: [], routes: [], tables: [], classes: [], functions: [],
    dependencies: [], envVars: [], todos: 0, skipped: [], tests: 0,
  };
  const env = new Set();
  for (const f of files) {
    const path = f.path.replace(/\\/g, '/');
    const reason = skipReason(path, f.size ?? f.content?.length ?? 0);
    if (reason) { inv.skipped.push({ path, reason }); continue; }
    const text = String(f.content || '');
    const ext = extOf(path);
    const lang = LANGUAGES[ext] || (ext === 'dockerfile' ? 'Dockerfile' : 'Config');
    const lines = text.split('\n').length;
    inv.files++;
    inv.lines += lines;
    inv.languages[lang] ||= { files: 0, lines: 0 };
    inv.languages[lang].files++;
    inv.languages[lang].lines += lines;
    if (ENTRY_RE.test(path)) inv.entryPoints.push(path);
    if (/(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.\w+$|_test\.(go|py)$|Tests?\.(cs|java)$/i.test(path)) inv.tests++;
    inv.todos += (text.match(/\b(TODO|FIXME|HACK)\b/g) || []).length;
    inv.routes.push(...routes(path, ext, text));
    if (ext === 'sql') inv.tables.push(...parseSqlTables(text, path));
    if (ext === 'prisma') inv.tables.push(...parsePrismaModels(text, path));
    inv.dependencies.push(...dependencies(path, text));
    envVars(text).forEach((v) => env.add(v));
    if (path.endsWith('package.json')) {
      try {
        const j = JSON.parse(text);
        if (j.main) inv.entryPoints.push(`${path} → main: ${j.main}`);
        if (j.scripts?.start) inv.entryPoints.push(`${path} → npm start: ${j.scripts.start}`);
      } catch { /* ignore */ }
    }
    const fam = FUNC_FAMILY[ext];
    if (fam) {
      const cre = CLASS_RES[ext] || CLASS_RES.default;
      for (const m of text.matchAll(cre)) inv.classes.push({ name: m[1], file: path, line: lineOf(text, m.index) });
      for (const re of FUNC_RES[fam] || []) {
        for (const m of text.matchAll(re)) {
          if (!NOT_FUNCS.has(m[1])) inv.functions.push({ name: m[1], file: path });
        }
      }
    }
  }
  inv.envVars = [...env].sort();
  // De-duplicate routes.
  const seen = new Set();
  inv.routes = inv.routes.filter((r) => {
    const k = `${r.method} ${r.path}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return inv;
}

/** Technical inventory document (Markdown). */
export function inventoryMarkdown(inv, name = 'Codebase') {
  const t = (h, rows) =>
    rows.length
      ? [`| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => String(c ?? '').replace(/\|/g, '\\|') || '-').join(' | ')} |`)].join('\n') + '\n'
      : '_None found._\n';
  const langs = Object.entries(inv.languages).sort((a, b) => b[1].lines - a[1].lines);
  const byFile = {};
  for (const c of inv.classes) (byFile[c.file] ||= { classes: [], functions: [] }).classes.push(c.name);
  for (const f of inv.functions) (byFile[f.file] ||= { classes: [], functions: [] }).functions.push(f.name);
  return [
    `# Technical Inventory — ${name}`,
    '',
    '> Generated by static analysis. The code was read as text: it was not run and was not changed. Results are based on recognised patterns and must be reviewed by a developer.',
    '',
    '## Summary',
    t(['Files analysed', 'Lines', 'Languages', 'API endpoints', 'Data tables', 'Classes / types', 'Functions', 'Test files', 'TODO / FIXME'], [[inv.files, inv.lines, langs.length, inv.routes.length, inv.tables.length, inv.classes.length, inv.functions.length, inv.tests, inv.todos]]),
    '## Languages',
    t(['Language', 'Files', 'Lines'], langs.map(([l, v]) => [l, v.files, v.lines])),
    '## Entry points',
    inv.entryPoints.length ? inv.entryPoints.map((e) => `- \`${e}\``).join('\n') + '\n' : '_None recognised._\n',
    '## API endpoints',
    t(['Method', 'Path', 'Framework', 'File', 'Line'], inv.routes.map((r) => [r.method, `\`${r.path}\``, r.framework, r.file, r.line])),
    '## Data model',
    inv.tables.length
      ? inv.tables.map((tb) => `### ${tb.name}\n_Source: ${tb.source} (${tb.file})_\n\n${t(['Column', 'Type', 'Key', 'Required', 'References'], tb.columns.map((c) => [c.name, c.type, c.pk ? 'PK' : c.fk ? 'FK' : '', c.required ? 'Yes' : 'No', c.fk]))}`).join('\n')
      : '_No SQL or Prisma table definitions found._\n',
    '## Modules',
    t(['File', 'Classes / types', 'Functions'], Object.entries(byFile).slice(0, 200).map(([f, v]) => [f, v.classes.slice(0, 12).join(', '), v.functions.slice(0, 15).join(', ') + (v.functions.length > 15 ? ` (+${v.functions.length - 15})` : '')])),
    '## Dependencies',
    t(['Package', 'Version', 'Ecosystem'], inv.dependencies.map((d) => [d.name, d.version, d.ecosystem])),
    '## Configuration (environment variable names only)',
    inv.envVars.length ? inv.envVars.map((v) => `- \`${v}\``).join('\n') + '\n' : '_None found._\n',
    '## Files not read',
    t(['File', 'Reason'], inv.skipped.slice(0, 100).map((s) => [s.path, s.reason])),
    '## Questions for the development team',
    [
      inv.routes.length ? '- Which endpoints require authentication, and with which roles?' : '- No endpoints were recognised: how is the system called (UI only, CLI, jobs)?',
      inv.tables.length ? '- Are there tables not defined in SQL/Prisma (e.g. created by an ORM at runtime)?' : '- Where is the data model defined (ORM classes, migrations, external database)?',
      inv.tests ? `- ${inv.tests} test file(s) found: what is the current coverage?` : '- No test files were found: how is the code tested?',
      inv.envVars.length ? `- Where are the ${inv.envVars.length} configuration values stored per environment?` : '',
      inv.todos ? `- ${inv.todos} TODO/FIXME markers found: are any of them release blockers?` : '',
    ].filter(Boolean).join('\n') + '\n',
  ].join('\n');
}
