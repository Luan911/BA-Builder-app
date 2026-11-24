// Backups: one-file backup of every project, restore, reminders, and automatic restore points kept
// in this browser (IndexedDB). The pure functions at the top are unit-tested.

export const BACKUP_KIND = 'ba-builder-backup';
export const INTERVALS = { daily: 1, weekly: 7, monthly: 30, off: 0 };
const DAY = 86400000;

/** A backup file of the whole workspace (every project, plus templates and preferences). */
export function backupFile(projectList, settings, now = new Date()) {
  const keep = { ...settings };
  for (const k of ['lastBackup', 'backupSnooze', 'backupBase']) delete keep[k];
  return { kind: BACKUP_KIND, app: 'BA Builder', version: 1, createdAt: now.toISOString(), projects: projectList, settings: keep };
}

/** Read a backup file or a single project file. Returns { projects, settings | null, createdAt }. */
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(String(text || '').replace(/^﻿/, '')); } catch { throw new Error('This file is not valid JSON'); }
  if (data && data.kind === BACKUP_KIND) {
    if (!Array.isArray(data.projects) || !data.projects.every((p) => p && p.id && p.meta)) throw new Error('This backup is damaged: its projects are missing');
    return { projects: data.projects, settings: data.settings && typeof data.settings === 'object' ? data.settings : null, createdAt: data.createdAt || '' };
  }
  if (data && data.meta && data.id) return { projects: [data], settings: null, createdAt: data.updatedAt || '' };
  throw new Error('This is not a BA Builder backup or project file');
}

/** What a restore would do to the projects in this browser. */
export function restorePlan(current, incoming) {
  const ids = new Set(current.map((p) => p.id));
  const byId = Object.fromEntries(current.map((p) => [p.id, p]));
  const replace = incoming.filter((p) => ids.has(p.id));
  return {
    replace: replace.map((p) => p.meta.name || 'Untitled'),
    newer: replace.filter((p) => String(byId[p.id].updatedAt || '') > String(p.updatedAt || '')).map((p) => p.meta.name || 'Untitled'),
    add: incoming.filter((p) => !ids.has(p.id)).map((p) => p.meta.name || 'Untitled'),
    keep: current.filter((p) => !incoming.some((x) => x.id === p.id)).map((p) => p.meta.name || 'Untitled'),
  };
}

/** Settings after a restore: templates are merged (the backup wins on a name clash), the rest is kept. */
export function mergeSettings(mine, theirs) {
  if (!theirs) return mine;
  const t = [...(mine.templates || []).filter((x) => !(theirs.templates || []).some((y) => y.name === x.name)), ...(theirs.templates || [])];
  return { ...mine, templates: t, brand: mine.brand || theirs.brand, org: mine.org || theirs.org || '' };
}

/**
 * Is a backup reminder due? Changes since the last backup (or since tracking began) and the chosen
 * interval has passed, and the user has not snoozed it.
 */
export function backupDue(projectList, settings, now = Date.now()) {
  const days = INTERVALS[settings.backupEvery || 'weekly'];
  if (!days) return { due: false };
  const since = Date.parse(settings.lastBackup || settings.backupBase || '') || now;
  const changed = projectList.filter((p) => (Date.parse(p.updatedAt) || 0) > since);
  const snoozed = (Date.parse(settings.backupSnooze || '') || 0) > now;
  const age = Math.floor((now - since) / DAY);
  return { due: !snoozed && changed.length > 0 && now - since >= days * DAY, changed: changed.length, days: age, never: !settings.lastBackup };
}

export const backupName = (now = new Date()) => `BA_Builder_backup_${now.toISOString().slice(0, 10)}.json`;

// ---------- restore points (IndexedDB) ----------
// the end-to-end test uses its own database so it never touches your restore points
export const DB = typeof location !== 'undefined' && /[?&]e2e=/.test(location.search) ? 'bab-restore-points-test' : 'bab-restore-points';
const MAX_POINTS = 12;
function db() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Restore points are not available in this browser'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('points', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Could not open browser storage'));
  });
}
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('points', mode);
    const out = fn(t.objectStore('points'));
    t.oncomplete = () => (d.close(), resolve(out?.result ?? out));
    t.onerror = () => (d.close(), reject(t.error));
  });
};

/** Save a restore point. kind 'daily' keeps one per day (updated through the day); 'before' is kept as is. */
export async function savePoint(workspace, label = 'Daily', kind = 'daily', now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const json = JSON.stringify(workspace);
  const point = { id: kind === 'daily' ? `daily-${day}` : `before-${now.getTime()}`, kind, label, at: now.toISOString(), projects: Object.keys(workspace.projects || {}).length, size: json.length, data: json };
  await tx('readwrite', (s) => s.put(point));
  const all = await listPoints();
  const extra = all.slice(MAX_POINTS);
  if (extra.length) await tx('readwrite', (s) => extra.forEach((p) => s.delete(p.id)));
  return point;
}
/** Restore points, newest first (without their data). */
export async function listPoints() {
  const all = await tx('readonly', (s) => s.getAll());
  return (all || []).map(({ data, ...rest }) => rest).sort((a, b) => b.at.localeCompare(a.at));
}
export async function readPoint(id) {
  const p = await tx('readonly', (s) => s.get(id));
  if (!p) throw new Error('That restore point no longer exists');
  return JSON.parse(p.data);
}
