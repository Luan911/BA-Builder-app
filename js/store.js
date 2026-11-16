// App state: the active project and user settings, persisted in the browser.
import { normalizeProject, blankProject } from './model.js';
import { sampleProject } from './sample.js';
import { evaluate } from './rules.js';

const PROJECT_KEY = 'autospec.project.v1';
const SETTINGS_KEY = 'autospec.settings.v1';

export const DEFAULT_SETTINGS = {
  company: 'AutoSpec',
  accent: '#4f46e5',
  logo: '',
  footer: 'Confidential',
  theme: 'auto',
  voiceURI: '',
  rate: 1,
  lanes: true,
};

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
};

let project = null;
let settings = { ...DEFAULT_SETTINGS };
let cachedEval = null;
const listeners = new Set();
const undoStack = [];
let lastSnapshotAt = 0;
let saveOk = true;

export function load() {
  const raw = storage.get(PROJECT_KEY);
  let firstRun = false;
  try {
    project = raw ? normalizeProject(JSON.parse(raw)) : null;
  } catch {
    project = null;
  }
  if (!project) {
    project = sampleProject();
    firstRun = true;
  }
  try {
    settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(storage.get(SETTINGS_KEY) || '{}') || {}) };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  cachedEval = null;
  return { firstRun };
}

export const getProject = () => project;
export const getSettings = () => settings;
export const canUndo = () => undoStack.length > 0;
export const lastSaveOk = () => saveOk;

/** Evaluation is cached until the project changes. */
export function getEvaluation() {
  if (!cachedEval) cachedEval = evaluate(project);
  return cachedEval;
}

function persist() {
  saveOk = storage.set(PROJECT_KEY, JSON.stringify(project));
}

function emit(info) {
  for (const fn of listeners) fn(info);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot(mode) {
  const now = Date.now();
  if (mode === 'typing' && now - lastSnapshotAt < 2500) return;
  lastSnapshotAt = now;
  undoStack.push(JSON.stringify(project));
  if (undoStack.length > 40) undoStack.shift();
}

/**
 * Change the project. `mutator` edits the project in place.
 * opts.rerender=false is used while typing so the form keeps focus.
 */
export function update(mutator, opts = {}) {
  snapshot(opts.typing ? 'typing' : 'action');
  mutator(project);
  project.updatedAt = new Date().toISOString();
  cachedEval = null;
  persist();
  emit({ rerender: opts.rerender !== false });
}

export function undo() {
  const prev = undoStack.pop();
  if (!prev) return false;
  project = normalizeProject(JSON.parse(prev));
  cachedEval = null;
  persist();
  emit({ rerender: true });
  return true;
}

export function replaceProject(p) {
  snapshot('action');
  project = normalizeProject(p);
  cachedEval = null;
  persist();
  emit({ rerender: true });
}

export const newBlankProject = () => replaceProject(blankProject());
export const loadSample = () => replaceProject(sampleProject());

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
  emit({ rerender: false, settings: true });
}
