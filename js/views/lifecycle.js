// Lifecycle & phase gates: SDLC phases in order, mapped to PLC stages, with
// automated exit checks, a manual checklist and sign-off.
import { getProject, getEvaluation, update } from '../store.js';
import { PHASES, PLC_STAGES, METHODOLOGY_NOTES } from '../sdlc.js';
import { DOC_DEFS } from '../generators/docs.js';
import { esc, icon, $, $$, confirmDialog, toast } from '../ui/dom.js';
import { phaseStepper } from './dashboard.js';
import { sectionRoute } from './editor.js';
import { today } from '../model.js';

export function renderLifecycle(root, params) {
  const p = getProject();
  const ev = getEvaluation();
  const open = params.get('phase') || ev.current.phase.id;
  const approvers = p.stakeholders.filter((s) => s.approver);

  root.innerHTML = `
    <header class="page-head simple">
      <h1>Phases & sign-off</h1>
      <p class="lead">The project moves through these phases in order. Each phase is signed off once its checks pass.</p>
    </header>

    <section class="card">${phaseStepper(ev)}</section>

    <details class="card help-card">
      <summary>${icon('info', 15)} How these phases map to the Project Life Cycle (PLC)</summary>
      <div class="plc">${PLC_STAGES.map(
        (s) => `<div class="plc-stage"><h4>${esc(s.name)}</h4><p class="muted small">${esc(s.purpose)}</p><div class="chips">${
          PHASES.filter((ph) => ph.plc.includes(s.id))
            .map((ph) => `<span class="pill">${ph.order}. ${esc(ph.short)}</span>`)
            .join('') || '<span class="pill accent">All phases (continuous)</span>'
        }</div></div>`
      ).join('')}</div>
      <p class="small muted">${icon('info', 14)} <b>${esc(p.meta.methodology)}:</b> ${esc(METHODOLOGY_NOTES[p.meta.methodology] || '')}</p>
    </details>

    <div class="stack">
      ${ev.phases
        .map((ph) => {
          const state = ph.approved ? 'done' : ph === ev.current ? 'now' : 'todo';
          const failed = ph.rules.filter((r) => !r.passed && r.rule.severity !== 'info');
          const passed = ph.rules.filter((r) => r.passed);
          const docs = DOC_DEFS.filter((d) => ph.phase.deliverables.includes(d.id));
          const reason = ph.approved
            ? ''
            : !ph.prevApproved
              ? 'Approve the previous phase first.'
              : ph.errors.length
                ? `${ph.errors.length} blocking check${ph.errors.length === 1 ? '' : 's'} must pass first.`
                : !ph.checklistDone
                  ? 'Complete the checklist first.'
                  : '';
          return `
          <details class="card phase ${state}" ${ph.phase.id === open ? 'open' : ''} id="phase-${ph.phase.id}">
            <summary>
              <span class="phase-num">${ph.approved ? icon('check', 16) : ph.phase.order}</span>
              <span class="phase-title"><b>${esc(ph.phase.name)}</b><span class="muted small">${esc(ph.phase.plc.map((id) => PLC_STAGES.find((s) => s.id === id).name).join(' · '))}</span></span>
              <span class="phase-status">${ph.approved ? `<span class="pill ok">Approved ${esc(ph.approvedOn)}</span>` : `<span class="meter"><span style="width:${ph.readiness}%"></span></span><span class="small">${ph.readiness}%</span>`}</span>
              ${icon('chevronDown', 18, 'chev')}
            </summary>
            <div class="phase-body">
              <p>${esc(ph.phase.purpose)}</p>
              <div class="grid-2">
                <div><h4>Entry criteria</h4><ul class="plain">${ph.phase.entry.map((e) => `<li>${icon('chevron', 12)} ${esc(e)}</li>`).join('')}</ul></div>
                <div><h4>Exit criteria</h4><ul class="plain">${ph.phase.exit.map((e) => `<li>${icon('chevron', 12)} ${esc(e)}</li>`).join('')}</ul></div>
              </div>

              <h4>Automated checks <span class="muted small">${passed.length} of ${ph.rules.length} passing</span></h4>
              ${
                failed.length
                  ? `<ul class="check-list">${failed
                      .map(
                        (r) => `<li class="${r.rule.severity}"><span class="sev ${r.rule.severity}">${r.rule.severity === 'error' ? 'blocks' : 'warning'}</span>
                    <div><b>${esc(r.rule.title)}</b><ul>${r.issues.slice(0, 5).map((i) => `<li>${esc(i.message)}</li>`).join('')}${r.issues.length > 5 ? `<li class="muted">…and ${r.issues.length - 5} more</li>` : ''}</ul>
                    <a class="link small" href="${sectionRoute(r.rule.section)}">Fix ${icon('chevron', 12)}</a></div></li>`
                      )
                      .join('')}</ul>`
                  : ph.rules.length
                    ? `<p class="ok-text">${icon('check', 15)} All automated checks pass.</p>`
                    : `<p class="muted small">This phase is governed by its checklist and sign-off.</p>`
              }

              <div class="grid-2">
                <div>
                  <h4>Checklist</h4>
                  <div class="checklist">${ph.checklist
                    .map((c) => `<label class="check-row"><input type="checkbox" data-check="${ph.phase.id}:${c.id}" ${c.done ? 'checked' : ''} ${ph.approved ? 'disabled' : ''}><span>${esc(c.text)}</span></label>`)
                    .join('')}</div>
                </div>
                <div>
                  <h4>Who needs what</h4>
                  <p class="small"><b>Client:</b> ${esc(ph.phase.clientNeeds.join('; '))}.</p>
                  <p class="small"><b>Developers:</b> ${esc(ph.phase.devNeeds.join('; '))}.</p>
                  <p class="small"><b>Roles:</b> ${esc(ph.phase.roles.join(', '))}.</p>
                  ${docs.length ? `<h4>Deliverables</h4><div class="chips">${docs.map((d) => `<a class="pill link" href="#/docs/${d.id}">${icon('file', 12)} ${esc(d.title)}</a>`).join('')}</div>` : ''}
                </div>
              </div>

              <div class="signoff">
                ${
                  ph.approved
                    ? `<div class="approved">${icon('check', 18)}<div><b>Approved by ${esc(ph.approvedBy)}</b><div class="muted small">on ${esc(ph.approvedOn)}</div></div></div>
                       <button class="btn ghost sm" data-reopen="${ph.phase.id}">Reopen phase</button>`
                    : `<div class="form-inline">
                        <label class="field"><span class="label">Approved by</span>
                          <select data-approver="${ph.phase.id}">${approvers.length ? approvers.map((s) => `<option>${esc(s.name)}</option>`).join('') : '<option value="">No approvers — mark a stakeholder as approver</option>'}</select></label>
                        <label class="field"><span class="label">Date</span><input type="date" data-date="${ph.phase.id}" value="${today()}"></label>
                        <button class="btn primary" data-approve="${ph.phase.id}" ${ph.canApprove && approvers.length ? '' : 'disabled'}>${icon('check', 15)}<span>Approve phase</span></button>
                      </div>
                      ${reason ? `<p class="small muted">${icon('lock', 13)} ${esc(reason)}</p>` : ''}`
                }
              </div>
            </div>
          </details>`;
        })
        .join('')}
    </div>`;

  $$('[data-check]', root).forEach((cb) =>
    cb.addEventListener('change', () => {
      const [phase, id] = cb.dataset.check.split(':');
      update((proj) => {
        proj.gates[phase] ||= { checklist: {} };
        proj.gates[phase].checklist ||= {};
        proj.gates[phase].checklist[id] = cb.checked;
      });
    })
  );
  $$('[data-approve]', root).forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.approve;
      const by = $(`[data-approver="${id}"]`, root).value;
      const on = $(`[data-date="${id}"]`, root).value || today();
      if (!by) return toast('Choose who approved this phase.', 'err');
      update((proj) => {
        proj.gates[id] = { ...(proj.gates[id] || {}), approved: true, approvedBy: by, approvedOn: on };
      });
      toast('Phase approved');
    })
  );
  $$('[data-reopen]', root).forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.reopen;
      const idx = PHASES.findIndex((x) => x.id === id);
      const later = PHASES.slice(idx + 1).filter((x) => getProject().gates[x.id]?.approved);
      const msg = later.length
        ? `Reopening this phase also reopens ${later.map((x) => x.short).join(', ')}, because later phases depend on it.`
        : 'Reopen this phase? It will need to be approved again.';
      if (!(await confirmDialog(msg, { okLabel: 'Reopen' }))) return;
      update((proj) => {
        for (const ph of PHASES.slice(idx)) if (proj.gates[ph.id]) proj.gates[ph.id].approved = false;
      });
    })
  );
  document.getElementById(`phase-${open}`)?.scrollIntoView({ block: 'nearest' });
}
