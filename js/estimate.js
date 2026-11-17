// Cost and time estimation: three-point (PERT) effort, day rates, a phase schedule on a
// working-day calendar, and a story-point forecast. Pure functions, so they can be unit tested.

export const PHASES = ['Analysis', 'Design', 'Build', 'Test', 'Deploy', 'Project management', 'Other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- dates (local calendar, never UTC, so days do not shift) ----------
export const isDate = (s) => {
  if (!DATE_RE.test(s || '')) return false;
  const d = parseDate(s);
  return toIso(d) === s; // rejects 2027-02-30 etc.
};
export function parseDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Is this a working day? `workDays` = weekdays worked (0 = Sunday … 6 = Saturday). */
export function isWorkDay(d, holidays = [], workDays = [1, 2, 3, 4, 5]) {
  return workDays.includes(d.getDay()) && !holidays.includes(toIso(d));
}

/**
 * The date on which `n` working days of work finish when work starts on `start`.
 * The start day counts as day 1 when it is a working day. n ≤ 0 → the start date.
 * Fractions round up (2.1 days still needs a third day).
 */
export function addWorkingDays(start, n, holidays = [], workDays = [1, 2, 3, 4, 5]) {
  if (!isDate(start)) return '';
  if (!workDays.length) return '';
  const d = parseDate(start);
  let left = Math.ceil(Math.max(0, +n || 0));
  if (left === 0) return start;
  for (let guard = 0; guard < 100000; guard++) {
    if (isWorkDay(d, holidays, workDays) && --left === 0) return toIso(d);
    d.setDate(d.getDate() + 1);
  }
  return '';
}

/** Working days from `a` to `b`, both included. 0 if b is before a. */
export function workingDaysBetween(a, b, holidays = [], workDays = [1, 2, 3, 4, 5]) {
  if (!isDate(a) || !isDate(b) || b < a) return 0;
  const d = parseDate(a);
  let n = 0;
  for (let guard = 0; guard < 100000 && toIso(d) <= b; guard++) {
    if (isWorkDay(d, holidays, workDays)) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

/** Calendar days from a to b (b − a). */
export function daysBetween(a, b) {
  if (!isDate(a) || !isDate(b)) return 0;
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

// ---------- three-point estimates ----------
/** PERT expected value and standard deviation for optimistic / most likely / pessimistic. */
export function pert(o, m, p) {
  let a = +o || 0, ml = +m || 0, b = +p || 0;
  if (!ml) ml = a || b; // only one number given → treat as the estimate
  if (!a) a = ml;
  if (!b) b = ml;
  const lo = Math.min(a, ml, b), hi = Math.max(a, ml, b);
  return { expected: (lo + 4 * ml + hi) / 6, sd: (hi - lo) / 6 };
}

// z-scores for the one-sided confidence levels shown in the estimate
export const Z = { 50: 0, 80: 0.8416, 90: 1.2816, 95: 1.6449 };

/** Whole estimate for a project. */
export function estimate(p) {
  const s = { startDate: '', contingency: 15, hoursPerDay: 8, workDays: [1, 2, 3, 4, 5], holidays: [], velocity: 0, sprintWeeks: 2, ...(p.estimate || {}) };
  const holidays = (Array.isArray(s.holidays) ? s.holidays : String(s.holidays || '').split(/[\s,]+/)).filter(isDate);
  const workDays = (s.workDays || []).map(Number).filter((n) => n >= 0 && n <= 6);
  const rateOf = (id) => p.rates.find((r) => r.id === id);
  const warnings = [];

  const items = p.workItems.map((w) => {
    const { expected, sd } = pert(w.optimistic, w.likely, w.pessimistic);
    const rate = rateOf(w.role);
    const dayRate = +rate?.dayRate || 0;
    if (!rate) warnings.push(`${w.code || w.item}: no role chosen, so it has no cost`);
    if (+w.optimistic && +w.pessimistic && +w.optimistic > +w.pessimistic) warnings.push(`${w.code || w.item}: optimistic is larger than pessimistic`);
    return { ...w, expected, sd, variance: sd * sd, dayRate, cost: expected * dayRate, costSd: sd * dayRate };
  });

  const effort = items.reduce((a, w) => a + w.expected, 0);
  const effortSd = Math.sqrt(items.reduce((a, w) => a + w.variance, 0)); // independent tasks: variances add
  const labour = items.reduce((a, w) => a + w.cost, 0);
  const costSd = Math.sqrt(items.reduce((a, w) => a + w.costSd * w.costSd, 0));
  const cont = Math.max(0, +s.contingency || 0) / 100;
  const total = labour * (1 + cont);
  const confidence = Object.fromEntries(Object.entries(Z).map(([k, z]) => [k, { effort: effort + z * effortSd, cost: (labour + z * costSd) * (1 + cont) }]));

  // Schedule: phases run one after another; inside a phase each role works in parallel,
  // so a phase lasts as long as its busiest role (effort ÷ people in that role).
  const phases = [];
  for (const ph of PHASES) {
    const list = items.filter((w) => (w.phase || 'Other') === ph);
    if (!list.length) continue;
    const byRole = new Map();
    for (const w of list) byRole.set(w.role || '', (byRole.get(w.role || '') || 0) + w.expected);
    let days = 0;
    for (const [roleId, e] of byRole) {
      const fte = Math.max(0, +rateOf(roleId)?.fte || 0) || 1;
      days = Math.max(days, e / fte);
    }
    phases.push({ phase: ph, effort: list.reduce((a, w) => a + w.expected, 0), days: Math.ceil(days - 1e-9), cost: list.reduce((a, w) => a + w.cost, 0) });
  }
  let cursor = isDate(s.startDate) ? s.startDate : '';
  for (const ph of phases) {
    ph.start = cursor ? addWorkingDays(cursor, 1, holidays, workDays) : '';
    ph.end = cursor ? addWorkingDays(ph.start, ph.days, holidays, workDays) : '';
    if (ph.end) {
      const next = parseDate(ph.end);
      next.setDate(next.getDate() + 1);
      cursor = toIso(next);
    }
  }
  const durationDays = phases.reduce((a, ph) => a + ph.days, 0);
  const endDate = phases.length && phases[phases.length - 1].end ? phases[phases.length - 1].end : '';
  if (!isDate(s.startDate) && items.length) warnings.push('Set a start date to calculate the finish date');
  const deadline = p.charter?.deadline;
  const late = !!(endDate && isDate(deadline) && endDate > deadline);
  if (late) warnings.push(`The estimated finish (${endDate}) is after the target date (${deadline})`);

  // Agile forecast from open story points and team velocity.
  const openPoints = p.stories.filter((x) => !['Done', 'Accepted'].includes(x.status)).reduce((a, x) => a + (+x.points || 0), 0);
  const velocity = Math.max(0, +s.velocity || 0);
  const sprints = velocity ? Math.ceil(openPoints / velocity) : 0;
  const sprintWeeks = Math.max(1, +s.sprintWeeks || 2);
  let agileEnd = '';
  if (velocity && isDate(s.startDate) && openPoints) {
    const d = parseDate(s.startDate);
    d.setDate(d.getDate() + sprints * sprintWeeks * 7 - 1);
    agileEnd = toIso(d);
  }

  return { settings: { ...s, holidays, workDays }, items, effort, effortSd, labour, contingency: cont, total, confidence, phases, durationDays, startDate: isDate(s.startDate) ? s.startDate : '', endDate, deadline, late, openPoints, velocity, sprints, sprintWeeks, agileEnd, warnings, hours: effort * (+s.hoursPerDay || 8) };
}
