// Diagram studio: write any Mermaid diagram from BA templates with live preview. Saved in the project.
import { project, update } from '../store.js';
import { esc, $, toast, download, fileSafe, confirmBox } from '../ui.js';
import { render, sized, svgToPng } from '../mermaid.js';
import { uid } from '../model.js';

export const TEMPLATES = {
  'Flowchart': 'flowchart TD\n  A([Start]) --> B[Capture request]\n  B --> C{Valid?}\n  C -->|Yes| D[Process request]\n  C -->|No| E[Return to requester]\n  D --> F([End])\n  E --> B',
  'BPMN-style swimlanes': 'flowchart LR\n  subgraph Customer\n    A((Start)) --> B(Submit order)\n  end\n  subgraph Sales\n    C(Check stock) --> D{In stock?}\n  end\n  subgraph Warehouse\n    E(Pick and pack) --> F(((Shipped)))\n  end\n  B --> C\n  D -->|Yes| E\n  D -->|No| G(((Back-ordered)))',
  'Sequence': 'sequenceDiagram\n  autonumber\n  actor U as User\n  participant W as Web app\n  participant A as API\n  participant D as Database\n  U->>W: Submit form\n  W->>A: POST /orders\n  A->>D: INSERT order\n  D-->>A: id\n  A-->>W: 201 Created\n  W-->>U: Confirmation\n  alt Validation fails\n    A-->>W: 400 Bad Request\n  end',
  'Use case': 'flowchart LR\n  U[👤 Customer]\n  subgraph System\n    UC1([Place order])\n    UC2([Track order])\n    UC3([Pay online])\n  end\n  P[⚙ Payment gateway]\n  U --- UC1\n  U --- UC2\n  UC1 -.->|include| UC3\n  UC3 --- P',
  'Class': 'classDiagram\n  class Customer {\n    +uuid id\n    +string name\n    +placeOrder()\n  }\n  class Order {\n    +uuid id\n    +date placedOn\n    +decimal total()\n  }\n  class OrderLine {\n    +int quantity\n  }\n  Customer "1" --> "*" Order : places\n  Order "1" *-- "*" OrderLine',
  'Entity relationship': 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  ORDER ||--|{ ORDER_LINE : contains\n  PRODUCT ||--o{ ORDER_LINE : "ordered in"\n  CUSTOMER {\n    uuid id PK\n    string email UK\n  }\n  ORDER {\n    uuid id PK\n    uuid customer_id FK\n    date placed_on\n  }',
  'State machine': 'stateDiagram-v2\n  [*] --> Draft\n  Draft --> Submitted : submit\n  Submitted --> Approved : approve\n  Submitted --> Rejected : reject\n  Approved --> Closed : complete\n  Rejected --> [*]\n  Closed --> [*]',
  'Activity with fork': 'flowchart TD\n  S((Start)) --> A[Receive claim]\n  A --> F{{Fork}}\n  F --> B[Verify policy]\n  F --> C[Assess damage]\n  B --> J{{Join}}\n  C --> J\n  J --> D{Approve?}\n  D -->|Yes| E[Pay claim]\n  D -->|No| R[Send rejection]\n  E --> X(((End)))\n  R --> X',
  'Customer journey': 'journey\n  title Customer onboarding\n  section Discover\n    Visit website: 4: Customer\n    Compare plans: 3: Customer\n  section Sign up\n    Fill in form: 2: Customer\n    Verify identity: 2: Customer, Ops\n  section Use\n    First login: 5: Customer',
  'Mind map': 'mindmap\n  root((Initiative))\n    Goals\n      Grow revenue\n      Reduce cost\n    Stakeholders\n      Sponsor\n      Users\n    Risks\n      Budget\n      Timeline',
  'Gantt / roadmap': 'gantt\n  title Delivery plan\n  dateFormat YYYY-MM-DD\n  section Analysis\n    Elicitation        :a1, 2027-01-04, 15d\n    Requirements sign-off :milestone, m1, after a1, 0d\n  section Build\n    Sprint 1 :s1, after a1, 14d\n    Sprint 2 :s2, after s1, 14d\n  section Test\n    UAT :after s2, 10d',
  'Timeline': 'timeline\n  title Programme milestones\n  2027 Q1 : Business case approved : Discovery\n  2027 Q2 : MVP release\n  2027 Q3 : Rollout to all branches\n  2027 Q4 : Benefits review',
  'Quadrant (2×2)': 'quadrantChart\n  title Impact vs effort\n  x-axis Low effort --> High effort\n  y-axis Low impact --> High impact\n  quadrant-1 Plan\n  quadrant-2 Do now\n  quadrant-3 Later\n  quadrant-4 Avoid\n  Self-service portal: [0.3, 0.8]\n  Data migration: [0.8, 0.7]\n  New logo: [0.2, 0.2]',
  'Pie chart': 'pie title Time spent per activity (as-is)\n  "Re-keying" : 42\n  "Customer calls" : 25\n  "Approvals" : 18\n  "Other" : 15',
  'C4 context': 'C4Context\n  title System context\n  Person(customer, "Customer", "Uses the service")\n  System(sys, "Our system", "The solution being built")\n  System_Ext(pay, "Payment provider", "Processes payments")\n  Rel(customer, sys, "Uses")\n  Rel(sys, pay, "Takes payments via", "REST")',
  'Fishbone (cause & effect)': 'flowchart LR\n  P[People] --> E\n  M[Method] --> E\n  T[Technology] --> E\n  D[Data] --> E\n  P1[No training] --> P\n  M1[Manual approvals] --> M\n  T1[Legacy system] --> T\n  D1[Duplicate records] --> D\n  E{{Problem: slow onboarding}}',
  'Org chart': 'flowchart TD\n  CEO[Chief Executive] --> COO[Operations]\n  CEO --> CFO[Finance]\n  CEO --> CIO[Technology]\n  CIO --> BA[Business Analysis]\n  CIO --> DEV[Engineering]',
};

export function renderStudio(root, id) {
  const p = project();
  if (!id && p.diagrams.length) id = p.diagrams[0].id;
  const d = p.diagrams.find((x) => x.id === id);
  root.innerHTML = `
    <div class="page-head"><div><h1>Diagram studio</h1><p>Create any diagram — flowcharts, swimlanes, sequence, class, ERD, state, journey, mind map, Gantt, timeline, C4, quadrant, pie — using Mermaid text with a live preview.</p></div><span class="grow"></span>
      <select data-tpl style="width:auto"><option value="">+ New from template…</option>${Object.keys(TEMPLATES).map((t) => `<option>${esc(t)}</option>`).join('')}</select></div>
    ${d ? `<div class="studio">
      <section class="card">
        <div class="field" style="margin-bottom:10px"><span>Diagram</span><select data-pick>${p.diagrams.map((x) => `<option value="${x.id}" ${x.id === d.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        <label class="field" style="margin-bottom:10px"><span>Name</span><input type="text" data-name value="${esc(d.name)}"></label>
        <label class="field"><span>Mermaid source</span><textarea class="code" data-code spellcheck="false">${esc(d.code)}</textarea></label>
        <div class="row" style="margin-top:10px"><button class="btn danger sm" data-del>Delete</button><span class="grow"></span><a class="btn sm ghost" href="https://mermaid.js.org/intro/syntax-reference.html" target="_blank" rel="noopener">Syntax help ↗</a></div>
      </section>
      <section class="card flush"><div class="card-head"><h2>Preview</h2><span class="grow"></span><span class="small muted" data-status></span><button class="btn sm" data-svg>SVG</button><button class="btn sm" data-png>PNG</button><button class="btn sm" data-mmd>.mmd</button></div><div class="stage" data-stage></div></section>
    </div>` : `<div class="card empty"><p>No custom diagrams yet. Pick a template above to start, or use "Customise in studio" on any generated diagram.</p></div>`}`;

  $('[data-tpl]', root).onchange = (e) => {
    const t = e.target.value;
    if (!t) return;
    const nid = uid('dg');
    update((pr) => pr.diagrams.push({ id: nid, name: t, code: TEMPLATES[t] }), { quiet: true });
    location.hash = `#/studio/${nid}`;
  };
  if (!d) return;
  $('[data-pick]', root).onchange = (e) => (location.hash = `#/studio/${e.target.value}`);
  const stage = $('[data-stage]', root);
  const status = $('[data-status]', root);
  let svg = '';
  let t;
  let ticket = 0;
  const draw = async () => {
    const code = $('[data-code]', root).value;
    const mine = ++ticket;
    status.textContent = 'Rendering…';
    try {
      const s = await render(code);
      if (mine !== ticket) return;
      svg = s;
      stage.innerHTML = s;
      status.textContent = '✓ Valid';
    } catch (e) {
      if (mine !== ticket) return;
      status.textContent = '⚠ Syntax error';
      stage.innerHTML = `<div class="err">${esc(e.message)}</div>${svg ? `<div style="opacity:.35;margin-top:12px">${svg}</div>` : ''}`;
    }
  };
  draw();
  const save = () => update((pr) => {
    const x = pr.diagrams.find((y) => y.id === d.id);
    x.code = $('[data-code]', root).value;
    x.name = $('[data-name]', root).value.trim() || 'Untitled diagram';
  }, { quiet: true, typing: true });
  $('[data-code]', root).addEventListener('input', () => (clearTimeout(t), (t = setTimeout(() => (save(), draw()), 400))));
  $('[data-code]', root).addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart;
      ta.setRangeText('  ', s, ta.selectionEnd, 'end');
    }
  });
  $('[data-name]', root).addEventListener('change', () => (save(), (location.hash = `#/studio/${d.id}`), renderStudio(root, d.id)));
  $('[data-del]', root).onclick = async () => {
    if (!(await confirmBox('Delete this diagram?'))) return;
    update((pr) => (pr.diagrams = pr.diagrams.filter((x) => x.id !== d.id)), { quiet: true });
    location.hash = '#/studio';
    renderStudio(root);
  };
  const name = () => fileSafe($('[data-name]', root).value);
  $('[data-svg]', root).onclick = () => (svg ? download(sized(svg).svg, `${name()}.svg`, 'image/svg+xml') : toast('Nothing to export', 'err'));
  $('[data-png]', root).onclick = async () => (svg ? download(await svgToPng(svg), `${name()}.png`) : toast('Nothing to export', 'err'));
  $('[data-mmd]', root).onclick = () => download($('[data-code]', root).value, `${name()}.mmd`);
}
