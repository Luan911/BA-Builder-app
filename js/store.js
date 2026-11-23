// State: several projects kept in browser storage, autosave and undo.
import { normalize, blankProject } from './model.js';
import { sampleProject } from './sample.js';

const KEY = 'bab.workspace';
const SKEY = 'bab.settings';
const safe = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};

let ws = { current: null, projects: {} };
let settings = { theme: 'auto', org: '', author: '', currency: 'R' };
const listeners = new Set();
const undoStack = [];
let lastSnap = 0;
export let saved = true;

export function load() {
  try { ws = JSON.parse(safe.get(KEY) || 'null') || ws; } catch { /* corrupt storage: start fresh */ }
  try { settings = { ...settings, ...JSON.parse(safe.get(SKEY) || '{}') }; } catch { /* ignore */ }
  for (const id of Object.keys(ws.projects || {})) ws.projects[id] = normalize(ws.projects[id]);
  if (!ws.projects || !Object.keys(ws.projects).length) {
    const s = sampleProject();
    ws = { current: s.id, projects: { [s.id]: s } };
    persist();
    return { firstRun: true };
  }
  if (!ws.projects[ws.current]) ws.current = Object.keys(ws.projects)[0];
  return { firstRun: false };
}

const persist = () => (saved = safe.set(KEY, JSON.stringify(ws)));
const emit = (info = {}) => listeners.forEach((fn) => fn(info));

export const project = () => ws.projects[ws.current];
export const projects = () => Object.values(ws.projects).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
export const getSettings = () => settings;
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const canUndo = () => undoStack.length > 0;

/** Mutate the current project. `quiet` = do not re-render (used while typing). */
export function update(fn, { quiet = false, typing = false } = {}) {
  const now = Date.now();
  if (!typing || now - lastSnap > 2500) {
    undoStack.push(JSON.stringify(project()));
    if (undoStack.length > 50) undoStack.shift();
    lastSnap = now;
  }
  fn(project());
  project().updatedAt = new Date().toISOString();
  persist();
  emit({ rerender: !quiet });
}

export function undo() {
  const prev = undoStack.pop();
  if (!prev) return false;
  const p = normalize(JSON.parse(prev));
  ws.projects[p.id] = p;
  ws.current = p.id;
  persist();
  emit({ rerender: true });
  return true;
}

export function switchProject(id) {
  if (!ws.projects[id]) return;
  ws.current = id;
  undoStack.length = 0;
  persist();
  emit({ rerender: true });
}

export function addProject(p) {
  p = normalize(p);
  ws.projects[p.id] = p;
  ws.current = p.id;
  undoStack.length = 0;
  persist();
  emit({ rerender: true });
  return p;
}
export const newProject = (name) => addProject(blankProject(name));
export const loadSample = () => {
  const s = sampleProject();
  s.id = `prj_sample_${Date.now().toString(36)}`;
  return addProject(s);
};

export function deleteProject(id) {
  delete ws.projects[id];
  if (!Object.keys(ws.projects).length) {
    const p = blankProject('New project');
    ws.projects[p.id] = p;
  }
  if (!ws.projects[ws.current]) ws.current = Object.keys(ws.projects)[0];
  persist();
  emit({ rerender: true });
}

export function saveSettings(patch, { quiet = false } = {}) {
  settings = { ...settings, ...patch };
  safe.set(SKEY, JSON.stringify(settings));
  if (!quiet) emit({ rerender: true, settings: true });
}
