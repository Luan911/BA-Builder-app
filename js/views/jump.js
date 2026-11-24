// Ctrl+K quick jump: type a few letters to open any screen, document or item.
import { project } from '../store.js';
import { esc, $, modal } from '../ui.js';
import { COLLECTIONS } from '../model.js';
import { DOC_LIST } from '../gen/docs.js';
import { openItem } from './collection.js';

const labelOf = (x) => x.title || x.name || x.term || x.question || x.description || x.iWant || x.item || x.problem || x.artefact || x.decision || x.system || (x.method ? `${x.method} ${x.path}` : '') || '';

/** Everything you can jump to: screens, documents and every item in every register. */
export function jumpTargets(p, nav) {
  const out = [];
  for (const [group, items] of nav) for (const [r, l] of items) out.push({ kind: 'Screen', label: l, detail: group, href: `#/${r}` });
  for (const d of DOC_LIST) out.push({ kind: 'Document', label: d.title, detail: d.audience, href: `#/docs/${d.id}` });
  for (const [key, c] of Object.entries(COLLECTIONS)) for (const x of p[key] || []) out.push({ kind: c.singular, label: `${x.code ? `${x.code} ` : ''}${labelOf(x)}`.trim() || c.singular, detail: c.title, key, id: x.id });
  return out;
}

/** Rank by how well the query matches: start of label, whole words, then anywhere. */
export function searchTargets(list, q) {
  const t = q.trim().toLowerCase();
  if (!t) return list.filter((x) => x.kind === 'Screen').slice(0, 12);
  const words = t.split(/\s+/);
  return list
    .map((x) => { const hay = `${x.label} ${x.detail} ${x.kind}`.toLowerCase(); if (!words.every((w) => hay.includes(w))) return null; const lab = x.label.toLowerCase(); return [x, (lab.startsWith(t) ? 0 : lab.includes(t) ? 1 : 2) + (x.kind === 'Screen' ? 0 : 0.5)]; })
    .filter(Boolean).sort((a, b) => a[1] - b[1]).slice(0, 14).map(([x]) => x);
}

export function openJump(nav) {
  const all = jumpTargets(project(), nav);
  const m = modal({
    title: 'Jump to…',
    body: `<input type="search" data-jq placeholder="Type a screen, document, ID or name — e.g. “FR-001”, “sql”, “risk”" style="width:100%" aria-label="Search everything"><div data-jr style="margin-top:10px;max-height:52vh;overflow:auto"></div><p class="small muted" style="margin:8px 0 0">↑ ↓ to move · Enter to open · Esc to close</p>`,
    footer: '',
  });
  const input = $('[data-jq]', m.el), box = $('[data-jr]', m.el);
  let hits = [], sel = 0;
  const draw = () => {
    hits = searchTargets(all, input.value);
    sel = Math.min(sel, Math.max(0, hits.length - 1));
    box.innerHTML = hits.length ? hits.map((x, i) => `<a href="#" data-j="${i}" class="jump ${i === sel ? 'on' : ''}"><span class="pill">${esc(x.kind)}</span> <b>${esc(x.label)}</b> <span class="muted small">${esc(x.detail || '')}</span></a>`).join('') : '<p class="muted">Nothing found.</p>';
  };
  const go = (x) => {
    if (!x) return;
    m.close();
    if (x.href) location.hash = x.href;
    else { location.hash = `#/c/${x.key}`; setTimeout(() => openItem(x.key, x.id), 60); }
  };
  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(hits[sel]); }
  });
  box.addEventListener('click', (e) => { const a = e.target.closest('[data-j]'); if (a) { e.preventDefault(); go(hits[+a.dataset.j]); } });
  draw();
  setTimeout(() => input.focus(), 20);
}
