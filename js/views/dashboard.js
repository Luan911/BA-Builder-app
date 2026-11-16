// Home: where am I, what do I do next, and quick access to the outputs.
import { getProject, getEvaluation, getSettings } from '../store.js';
import { generateDocs } from '../generators/docs.js';
import { allDiagrams } from '../generators/diagrams.js';
import { packPdf, downloadBlob } from '../export.js';
import { esc, icon, $, busy, toast } from '../ui/dom.js';
import { sectionRoute, sectionTitle } from './editor.js';
import { STEPS, stepRoute } from '../ui/steps.js';
import { stepStatus } from './build.js';

export function ring(score, size = 132) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const kind = score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'err';
  return `<svg class="ring ${kind}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Readiness ${score}%">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text">${score}%</text>
  </svg>`;
}

export function phaseStepper(ev, compact = false) {
  return `<ol class="stepper ${compact ? 'compact' : ''}">${ev.phases
    .map((ph) => {
      const state = ph.approved ? 'done' : ph === ev.current ? 'now' : 'todo';
      return `<li class="${state}"><a href="#/lifecycle?phase=${ph.phase.id}">
        <span class="step-dot">${ph.approved ? icon('check', 13) : ph.phase.order}</span>
        <span class="step-name">${esc(ph.phase.short)}</span>
        ${compact ? '' : `<span class="step-meta">${ph.approved ? 'Approved' : `${ph.readiness}% ready`}</span>`}
      </a></li>`;
    })
    .join('')}</ol>`;
}

const WHO = { client: 'Client', dev: 'Developers', ba: 'You' };

export function renderDashboard(root) {
  const p = getProject();
  const ev = getEvaluation();
  const isNew = !p.meta.name && !p.requirements.length;
  // The first step with problems is where to continue.
  const nextStep = STEPS.find((s) => stepStatus(s, ev) === 'err') || STEPS.find((s) => stepStatus(s, ev) === 'warn');
  const todo = ev.issues.filter((i) => i.rule.severity === 'error').concat(ev.issues.filter((i) => i.rule.severity === 'warning')).slice(0, 5);
  const total = ev.issues.filter((i) => i.rule.severity !== 'info').length;

  root.innerHTML = `
    <div class="home">
      <header class="home-head">
        <div>
          <h1>${esc(p.meta.name || 'New project')}</h1>
          <p class="muted">${esc([p.meta.client, `Phase ${ev.current.phase.order}: ${ev.current.phase.name}`].filter(Boolean).join(' · '))}</p>
        </div>
        <div class="home-score">${ring(ev.score, 96)}<span class="muted small">ready</span></div>
      </header>

      <section class="card continue">
        ${
          isNew
            ? `<div><h2>Let's start your project</h2><p class="muted">Answer a few questions, step by step. AutoSpec checks your answers and writes the documents and diagrams for you.</p></div>
               <a class="btn primary lg" href="${stepRoute('basics')}">Start step 1 ${icon('chevron', 16)}</a>`
            : nextStep
              ? `<div><span class="muted small">Next up</span><h2>Step ${STEPS.indexOf(nextStep) + 1}: ${esc(nextStep.title)}</h2><p class="muted">${esc(nextStep.hint)}</p></div>
                 <a class="btn primary lg" href="${stepRoute(nextStep.id)}">Continue ${icon('chevron', 16)}</a>`
              : `<div><h2>${icon('check', 20)} All steps look good</h2><p class="muted">Review your documents, then sign off each phase.</p></div>
                 <a class="btn primary lg" href="#/docs">Open documents ${icon('chevron', 16)}</a>`
        }
      </section>

      ${
        todo.length
          ? `<section class="card">
              <div class="card-head-plain"><h3>To do</h3><a class="link small" href="#/quality">See all ${total} ${icon('chevron', 12)}</a></div>
              <ul class="todo">${todo
                .map(
                  (i) => `<li><a href="${sectionRoute(i.rule.section)}">
                    <span class="fix-dot ${i.rule.severity === 'error' ? 'err' : 'warn'}"></span>
                    <span class="todo-text">${esc(i.message)}</span>
                    <span class="who">${WHO[i.rule.audience]}</span>
                    ${icon('chevron', 15, 'go')}</a></li>`
                )
                .join('')}</ul>
            </section>`
          : ''
      }

      <div class="quick">
        <a class="quick-card" href="#/docs">${icon('file', 20)}<span><b>Documents</b><small>10 ready-made documents</small></span></a>
        <a class="quick-card" href="#/diagrams">${icon('shapes', 20)}<span><b>Diagrams</b><small>Drawn from your data</small></span></a>
        <button class="quick-card" data-pack>${icon('download', 20)}<span><b>Download PDF pack</b><small>Everything in one file</small></span></button>
      </div>
    </div>`;

  $('[data-pack]', root).addEventListener('click', (e) =>
    busy(e.currentTarget, 'Building PDF…', async (progress) => {
      downloadBlob(await packPdf(generateDocs(p, ev), allDiagrams(p, ev, { lanes: getSettings().lanes }), p, getSettings(), progress), `${(p.meta.code || 'Project').replace(/\W+/g, '')}_Documentation_Pack.pdf`);
      toast('PDF downloaded');
    })
  );
  void sectionTitle;
}
