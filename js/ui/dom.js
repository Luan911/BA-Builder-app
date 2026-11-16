// Small DOM helpers: escaping, icons, toasts, modals, menus and the Read Aloud bar.
import { escapeHtml } from '../markdown.js';
import { speechSupported, speak, pause, resume, stop, getSpeechState, onSpeechChange, getVoices, onVoicesReady } from '../speech.js';
import { getSettings, updateSettings } from '../store.js';

export const esc = escapeHtml;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  flag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.6a6 6 0 0 1 3.5 5.4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0z"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  workflow: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v4a3 3 0 0 0 3 3H14"/>',
  plug: '<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  lifecycle: '<circle cx="5" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M7.5 12h2M14.5 12h2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  shapes: '<circle cx="7" cy="7" r="4"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M17 3l4 7h-8z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  arrowUp: '<path d="m18 15-6-6-6 6"/>',
  arrowDown: '<path d="m6 9 6 6 6-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  logo: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/><path d="m8 15 2.5 2.5L16 12"/>',
};

export function icon(name, size = 16, cls = '') {
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;
}

// ---------- toast ----------
export function toast(message, kind = 'ok', ms = 3200) {
  let host = $('#toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `${icon(kind === 'err' ? 'alert' : kind === 'info' ? 'info' : 'check', 16)}<span>${esc(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, ms);
}

// ---------- modal ----------
const openModals = new Set();
export function closeAllModals() {
  for (const close of [...openModals]) close();
  $$('.menu').forEach((m) => m.remove());
}

export function openModal({ title, body = '', footer = '', wide = false, onClose } = {}) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('x', 18)}</button></header>
      <div class="modal-body"></div>
      <footer class="modal-foot"></footer>
    </div>`;
  const bodyEl = $('.modal-body', wrap);
  const footEl = $('.modal-foot', wrap);
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);
  if (typeof footer === 'string') footEl.innerHTML = footer;
  else footEl.appendChild(footer);
  if (!footer) footEl.remove();
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  const close = () => {
    if (!openModals.has(close)) return;
    openModals.delete(close);
    wrap.remove();
    if (!openModals.size) document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    onClose?.();
    prevFocus?.focus?.();
  };
  openModals.add(close);
  const onKey = (e) => {
    if (e.key === 'Escape' && [...openModals].pop() === close) close();
  };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => {
    if (e.target === wrap) close();
  });
  $('[data-close]', wrap).addEventListener('click', close);
  setTimeout(() => ($('input, select, textarea', bodyEl) || $('[data-close]', wrap)).focus(), 30);
  return { el: wrap, body: bodyEl, close };
}

export function confirmDialog(message, { okLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = openModal({
      title: 'Please confirm',
      body: `<p class="confirm-text">${esc(message)}</p>`,
      footer: `<button class="btn ghost" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okLabel)}</button>`,
      onClose: () => !done && resolve(false),
    });
    $('[data-yes]', m.el).addEventListener('click', () => {
      done = true;
      m.close();
      resolve(true);
    });
    $('[data-no]', m.el).addEventListener('click', () => m.close());
  });
}

// ---------- popover menu ----------
export function attachMenu(button, items) {
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    $$('.menu').forEach((m) => m.remove());
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = items.map((it, i) => `<button role="menuitem" data-i="${i}">${icon(it.icon || 'chevron', 16)}<span>${esc(it.label)}</span></button>`).join('');
    document.body.appendChild(menu);
    const r = button.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6 + window.scrollY}px`;
    menu.style.left = `${Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8)) + window.scrollX}px`;
    menu.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b) return;
      menu.remove();
      items[Number(b.dataset.i)].onClick();
    });
    const off = () => {
      menu.remove();
      document.removeEventListener('click', off);
    };
    setTimeout(() => document.addEventListener('click', off), 0);
    menu.querySelector('button')?.focus();
  });
}

/** Run an async task while showing a busy state on a button. */
export async function busy(button, label, task) {
  const original = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span><span>${esc(label)}</span>`;
  }
  try {
    return await task((msg) => button && (button.innerHTML = `<span class="spinner"></span><span>${esc(msg)}</span>`));
  } catch (e) {
    console.error(e);
    toast(e.message || 'Something went wrong.', 'err', 6000);
    return undefined;
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = original;
    }
  }
}

// ---------- Read Aloud bar ----------
/** Returns an element with play / pause / stop, speed and voice controls. */
export function readAloudBar(getText, label = 'document') {
  const el = document.createElement('div');
  el.className = 'readaloud';
  if (!speechSupported) {
    el.innerHTML = `<span class="muted small">${icon('volume', 14)} Read Aloud is not supported in this browser.</span>`;
    return el;
  }
  const s = getSettings();
  el.innerHTML = `
    <button class="btn sm" data-play title="Read this ${esc(label)} aloud">${icon('volume', 15)}<span>Read aloud</span></button>
    <button class="icon-btn sm" data-stop title="Stop" hidden>${icon('stop', 14)}</button>
    <select class="sm" data-rate title="Speed" aria-label="Reading speed">
      ${[0.75, 0.9, 1, 1.15, 1.3, 1.5].map((r) => `<option value="${r}" ${Number(s.rate) === r ? 'selected' : ''}>${r}×</option>`).join('')}
    </select>
    <select class="sm voice" data-voice title="Voice" aria-label="Voice"><option value="">Default voice</option></select>
    <span class="progress small muted" data-progress></span>`;
  const play = $('[data-play]', el);
  const stopBtn = $('[data-stop]', el);
  const prog = $('[data-progress]', el);
  const voiceSel = $('[data-voice]', el);
  const fillVoices = () => {
    const cur = getSettings().voiceURI;
    voiceSel.innerHTML = `<option value="">Default voice</option>${getVoices()
      .map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === cur ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`)
      .join('')}`;
  };
  onVoicesReady(fillVoices);
  let mine = false;
  const render = (st) => {
    const active = mine && st.status !== 'idle';
    stopBtn.hidden = !active;
    play.innerHTML = active && st.status === 'speaking' ? `${icon('pause', 14)}<span>Pause</span>` : active && st.status === 'paused' ? `${icon('play', 14)}<span>Resume</span>` : `${icon('volume', 15)}<span>Read aloud</span>`;
    prog.textContent = active ? `${st.index} / ${st.total}` : '';
    if (st.status === 'idle') mine = false;
  };
  const off = onSpeechChange(render);
  play.addEventListener('click', () => {
    const st = getSpeechState();
    if (mine && st.status === 'speaking') return pause();
    if (mine && st.status === 'paused') return resume();
    const text = getText();
    if (!text) return toast('Nothing to read yet.', 'info');
    mine = true;
    speak(text, { rate: getSettings().rate, voiceURI: getSettings().voiceURI, label });
    render(getSpeechState());
  });
  stopBtn.addEventListener('click', () => stop());
  $('[data-rate]', el).addEventListener('change', (e) => updateSettings({ rate: Number(e.target.value) }));
  voiceSel.addEventListener('change', (e) => updateSettings({ voiceURI: e.target.value }));
  // Stop listening when the bar leaves the page.
  const obs = new MutationObserver(() => {
    if (!el.isConnected) {
      off();
      obs.disconnect();
      if (mine) stop();
    }
  });
  setTimeout(() => obs.observe(document.body, { childList: true, subtree: true }), 0);
  return el;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsText(file);
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
  });
}
