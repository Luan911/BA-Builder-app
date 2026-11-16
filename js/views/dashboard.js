// Dashboard: readiness, current phase, next actions per audience, key numbers.
import { getProject, getEvaluation } from '../store.js';
import { nextActions, dorGaps } from '../rules.js';
import { riskRating } from '../model.js';
import { esc, icon } from '../ui/dom.js';
import { sectionRoute, sectionTitle } from './editor.js';

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

function actionColumn(title, iconName, items, who) {
  return `<section class="card action-col">
    <h3>${icon(iconName, 16)} ${esc(title)} <span class="count">${items.length}</span></h3>
    ${
      items.length
        ? `<ul class="actions">${items
            .map((i) => `<li><span class="sev-bar ${i.rule.severity}"></span><div><p>${esc(i.message)}</p><a href="${sectionRoute(i.rule.section)}" class="link small">Fix in ${esc(sectionTitle(i.rule.section))} ${icon('chevron', 12)}</a></div></li>`)
            .join('')}</ul>`
        : `<p class="muted small">${icon('check', 14)} Nothing outstanding for the ${esc(who)}.</p>`
    }
  </section>`;
}

export function renderDashboard(root) {
  const p = getProject();
  const ev = getEvaluation();
  const na = nextActions(ev, 6);
  const reqs = p.requirements.filter((r) => r.status !== 'Rejected');
  const ready = reqs.filter((r) => !dorGaps(p, r).length).length;
  const tests = reqs.reduce((n, r) => n + r.acceptance.length, 0);
  const highRisks = p.risks.filter((r) => r.status !== 'Closed' && riskRating(r) === 'High').length;
  const openQ = p.questions.filter((q) => q.status !== 'Answered').length;
  const cur = ev.current;
  const empty = !p.meta.name && !reqs.length;

  root.innerHTML = `
    ${
      empty
        ? `<section class="card hero-empty">
            <h1>Start a new project</h1>
            <p class="lead">Work through the phases in order. AutoSpec checks every step and writes the documents and diagrams for you.</p>
            <div class="row gap"><a class="btn primary" href="#/project">${icon('flag', 16)}<span>Set up the project</span></a><a class="btn" href="#/import">${icon('upload', 16)}<span>Import notes, code or a spreadsheet</span></a></div>
          </section>`
        : ''
    }
    <section class="hero card">
      <div class="hero-main">
        <div class="eyebrow">${esc(p.meta.client || 'Project')} ${p.meta.code ? `· ${esc(p.meta.code)}` : ''} · ${esc(p.meta.methodology)}</div>
        <h1>${esc(p.meta.name || 'Untitled project')}</h1>
        <p class="lead">${esc(p.meta.summary || 'Add an executive summary on the Project & scope page.')}</p>
        <div class="current-phase">
          <span class="muted small">Current phase</span>
          <strong>${cur.phase.order}. ${esc(cur.phase.name)}</strong>
          <span class="pill ${cur.errors.length ? 'err' : 'ok'}">${cur.errors.length ? `${cur.errors.length} blocking check${cur.errors.length === 1 ? '' : 's'}` : 'No blockers'}</span>
          <a class="btn sm" href="#/lifecycle?phase=${cur.phase.id}">Open phase gate ${icon('chevron', 14)}</a>
        </div>
      </div>
      <div class="hero-score">${ring(ev.score)}<span class="muted small">Overall readiness</span></div>
    </section>

    <section class="card">${phaseStepper(ev)}</section>

    <h2 class="section-title">Next actions</h2>
    <div class="grid-3">
      ${actionColumn('Client needs to provide', 'users', na.client, 'client')}
      ${actionColumn('Delivery team needs', 'code', na.dev, 'delivery team')}
      ${actionColumn('Business analysis to do', 'list', na.ba, 'analyst')}
    </div>

    <h2 class="section-title">At a glance</h2>
    <div class="stats">
      <a class="stat" href="#/s/requirements"><span class="stat-num">${reqs.length}</span><span class="stat-label">Requirements</span><span class="stat-sub">${reqs.filter((r) => r.priority === 'Must').length} Must-have</span></a>
      <a class="stat" href="#/docs/stories"><span class="stat-num">${ready}<small>/${reqs.length}</small></span><span class="stat-label">Stories ready</span><span class="stat-sub">Definition of Ready</span></a>
      <a class="stat" href="#/docs/testplan"><span class="stat-num">${tests}</span><span class="stat-label">Test cases</span><span class="stat-sub">from acceptance criteria</span></a>
      <a class="stat" href="#/s/entities"><span class="stat-num">${p.entities.length}</span><span class="stat-label">Data entities</span><span class="stat-sub">${p.relationships.length} relationships</span></a>
      <a class="stat" href="#/s/raid"><span class="stat-num ${highRisks ? 'err' : ''}">${p.risks.filter((r) => r.status !== 'Closed').length}</span><span class="stat-label">Open risks</span><span class="stat-sub">${highRisks} high</span></a>
      <a class="stat" href="#/s/decisions"><span class="stat-num ${openQ ? 'warn' : ''}">${openQ}</span><span class="stat-label">Open questions</span><span class="stat-sub">${p.decisions.length} decisions logged</span></a>
    </div>

    <h2 class="section-title">Outputs</h2>
    <div class="grid-3">
      <a class="card link-card" href="#/docs">${icon('file', 22)}<div><h3>Documents</h3><p class="muted small">Charter, BRD, SRS, stories, RTM, test plan, design, RAID, deployment, gate report.</p></div></a>
      <a class="card link-card" href="#/diagrams">${icon('shapes', 22)}<div><h3>Diagrams</h3><p class="muted small">Process, sequence, ERD, architecture, use cases, lifecycle and roadmap.</p></div></a>
      <a class="card link-card" href="#/quality">${icon('shield', 22)}<div><h3>Quality check</h3><p class="muted small">${ev.issues.filter((i) => i.rule.severity !== 'info').length} open findings across ${ev.results.length} automated checks.</p></div></a>
    </div>`;
}
