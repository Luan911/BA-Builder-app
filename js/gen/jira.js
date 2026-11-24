// Jira round trip: export stories / requirements as a Jira CSV import file, and read a Jira CSV export
// back to update status, priority, story points and issue keys (and add issues created in Jira).
import { COLLECTIONS, uid, ensureCode, nameOf, byId } from '../model.js';
import { csv, parseCsv } from './exports.js';

export const PRIORITY_TO_JIRA = { Must: 'High', Should: 'Medium', Could: 'Low', "Won't": 'Lowest' };
const STORY_TO_JIRA = { Backlog: 'Backlog', Ready: 'Selected for Development', 'In progress': 'In Progress', 'In review': 'In Review', Done: 'Done' };
const REQ_TO_JIRA = { Draft: 'To Do', Proposed: 'To Do', Approved: 'To Do', Implemented: 'Done', Rejected: "Won't Do" };
const POINTS = ['1', '2', '3', '5', '8', '13', '21'];
export const ID_LABEL = 'babid_';

/** Jira priority → MoSCoW. */
export function priorityFromJira(v) {
  const s = String(v || '').toLowerCase();
  if (/highest|blocker|critical|high|^p1|^p2/.test(s)) return 'Must';
  if (/medium|normal|major|^p3/.test(s)) return 'Should';
  if (/lowest|trivial|^p5/.test(s)) return "Won't";
  if (/low|minor|^p4/.test(s)) return 'Could';
  return '';
}
/** Jira status → story status. */
export function storyStatusFromJira(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return '';
  if (/won't|wont|cancel/.test(s)) return '';
  if (/done|closed|resolved|complete|released|accepted/.test(s)) return 'Done';
  if (/review|qa|test|verif/.test(s)) return 'In review';
  if (/selected|ready|refined|groomed|approved/.test(s)) return 'Ready';
  if (/progress|doing|develop|build|implement/.test(s)) return 'In progress';
  return 'Backlog';
}
function reqStatusFromJira(v) {
  const s = String(v || '').toLowerCase();
  if (/won't|wont|reject|cancel|duplicate/.test(s)) return 'Rejected';
  if (/done|closed|resolved|complete|released/.test(s)) return 'Implemented';
  return '';
}
function defectStatusFromJira(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return '';
  if (/won't|wont|reject|not a bug|cannot reproduce|duplicate/.test(s)) return 'Rejected';
  if (/resolved|fixed|ready for (re)?test|retest/.test(s)) return 'Fixed — ready to retest';
  if (/done|closed/.test(s)) return 'Closed';
  if (/progress|doing|develop/.test(s)) return 'In progress';
  if (/defer|later|backlog/.test(s)) return 'Deferred';
  return 'Open';
}
const nearestPoints = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (!String(v ?? '').trim() || !Number.isFinite(n) || n <= 0) return '';
  return POINTS.reduce((best, x) => (Math.abs(+x - n) < Math.abs(+best - n) ? x : best), POINTS[0]);
};

/** "to enter the amount" → "Enter the amount" (a Jira summary is at most 255 characters). */
export function storySummary(s) {
  const w = String(s.iWant || '').trim().replace(/^to\s+/i, '');
  const t = w ? w[0].toUpperCase() + w.slice(1) : `Story ${s.code || ''}`.trim();
  return t.length > 250 ? `${t.slice(0, 247)}…` : t;
}
const acText = (list) => (list || []).filter((a) => a.given || a.when || a.then).map((a, i) => `*Scenario ${i + 1}*\n* *Given* ${a.given || '…'}\n* *When* ${a.when || '…'}\n* *Then* ${a.then || '…'}`).join('\n');

/**
 * Jira CSV import file. opts: { stories: true, reqTypes: ['Functional', …] }.
 * Each row has an Issue Id; stories point to their epic with Parent. Labels carry the BA Builder ID
 * (babid_US-001) so a Jira export can be matched back to the right item.
 */
export function jiraCsv(p, opts = {}) {
  const { stories = true, reqTypes = ['Functional'] } = opts;
  const rows = [];
  let n = 0;
  const epicId = {};
  const storyList = stories ? p.stories : [];
  for (const e of [...new Set(storyList.map((s) => s.epic).filter(Boolean))]) {
    epicId[e] = String(++n);
    rows.push({ id: epicId[e], parent: '', type: 'Epic', summary: e, description: `Epic for: ${e}`, priority: '', points: '', status: '', fix: '', epicName: e, epicLink: '', labels: [], code: '' });
  }
  const reqCode = (id) => { const r = byId(p.requirements, id); return r ? `${r.code} ${r.title}` : ''; };
  for (const s of storyList) {
    const desc = [`*As a* ${nameOf(p.personas, s.asA) || 'user'}, *I want* ${s.iWant || '…'}${s.soThat ? `, *so that* ${s.soThat}` : ''}.`];
    if ((s.acceptance || []).length) desc.push(`h3. Acceptance criteria\n${acText(s.acceptance)}`);
    if ((s.requirementIds || []).length) desc.push(`*Implements:* ${s.requirementIds.map(reqCode).filter(Boolean).join('; ')}`);
    desc.push(`_From BA Builder: ${s.code}_`);
    rows.push({ id: String(++n), parent: s.epic ? epicId[s.epic] : '', type: 'Story', summary: storySummary(s), description: desc.join('\n\n'), priority: PRIORITY_TO_JIRA[s.priority] || '', points: s.points || '', status: STORY_TO_JIRA[s.status] || '', fix: nameOf(p.releases || [], s.release) || '', epicName: '', epicLink: s.epic || '', labels: [`${ID_LABEL}${s.code}`], code: s.code });
  }
  for (const r of p.requirements.filter((x) => reqTypes.includes(x.type))) {
    const desc = [r.statement || ''];
    if (r.rationale) desc.push(`*Rationale:* ${r.rationale}`);
    if (r.metric) desc.push(`*Measure:* ${r.metric}`);
    if ((r.acceptance || []).length) desc.push(`h3. Acceptance criteria\n${acText(r.acceptance)}`);
    desc.push(`_From BA Builder: ${r.code} (${r.type} requirement)_`);
    rows.push({ id: String(++n), parent: '', type: 'Task', summary: `${r.code} ${r.title || ''}`.trim().slice(0, 250), description: desc.filter(Boolean).join('\n\n'), priority: PRIORITY_TO_JIRA[r.priority] || '', points: '', status: REQ_TO_JIRA[r.status] || '', fix: nameOf(p.releases || [], r.release) || '', epicName: '', epicLink: '', labels: [`${ID_LABEL}${r.code}`, 'requirement', String(r.type || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')], code: r.code });
  }
  const nLabels = Math.max(1, ...rows.map((r) => r.labels.length));
  const head = ['Issue Id', 'Parent', 'Issue Type', 'Summary', 'Description', 'Priority', 'Story Points', 'Status', 'Fix Version', 'Epic Name', 'Epic Link', 'BA Builder ID', ...Array(nLabels).fill('Labels')];
  return csv(head, rows.map((r) => [r.id, r.parent, r.type, r.summary, r.description, r.priority, r.points, r.status, r.fix, r.epicName, r.epicLink, r.code, ...Array.from({ length: nLabels }, (_, i) => r.labels[i] || '')]));
}

/** Read a Jira CSV (from Jira's "Export → CSV", or a file made by jiraCsv) into plain issue objects. */
export function readJiraCsv(text) {
  const [head, ...rows] = parseCsv(String(text || '').replace(/^﻿/, ''));
  if (!head) throw new Error('The file is empty');
  const h = head.map((x) => x.trim().toLowerCase());
  const one = (...names) => { const i = h.findIndex((x) => names.includes(x)); return i; };
  const all = (...names) => h.map((x, i) => (names.includes(x) ? i : -1)).filter((i) => i >= 0);
  const col = {
    key: one('issue key', 'key'), summary: one('summary'), type: one('issue type', 'issuetype', 'type'), status: one('status'), priority: one('priority'),
    description: one('description'), points: one('custom field (story points)', 'story points', 'custom field (story point estimate)', 'story point estimate'),
    babId: one('ba builder id', 'custom field (ba builder id)'), parentSummary: one('parent summary', 'custom field (epic name)', 'epic link', 'epic name'),
    labels: all('labels'),
  };
  if (col.summary < 0 && col.key < 0) throw new Error('This does not look like a Jira CSV — no "Summary" or "Issue key" column');
  const get = (r, i) => (i >= 0 ? String(r[i] ?? '').trim() : '');
  return rows.map((r) => ({
    key: get(r, col.key), summary: get(r, col.summary), type: get(r, col.type), status: get(r, col.status), priority: get(r, col.priority),
    description: get(r, col.description), points: get(r, col.points), parentSummary: get(r, col.parentSummary),
    babId: get(r, col.babId) || (col.labels.map((i) => get(r, i)).find((l) => l.startsWith(ID_LABEL)) || '').slice(ID_LABEL.length),
  })).filter((x) => x.key || x.summary);
}

const KEYS = ['stories', 'requirements', 'defects'];
const low = (s) => String(s || '').trim().toLowerCase();

/** Work out what an import would change, without changing anything. */
export function planJiraImport(p, issues) {
  const updates = [], creates = [];
  let unchanged = 0, skipped = 0;
  const find = (x) => {
    for (const k of KEYS) {
      const it = x.babId && p[k].find((y) => y.code === x.babId);
      if (it) return [k, it];
    }
    for (const k of KEYS) {
      const it = x.key && p[k].find((y) => y.jiraKey && low(y.jiraKey) === low(x.key));
      if (it) return [k, it];
    }
    const s = low(x.summary);
    if (s) {
      const st = p.stories.find((y) => low(storySummary(y)) === s || low(y.iWant) === s);
      if (st) return ['stories', st];
      const rq = p.requirements.find((y) => low(y.title) === s || low(`${y.code} ${y.title}`) === s);
      if (rq) return ['requirements', rq];
      const df = p.defects.find((y) => low(y.title) === s);
      if (df) return ['defects', df];
    }
    return [null, null];
  };
  for (const x of issues) {
    const isEpic = /epic/i.test(x.type);
    const [k, it] = isEpic ? [null, null] : find(x);
    if (it) {
      const patch = {};
      if (x.key && it.jiraKey !== x.key) patch.jiraKey = x.key;
      const pri = priorityFromJira(x.priority);
      if (k === 'stories') {
        const st = storyStatusFromJira(x.status);
        if (st && st !== it.status) patch.status = st;
        const pts = nearestPoints(x.points);
        if (pts && pts !== String(it.points || '')) patch.points = pts;
        if (pri && pri !== it.priority) patch.priority = pri;
      } else if (k === 'requirements') {
        const st = reqStatusFromJira(x.status);
        if (st && st !== it.status) patch.status = st;
        if (pri && pri !== it.priority) patch.priority = pri;
      } else {
        const st = defectStatusFromJira(x.status);
        if (st && st !== it.status) patch.status = st;
      }
      if (Object.keys(patch).length) updates.push({ key: k, id: it.id, code: it.code, patch });
      else unchanged++;
      continue;
    }
    if (isEpic || !x.summary) { skipped++; continue; }
    if (/bug|defect/i.test(x.type)) {
      creates.push({ key: 'defects', item: { title: x.summary, actual: x.description, expected: '', severity: 'Medium', status: defectStatusFromJira(x.status) || 'Open', jiraKey: x.key } });
    } else {
      creates.push({ key: 'stories', item: { iWant: x.summary.replace(/^./, (c) => c.toLowerCase()), epic: x.parentSummary, status: storyStatusFromJira(x.status) || 'Backlog', points: nearestPoints(x.points), priority: priorityFromJira(x.priority) || 'Should', jiraKey: x.key } });
    }
  }
  return { updates, creates, unchanged, skipped };
}

/** Apply a plan to a (mutable) project. Returns the number of items touched. */
export function applyJiraImport(pr, plan) {
  let n = 0;
  for (const u of plan.updates) {
    const it = pr[u.key].find((y) => y.id === u.id);
    if (it) Object.assign(it, u.patch), n++;
  }
  for (const c of plan.creates) {
    const base = COLLECTIONS[c.key].defaults ? COLLECTIONS[c.key].defaults() : {};
    const it = { id: uid(c.key.slice(0, 3)), ...base, ...Object.fromEntries(Object.entries(c.item).filter(([, v]) => v !== '' && v != null)) };
    ensureCode(c.key, it, pr[c.key]);
    pr[c.key].push(it);
    n++;
  }
  return n;
}

/** One-line description of a plan, for the confirmation box. */
export function describePlan(plan) {
  const parts = [];
  if (plan.updates.length) parts.push(`update ${plan.updates.length} item${plan.updates.length === 1 ? '' : 's'} (${[...new Set(plan.updates.flatMap((u) => Object.keys(u.patch)))].map((f) => ({ jiraKey: 'Jira keys', status: 'status', points: 'story points', priority: 'priority' })[f]).join(', ')})`);
  if (plan.creates.length) parts.push(`add ${plan.creates.length} new (${['stories', 'defects'].map((k) => { const c = plan.creates.filter((x) => x.key === k).length; return c ? `${c} ${k === 'stories' ? (c === 1 ? 'story' : 'stories') : c === 1 ? 'defect' : 'defects'}` : ''; }).filter(Boolean).join(', ')})`);
  if (plan.unchanged) parts.push(`${plan.unchanged} already up to date`);
  if (plan.skipped) parts.push(`${plan.skipped} skipped (epics)`);
  return parts.join('; ') || 'Nothing to change';
}
