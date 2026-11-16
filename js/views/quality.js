// Quality check: every automated rule, its result, why it matters and where to fix it.
import { getEvaluation } from '../store.js';
import { PHASES } from '../sdlc.js';
import { esc, icon, $$ } from '../ui/dom.js';
import { sectionRoute, sectionTitle } from './editor.js';

export function renderQuality(root, params) {
  const ev = getEvaluation();
  const sev = params.get('sev') || 'all';
  const aud = params.get('who') || 'all';
  const counts = { error: 0, warning: 0, info: 0 };
  for (const r of ev.results) if (!r.passed && !r.na) counts[r.rule.severity]++;
  const show = (r) => (sev === 'all' || r.rule.severity === sev) && (aud === 'all' || r.rule.audience === aud);
  const link = (s, w) => `#/quality?sev=${s}&who=${w}`;
  const AUD = { client: 'Client', dev: 'Delivery team', ba: 'Analyst' };

  root.innerHTML = `
    <header class="page-head">
      <div class="eyebrow">Outputs</div>
      <h1>All checks</h1>
      <p class="lead">${ev.results.length} rules check the project against SDLC good practice (IEEE 29148 requirement quality, BABOK traceability, MoSCoW, RACI, RAID). Errors block a phase gate; warnings should be fixed; info is advice.</p>
    </header>
    <div class="stats">
      <div class="stat"><span class="stat-num">${ev.score}%</span><span class="stat-label">Readiness</span></div>
      <a class="stat" href="${link('error', aud)}"><span class="stat-num err">${counts.error}</span><span class="stat-label">Blocking</span></a>
      <a class="stat" href="${link('warning', aud)}"><span class="stat-num warn">${counts.warning}</span><span class="stat-label">Warnings</span></a>
      <a class="stat" href="${link('info', aud)}"><span class="stat-num">${counts.info}</span><span class="stat-label">Advice</span></a>
      <div class="stat"><span class="stat-num ok">${ev.results.filter((r) => r.passed).length}</span><span class="stat-label">Passing</span></div>
      <div class="stat"><span class="stat-num">${ev.results.filter((r) => r.na).length}</span><span class="stat-label">Not yet applicable</span></div>
    </div>
    <div class="filters">
      <span class="muted small">Severity</span>
      ${['all', 'error', 'warning', 'info'].map((s) => `<a class="chip ${sev === s ? 'on' : ''}" href="${link(s, aud)}">${s === 'all' ? 'All' : s}</a>`).join('')}
      <span class="muted small">Who acts</span>
      ${['all', 'client', 'dev', 'ba'].map((w) => `<a class="chip ${aud === w ? 'on' : ''}" href="${link(sev, w)}">${w === 'all' ? 'Everyone' : AUD[w]}</a>`).join('')}
    </div>
    ${PHASES.map((ph) => {
      const rules = ev.results.filter((r) => r.rule.phase === ph.id);
      const failing = rules.filter((r) => !r.passed && !r.na && show(r));
      const passing = rules.filter((r) => r.passed && (aud === 'all' || r.rule.audience === aud));
      if (!rules.length) return '';
      return `<section class="card">
        <h2 class="card-title">${ph.order}. ${esc(ph.name)} <span class="muted small">${failing.length} open · ${passing.length} passing</span></h2>
        ${
          failing.length
            ? `<ul class="check-list">${failing
                .map(
                  (r) => `<li class="${r.rule.severity}"><span class="sev ${r.rule.severity}">${r.rule.severity}</span><div>
                  <b>${esc(r.rule.title)}</b> <span class="pill">${AUD[r.rule.audience]}</span>
                  <p class="muted small">${esc(r.rule.why)}</p>
                  <ul>${r.issues.map((i) => `<li>${esc(i.message)}</li>`).join('')}</ul>
                  <a class="link small" href="${sectionRoute(r.rule.section)}">Fix in ${esc(sectionTitle(r.rule.section))} ${icon('chevron', 12)}</a></div></li>`
                )
                .join('')}</ul>`
            : `<p class="ok-text">${icon('check', 15)} Nothing open here${sev !== 'all' || aud !== 'all' ? ' for this filter' : ''}.</p>`
        }
        ${passing.length ? `<details class="passing"><summary class="small muted">Show ${passing.length} passing check${passing.length === 1 ? '' : 's'}</summary><ul class="plain small">${passing.map((r) => `<li>${icon('check', 13)} ${esc(r.rule.title)}</li>`).join('')}</ul></details>` : ''}
      </section>`;
    }).join('')}`;
  void $$;
}
