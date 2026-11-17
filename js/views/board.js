// Kanban backlog board: drag stories between statuses.
import { project, update } from '../store.js';
import { esc, $, $$, autoPill } from '../ui.js';
import { STORY_STATUS, nameOf } from '../model.js';
import { openItem } from './collection.js';

let filter = { release: '', epic: '' };

export function renderBoard(root) {
  const p = project();
  const epics = [...new Set(p.stories.map((s) => s.epic).filter(Boolean))];
  const stories = p.stories.filter((s) => (!filter.release || s.release === filter.release) && (!filter.epic || s.epic === filter.epic));
  root.innerHTML = `
    <div class="page-head"><div><h1>Backlog board</h1><p>Drag stories between columns to update their status. Click a card to edit it.</p></div><span class="grow"></span>
      <select data-rel style="width:auto;max-width:260px"><option value="">All releases</option>${p.releases.map((r) => `<option value="${r.id}" ${filter.release === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
      <select data-epic style="width:auto;max-width:260px"><option value="">All epics</option>${epics.map((e) => `<option ${filter.epic === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>
      <button class="btn primary" data-add>+ Add story</button></div>
    <div class="board">${STORY_STATUS.map((st) => {
      const col = stories.filter((s) => s.status === st);
      return `<div class="col" data-col="${st}"><h3><span>${st}</span><span class="muted small">${col.length} · ${col.reduce((a, s) => a + (+s.points || 0), 0)} pts</span></h3>
        ${col.map((s) => `<div class="kcard" draggable="true" data-id="${s.id}" tabindex="0"><div class="row small"><b>${esc(s.code)}</b>${s.epic ? `<span class="muted">${esc(s.epic)}</span>` : ''}<span class="grow"></span>${s.points ? `<span class="pill">${esc(s.points)}</span>` : ''}</div><div class="t">${esc(s.iWant)}</div><div class="row small">${autoPill(s.priority)}<span class="muted">${esc(nameOf(p.personas, s.asA))}</span></div></div>`).join('')}
      </div>`;
    }).join('')}</div>`;
  $('[data-rel]', root).onchange = (e) => ((filter.release = e.target.value), renderBoard(root));
  $('[data-epic]', root).onchange = (e) => ((filter.epic = e.target.value), renderBoard(root));
  $('[data-add]', root).onclick = () => openItem('stories', null, filter.release ? { release: filter.release } : {});
  $$('.kcard', root).forEach((c) => {
    c.ondragstart = (e) => e.dataTransfer.setData('text/plain', c.dataset.id);
    c.onclick = () => openItem('stories', c.dataset.id);
    c.onkeydown = (e) => e.key === 'Enter' && openItem('stories', c.dataset.id);
  });
  $$('.col', root).forEach((col) => {
    col.ondragover = (e) => (e.preventDefault(), col.classList.add('over'));
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      update((pr) => {
        const s = pr.stories.find((x) => x.id === id);
        if (s) s.status = col.dataset.col;
      });
    };
  });
}
