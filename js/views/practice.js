// Interview practice: answer a question out loud or in writing, then compare with the outline.
import { getSettings, saveSettings } from '../store.js';
import { esc, $, $$, toast } from '../ui.js';
import { BANK, CATEGORIES } from '../practice-bank.js';

let cat = 'All';
let idx = 0;
let shown = false;
let timer = null;

export function renderPractice(root) {
  const prog = getSettings().practice || {}; // { [index]: 'confident' | 'again', notes_[index]: text }
  const list = BANK.map((q, i) => [i, q]).filter(([, q]) => cat === 'All' || q[0] === cat);
  if (!list.find(([i]) => i === idx)) idx = list[0]?.[0] ?? 0;
  const pos = list.findIndex(([i]) => i === idx);
  const [category, question, checks, answer, avoid, [href, linkLabel]] = BANK[idx];
  const done = Object.keys(prog).filter((k) => !k.startsWith('notes_') && prog[k] === 'confident').length;
  root.innerHTML = `
    <div class="page-head"><div><h1>Interview practice</h1><p>Common Business Analyst and Technical BA interview questions. Answer first — out loud or in the box — then compare with the outline. Strong answers are specific, structured and use an example.</p></div></div>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="stat"><b>${BANK.length}</b><span>Questions</span></div>
      <div class="stat"><b style="color:var(--ok)">${done}</b><span>Answered confidently</span></div>
      <div class="stat"><b style="color:var(--red-2)">${Object.values(prog).filter((v) => v === 'again').length}</b><span>To practise again</span></div>
      <div class="stat"><b>STAR</b><span>Situation · Task · Action · Result</span></div>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:12px">${['All', ...CATEGORIES].map((c) => `<button class="btn sm ${c === cat ? 'primary' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <section class="card">
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="pill">${esc(category)}</span><span class="small muted">Question ${pos + 1} of ${list.length}</span>${prog[idx] ? `<span class="pill ${prog[idx] === 'confident' ? 'ok' : 'warn'}">${prog[idx] === 'confident' ? 'Confident' : 'Practise again'}</span>` : ''}<span class="grow"></span><span class="small muted" data-clock>2:00</span><button class="btn sm" data-timer>Start 2-minute timer</button></div>
      <h2 style="margin:12px 0 4px;font-size:20px">${esc(question)}</h2>
      <p class="small muted" style="margin:0 0 12px"><b>What they are checking:</b> ${esc(checks)}</p>
      <textarea data-notes rows="5" placeholder="Write your answer (saved on this device). Tip: start with the approach, then give a short example." style="width:100%">${esc(prog[`notes_${idx}`] || '')}</textarea>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        <button class="btn" data-prev ${pos <= 0 ? 'disabled' : ''}>← Previous</button>
        <button class="btn primary" data-show>${shown ? 'Hide' : 'Show'} the answer outline</button>
        <span class="grow"></span>
        <button class="btn sm" data-rate="again">Practise again</button>
        <button class="btn sm primary" data-rate="confident">I nailed it</button>
        <button class="btn" data-next ${pos >= list.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
      ${shown ? `<div class="callout" style="margin-top:14px"><b>A strong answer</b><p style="margin:6px 0">${esc(answer)}</p><p class="small" style="margin:6px 0 0;color:var(--red-2)"><b>Avoid:</b> ${esc(avoid)}</p><p class="small" style="margin:8px 0 0"><a href="${href}">Practise this in BA Builder: ${esc(linkLabel)} →</a></p></div>` : ''}
    </section>
    <section class="card" style="margin-top:16px"><h2 style="margin-bottom:8px">All questions</h2>
      <ol class="small" style="margin:0;padding-left:20px;columns:2;column-gap:28px">${list.map(([i, q]) => `<li style="margin-bottom:4px"><a href="#" data-go="${i}" style="${i === idx ? 'font-weight:700' : ''}">${esc(q[1])}</a> ${prog[i] === 'confident' ? '✓' : prog[i] === 'again' ? '↻' : ''}</li>`).join('')}</ol></section>`;

  const save = (patch) => saveSettings({ practice: { ...(getSettings().practice || {}), ...patch } });
  let t;
  // notes save quietly: a re-render while typing would move the cursor
  $('[data-notes]', root).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => saveSettings({ practice: { ...(getSettings().practice || {}), [`notes_${idx}`]: e.target.value } }, { quiet: true }), 400); });
  $$('[data-cat]', root).forEach((b) => (b.onclick = () => { cat = b.dataset.cat; shown = false; renderPractice(root); }));
  const go = (i) => { idx = i; shown = false; stop(); renderPractice(root); };
  $('[data-prev]', root).onclick = () => pos > 0 && go(list[pos - 1][0]);
  $('[data-next]', root).onclick = () => pos < list.length - 1 && go(list[pos + 1][0]);
  $('[data-show]', root).onclick = () => { shown = !shown; renderPractice(root); };
  $$('[data-rate]', root).forEach((b) => (b.onclick = () => { save({ [idx]: b.dataset.rate }); toast(b.dataset.rate === 'confident' ? 'Nice — marked as confident' : 'Marked to practise again'); if (pos < list.length - 1) go(list[pos + 1][0]); }));
  $$('[data-go]', root).forEach((a) => (a.onclick = (e) => { e.preventDefault(); go(+a.dataset.go); }));
  const clock = $('[data-clock]', root);
  const stop = () => { clearInterval(timer); timer = null; };
  $('[data-timer]', root).onclick = (e) => {
    stop();
    let left = 120;
    e.target.textContent = 'Restart timer';
    timer = setInterval(() => {
      left--;
      if (!document.body.contains(clock)) return stop();
      clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      clock.style.color = left <= 20 ? 'var(--red-2)' : '';
      if (left <= 0) { stop(); toast('Time! Wrap up with the result or outcome.'); }
    }, 1000);
  };
}
