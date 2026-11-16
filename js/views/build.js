// "Build your spec": the guided wizard. One step at a time, Back / Next.
import { getEvaluation } from '../store.js';
import { STEPS, stepIndex, stepRoute } from '../ui/steps.js';
import { PAGES } from '../ui/schema.js';
import { esc, icon } from '../ui/dom.js';
import { renderProject, renderSection, fixBox } from './editor.js';

/** Status of a step: 'ok' (no problems), 'warn' or 'err' (has problems). */
export function stepStatus(step, ev) {
  const iss = ev.issues.filter((i) => step.sections.includes(i.rule.section) && i.rule.severity !== 'info');
  if (iss.some((i) => i.rule.severity === 'error')) return 'err';
  return iss.length ? 'warn' : 'ok';
}

export function renderBuild(root, stepId) {
  const ev = getEvaluation();
  const i = stepIndex(stepId);
  const step = STEPS[i];
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  const done = STEPS.filter((s) => stepStatus(s, ev) === 'ok').length;

  root.innerHTML = `
    <div class="wizard">
      <nav class="wiz-steps" aria-label="Steps">
        ${STEPS.map((s, k) => {
          const st = stepStatus(s, ev);
          return `<a href="${stepRoute(s.id)}" class="wiz-step ${k === i ? 'current' : ''} ${st}" ${k === i ? 'aria-current="step"' : ''} title="${esc(s.title)}">
            <span class="wiz-num">${st === 'ok' && k !== i ? icon('check', 12) : k + 1}</span><span class="wiz-label">${esc(s.title)}</span></a>`;
        }).join('')}
      </nav>
      <div class="wiz-progress"><span style="width:${Math.round((done / STEPS.length) * 100)}%"></span></div>

      <header class="wiz-head">
        <div class="muted small">Step ${i + 1} of ${STEPS.length}</div>
        <h1>${esc(step.title)}</h1>
        <p class="lead">${esc(step.hint)}</p>
        <div data-fixbox>${fixBox(step.sections, ev)}</div>
      </header>

      <div class="wiz-body">${step.sections.map((s) => `<div data-sec="${s}"></div>`).join('')}</div>

      <footer class="wiz-foot">
        ${prev ? `<a class="btn" href="${stepRoute(prev.id)}">${icon('chevronLeft', 15)}<span>Back</span></a>` : '<span></span>'}
        ${next ? `<a class="btn primary" href="${stepRoute(next.id)}"><span>Next: ${esc(next.title)}</span>${icon('chevron', 15)}</a>` : `<a class="btn primary" href="#/docs"><span>See your documents</span>${icon('chevron', 15)}</a>`}
      </footer>
    </div>`;

  for (const s of step.sections) {
    const el = root.querySelector(`[data-sec="${s}"]`);
    if (s === 'project') renderProject(el);
    else renderSection(el, s, { showTitle: step.sections.length > 1 });
  }
}
