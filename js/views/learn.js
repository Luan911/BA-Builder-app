// BA Masterclass (lessons, self-checks, progress, download) and the BABOK technique library.
import { getSettings, saveSettings } from '../store.js';
import { esc, $, $$, toast, download } from '../ui.js';
import { COURSE, SOURCES, TECHNIQUES, lessonList } from '../masterclass.js';

const prog = () => getSettings().masterclass || {}; // { done: { lessonId: true }, quiz: { 'lessonId:i': chosenIndex } }

export function renderMasterclass(root, lessonId) {
  const all = lessonList();
  const P = prog();
  const done = P.done || {};
  const cur = all.find((l) => l.id === lessonId) || all.find((l) => !done[l.id]) || all[0];
  const idx = all.indexOf(cur);
  const pct = Math.round((all.filter((l) => done[l.id]).length / all.length) * 100);
  const minutes = all.reduce((a, l) => a + l.minutes, 0);
  root.innerHTML = `
    <div class="page-head"><div><h1>BA Masterclass</h1><p>A complete course in business analysis — ${COURSE.length} modules, ${all.length} lessons, about ${Math.round(minutes / 60 * 10) / 10} hours — built from the BABOK® Guide structure and trusted sources, with practice in this app after every lesson.</p></div><span class="grow"></span><a class="btn" href="#/techniques">Technique library</a><button class="btn" data-dl>Download the masterclass</button></div>
    <div class="docs">
      <nav class="card doc-list" aria-label="Lessons">
        <div style="padding:6px 12px 10px"><div class="bar"><i style="width:${pct}%"></i></div><div class="small muted" style="margin-top:4px">${pct}% complete</div></div>
        ${COURSE.map((m, mi) => `<div class="nav-label">${mi + 1}. ${esc(m.title)}</div>${m.lessons.map((l) => `<a href="#/masterclass/${l.id}" class="${l.id === cur.id ? 'on' : ''}">${done[l.id] ? '✓ ' : ''}${esc(l.title)}<small>${l.minutes} min</small></a>`).join('')}`).join('')}
      </nav>
      <article class="card" style="min-width:0">
        <div class="small" style="color:var(--red-2);font-weight:700;text-transform:uppercase;letter-spacing:.06em">${esc(cur.module.title)} · lesson ${idx + 1} of ${all.length} · ${cur.minutes} min</div>
        <h2 style="font-size:24px;margin:4px 0 10px">${esc(cur.title)}</h2>
        <p style="font-size:15px">${esc(cur.intro)}</p>
        <h3>Key ideas</h3>
        <ul>${cur.points.map((x) => `<li style="margin-bottom:6px">${esc(x)}</li>`).join('')}</ul>
        <h3>How to apply it</h3>
        <ol>${cur.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
        <div class="callout" style="margin:14px 0"><b>Practise it in BA Builder</b><div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${cur.try.map(([h, t]) => `<a class="btn sm" href="${h}">${esc(t)} →</a>`).join('')}</div></div>
        <h3>Check your understanding</h3>
        ${cur.quiz.map(([q, opts, ans, why], qi) => { const key = `${cur.id}:${qi}`; const chosen = P.quiz?.[key]; return `<div class="card" style="box-shadow:none;margin-bottom:10px"><b>${qi + 1}. ${esc(q)}</b><div style="margin-top:6px">${opts.map((o, oi) => `<label style="display:block;margin:4px 0;${chosen !== undefined && oi === ans ? 'color:var(--ok);font-weight:600' : chosen === oi && oi !== ans ? 'color:var(--red-2)' : ''}"><input type="radio" name="${esc(key)}" value="${oi}" ${chosen === oi ? 'checked' : ''} data-q="${esc(key)}" data-ans="${ans}"> ${esc(o)}</label>`).join('')}</div>${chosen !== undefined ? `<p class="small" style="margin:6px 0 0">${chosen === ans ? '✓ Correct.' : '✗ Not quite.'} ${esc(why)}</p>` : ''}</div>`; }).join('')}
        <p class="small muted" style="margin-top:12px"><b>Sources:</b> ${cur.sources.map((k) => SOURCES[k]).filter(Boolean).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join(' · ')}</p>
        <div class="row" style="margin-top:14px;gap:8px">
          ${idx > 0 ? `<a class="btn" href="#/masterclass/${all[idx - 1].id}">← ${esc(all[idx - 1].title)}</a>` : '<span></span>'}
          <span class="grow"></span>
          <button class="btn ${done[cur.id] ? '' : 'primary'}" data-done>${done[cur.id] ? 'Mark as not done' : 'Mark lesson complete'}</button>
          ${idx < all.length - 1 ? `<a class="btn primary" href="#/masterclass/${all[idx + 1].id}">Next →</a>` : ''}
        </div>
      </article>
    </div>`;
  const save = (patch) => saveSettings({ masterclass: { ...prog(), ...patch } });
  $$('[data-q]', root).forEach((r) => (r.onchange = () => save({ quiz: { ...(prog().quiz || {}), [r.dataset.q]: +r.value } })));
  $('[data-done]', root).onclick = () => {
    const d = { ...(prog().done || {}) };
    if (d[cur.id]) delete d[cur.id]; else d[cur.id] = true;
    save({ done: d });
    if (d[cur.id] && idx < all.length - 1) location.hash = `#/masterclass/${all[idx + 1].id}`;
    if (Object.keys(d).length === all.length) toast('Masterclass complete — well done!');
  };
  $('[data-dl]', root).onclick = () => download(masterclassHtml(), 'BA_Masterclass.html', 'text/html');
}

/** The whole course as one printable HTML document (light theme). */
export function masterclassHtml() {
  const all = lessonList();
  const body = COURSE.map((m, mi) => `<h1>${mi + 1}. ${esc(m.title)}</h1>${m.lessons.map((l) => `
    <h2>${esc(l.title)} <small>(${l.minutes} min)</small></h2><p>${esc(l.intro)}</p>
    <h3>Key ideas</h3><ul>${l.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3>How to apply it</h3><ol>${l.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    <h3>Self-check</h3><ol>${l.quiz.map(([q, o, a, w]) => `<li>${esc(q)}<br><i>Answer: ${esc(o[a])}.</i> ${esc(w)}</li>`).join('')}</ol>
    <p class="src">Sources: ${l.sources.map((k) => SOURCES[k]).filter(Boolean).map(([n, u]) => `<a href="${esc(u)}">${esc(n)}</a>`).join(' · ')}</p>`).join('')}`).join('');
  const tech = `<h1>Appendix — the 50 BABOK® techniques</h1><table><thead><tr><th>Technique</th><th>What it is</th></tr></thead><tbody>${TECHNIQUES.map(([n, d]) => `<tr><td>${esc(n)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table>`;
  const refs = `<h1>Sources</h1><ul>${Object.values(SOURCES).map(([n, u]) => `<li><a href="${esc(u)}">${esc(n)}</a></li>`).join('')}</ul><p>BABOK® is a registered trademark of the International Institute of Business Analysis. This course summarises ideas in its own words; read the sources for the authoritative text.</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>BA Masterclass</title><style>body{font-family:Calibri,'Segoe UI',Arial,sans-serif;max-width:860px;margin:32px auto;padding:0 24px;color:#111;line-height:1.55}h1{color:#15803d;border-bottom:3px solid #dc2626;padding-bottom:4px;margin-top:36px}h2{color:#111;margin-top:26px}h2 small{color:#666;font-weight:400;font-size:13px}h3{color:#15803d;font-size:15px;margin-bottom:4px}.src{font-size:12px;color:#555}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:5px 8px;text-align:left;vertical-align:top}th{background:#eef7f1}</style></head><body><h1 style="border:none;font-size:30px">BA Masterclass</h1><p>${COURSE.length} modules · ${all.length} lessons · generated by BA Builder</p>${body}${tech}${refs}</body></html>`;
}

export function renderTechniques(root) {
  let q = '';
  const draw = () => {
    const list = TECHNIQUES.filter(([n, d]) => !q || `${n} ${d}`.toLowerCase().includes(q.toLowerCase()));
    $('[data-list]', root).innerHTML = `<table class="tbl"><thead><tr><th>#</th><th>Technique</th><th>What it is</th><th>Practise it</th></tr></thead><tbody>${list.map(([n, d, h]) => `<tr><td class="muted">${TECHNIQUES.findIndex((t) => t[0] === n) + 1}</td><td><b>${esc(n)}</b></td><td>${esc(d)}</td><td><a class="btn sm" href="${h}">Open →</a></td></tr>`).join('')}</tbody></table>`;
  };
  root.innerHTML = `
    <div class="page-head"><div><h1>Technique library</h1><p>All 50 techniques of the BABOK® Guide v3, what each is for, and where to practise it in BA Builder.</p></div><span class="grow"></span><a class="btn" href="#/masterclass">BA Masterclass</a></div>
    <section class="card flush"><div class="card-head"><input type="search" data-s placeholder="Search techniques…" style="max-width:260px" aria-label="Search techniques"><span class="grow"></span><span class="small muted">${TECHNIQUES.length} techniques</span></div><div class="tbl-wrap" data-list></div></section>`;
  draw();
  $('[data-s]', root).addEventListener('input', (e) => { q = e.target.value; draw(); });
}
