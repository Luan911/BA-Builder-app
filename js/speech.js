// Read Aloud using the browser's built-in Web Speech API (no server, no AI).
// Long text is split into short chunks because some browsers stop speaking
// after ~15 seconds of a single utterance.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
export const speechSupported = Boolean(synth && typeof SpeechSynthesisUtterance !== 'undefined');

const listeners = new Set();
let state = { status: 'idle', index: 0, total: 0, label: '' };
let token = 0;

function set(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn(state);
}

export const getSpeechState = () => state;
export function onSpeechChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVoices() {
  if (!speechSupported) return [];
  return synth
    .getVoices()
    .slice()
    .sort((a, b) => Number(b.lang.startsWith('en')) - Number(a.lang.startsWith('en')) || a.name.localeCompare(b.name));
}

export function onVoicesReady(fn) {
  if (!speechSupported) return;
  if (synth.getVoices().length) fn();
  synth.addEventListener?.('voiceschanged', fn);
}

export function chunkText(text, max = 220) {
  const sentences = String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;:])\s+/)
    .filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if (s.length > max) {
      if (cur) chunks.push(cur), (cur = '');
      for (let i = 0; i < s.length; i += max) {
        // break long sentences at a space where possible
        let piece = s.slice(i, i + max);
        chunks.push(piece);
      }
      continue;
    }
    if ((cur + ' ' + s).trim().length > max) {
      chunks.push(cur.trim());
      cur = s;
    } else cur = `${cur} ${s}`;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export function speak(text, { rate = 1, voiceURI = '', label = '' } = {}) {
  if (!speechSupported) return false;
  stop();
  const my = ++token;
  const chunks = chunkText(text);
  if (!chunks.length) return false;
  const voice = getVoices().find((v) => v.voiceURI === voiceURI);
  set({ status: 'speaking', index: 0, total: chunks.length, label });
  const next = (i) => {
    if (my !== token) return;
    if (i >= chunks.length) {
      set({ status: 'idle', index: 0, total: 0, label: '' });
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i]);
    u.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.onend = () => next(i + 1);
    u.onerror = (e) => {
      if (my !== token) return;
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      next(i + 1);
    };
    set({ index: i + 1 });
    synth.speak(u);
  };
  next(0);
  return true;
}

export function pause() {
  if (!speechSupported || state.status !== 'speaking') return;
  synth.pause();
  set({ status: 'paused' });
}

export function resume() {
  if (!speechSupported || state.status !== 'paused') return;
  synth.resume();
  set({ status: 'speaking' });
}

export function stop() {
  if (!speechSupported) return;
  token++;
  synth.cancel();
  if (state.status !== 'idle') set({ status: 'idle', index: 0, total: 0, label: '' });
}
