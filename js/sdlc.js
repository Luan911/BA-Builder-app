// SDLC / PLC knowledge base.
// The order of PHASES is the order work must happen in. Each phase knows what it
// needs before it can start (entry), what must be true before it can close (exit),
// what it produces, and what clients and developers need from it.

export const PLC_STAGES = [
  {
    id: 'initiating',
    name: 'Initiating',
    purpose: 'Authorise the project: define the problem, the business case, the sponsor and the high-level scope.',
  },
  {
    id: 'planning',
    name: 'Planning',
    purpose: 'Turn the business case into requirements, a design, a schedule, a budget and a risk plan.',
  },
  {
    id: 'executing',
    name: 'Executing',
    purpose: 'Build, test and release the solution according to the plan.',
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Controlling',
    purpose: 'Runs alongside every other stage: track progress, manage change requests, risks, issues and quality.',
  },
  {
    id: 'closing',
    name: 'Closing',
    purpose: 'Formally accept the solution, hand it over to operations, release the team and record lessons learned.',
  },
];

export const PHASES = [
  {
    id: 'initiation',
    order: 1,
    name: 'Initiation & Planning',
    short: 'Initiation',
    plc: ['initiating', 'planning'],
    purpose:
      'Agree why the project exists, who it is for, what is in and out of scope, and who has the authority to approve it.',
    entry: ['A business need or opportunity has been raised', 'A sponsor is willing to own the outcome'],
    exit: [
      'Problem statement and vision are written down',
      'Objectives are measurable (KPI + target)',
      'In-scope and out-of-scope items are listed',
      'Sponsor and approvers are identified',
      'Users / actors are identified',
      'Charter is signed off by the sponsor',
    ],
    deliverables: ['charter', 'brd'],
    roles: ['Sponsor', 'Project Manager', 'Business Analyst'],
    clientNeeds: ['A clear statement of what will and will not be delivered', 'Who signs off and when'],
    devNeeds: ['The business goal behind the work', 'Known constraints (budget, dates, technology, compliance)'],
    checklist: [
      { id: 'kickoff', text: 'Kick-off meeting held with sponsor and key stakeholders' },
      { id: 'budget', text: 'Budget / funding approach confirmed' },
      { id: 'comms', text: 'Communication plan agreed (who gets updates, how often)' },
    ],
    sections: ['project', 'objectives', 'stakeholders'],
  },
  {
    id: 'requirements',
    order: 2,
    name: 'Requirements Analysis',
    short: 'Requirements',
    plc: ['planning'],
    purpose:
      'Capture what the system must do (functional), how well it must do it (non-functional) and the rules it must obey, in a way that can be tested.',
    entry: ['Initiation phase approved', 'Stakeholders available for workshops'],
    exit: [
      'Every functional requirement uses "shall" and is testable',
      'Every functional requirement has an actor, a benefit and acceptance criteria',
      'Every requirement traces to a business objective',
      'Non-functional requirements are measurable',
      'Business rules are listed and linked',
      'No open client questions block the requirements',
      'BRD and SRS signed off by the client',
    ],
    deliverables: ['brd', 'srs', 'stories', 'rtm'],
    roles: ['Business Analyst', 'Product Owner', 'Client SMEs', 'Tech Lead (review)'],
    clientNeeds: ['Readable requirements they can confirm', 'Priorities they control (MoSCoW)'],
    devNeeds: ['Unambiguous, testable requirements', 'Acceptance criteria in Given/When/Then form', 'Business rules with exact values'],
    checklist: [
      { id: 'workshops', text: 'Requirements workshops held and minuted' },
      { id: 'walkthrough', text: 'Requirements walked through with the development team' },
      { id: 'priorities', text: 'Client has confirmed MoSCoW priorities' },
    ],
    sections: ['requirements', 'nfrs', 'rules'],
  },
  {
    id: 'design',
    order: 3,
    name: 'System Design',
    short: 'Design',
    plc: ['planning'],
    purpose:
      'Decide how the system will meet the requirements: data model, process flows, integrations and architecture.',
    entry: ['Requirements phase approved'],
    exit: [
      'Every entity has a primary key and valid relationships',
      'Every business process has a start, an end and no dead ends',
      'Every integration has a protocol, direction and authentication method',
      'Architecture components and their connections are defined',
      'Design reviewed by the technical lead',
    ],
    deliverables: ['design', 'diagrams'],
    roles: ['Solution Architect', 'Tech Lead', 'Business Analyst', 'UX Designer'],
    clientNeeds: ['Process flows they recognise from their business', 'Confirmation of the systems being integrated'],
    devNeeds: ['Data dictionary with types and validation', 'Interface contracts', 'Architecture and component responsibilities'],
    checklist: [
      { id: 'designReview', text: 'Design review held with the technical lead' },
      { id: 'security', text: 'Security and privacy review completed' },
      { id: 'envs', text: 'Environments (dev / test / prod) planned' },
    ],
    sections: ['entities', 'processes', 'integrations', 'components'],
  },
  {
    id: 'build',
    order: 4,
    name: 'Development',
    short: 'Build',
    plc: ['executing'],
    purpose: 'Build the solution in increments, keeping traceability from each requirement to code and tests.',
    entry: ['Design phase approved', 'Backlog is ready (stories meet the Definition of Ready)'],
    exit: [
      'Every Must-have requirement is assigned to a release',
      'Every story meets the Definition of Ready',
      'Code reviewed and unit tested',
    ],
    deliverables: ['stories', 'rtm'],
    roles: ['Developers', 'Tech Lead', 'Scrum Master', 'Business Analyst'],
    clientNeeds: ['Regular demos of working software', 'Visibility of what is in each release'],
    devNeeds: ['A prioritised, ready backlog', 'Fast answers to clarification questions'],
    checklist: [
      { id: 'repo', text: 'Source control and branching strategy in place' },
      { id: 'ci', text: 'Continuous integration build runs on every change' },
      { id: 'codeReview', text: 'Code review process followed' },
      { id: 'unitTests', text: 'Unit tests written for new code' },
    ],
    sections: ['releases'],
  },
  {
    id: 'test',
    order: 5,
    name: 'Testing & QA',
    short: 'Test',
    plc: ['executing'],
    purpose: 'Prove that the solution meets every requirement: system, integration, non-functional and user acceptance testing.',
    entry: ['Build complete for the release', 'Test cases derived from acceptance criteria'],
    exit: [
      'Every requirement has at least one test case',
      'Every non-functional requirement has a measurable target to test against',
      'No open critical or high defects',
      'User acceptance testing signed off by the client',
    ],
    deliverables: ['testplan', 'rtm'],
    roles: ['QA / Test Analysts', 'Business Analyst', 'Client UAT testers'],
    clientNeeds: ['UAT scripts written in business language', 'A clear defect process'],
    devNeeds: ['Reproducible defect reports', 'Agreed severity definitions'],
    checklist: [
      { id: 'sit', text: 'System & integration testing complete' },
      { id: 'nfrTests', text: 'Performance / security tests executed' },
      { id: 'uat', text: 'User acceptance testing complete' },
      { id: 'defects', text: 'No open critical / high defects' },
    ],
    sections: [],
  },
  {
    id: 'deploy',
    order: 6,
    name: 'Deployment',
    short: 'Deploy',
    plc: ['executing', 'closing'],
    purpose: 'Release the solution to production safely, with a rollback plan, and hand it over to the people who will run it.',
    entry: ['Testing phase approved', 'Go / no-go decision taken'],
    exit: ['Deployment plan and rollback plan agreed', 'Production smoke test passed', 'Users trained', 'Support handover complete'],
    deliverables: ['deploy'],
    roles: ['Release Manager', 'DevOps', 'Support Team', 'Business Analyst'],
    clientNeeds: ['Go-live date and communication', 'Training for every user group'],
    devNeeds: ['Production access and configuration', 'Rollback criteria'],
    checklist: [
      { id: 'goNoGo', text: 'Go / no-go meeting held' },
      { id: 'rollback', text: 'Rollback plan rehearsed' },
      { id: 'smoke', text: 'Production smoke test passed' },
      { id: 'training', text: 'User training delivered' },
    ],
    sections: [],
  },
  {
    id: 'maintain',
    order: 7,
    name: 'Operations & Maintenance',
    short: 'Maintain',
    plc: ['closing'],
    purpose: 'Run, support and improve the live system; close the project formally and capture lessons learned.',
    entry: ['Deployment phase approved', 'Hypercare period started'],
    exit: ['Hypercare complete', 'Support model in place', 'Lessons learned recorded', 'Project closure signed off'],
    deliverables: ['deploy', 'gate'],
    roles: ['Support Team', 'Product Owner', 'Sponsor'],
    clientNeeds: ['Service levels (SLAs) and support contacts', 'A route for change requests'],
    devNeeds: ['Monitoring and alerting', 'A prioritised improvement backlog'],
    checklist: [
      { id: 'hypercare', text: 'Hypercare period completed' },
      { id: 'sla', text: 'SLAs and support contacts published' },
      { id: 'lessons', text: 'Lessons-learned session held' },
      { id: 'closure', text: 'Project closure report accepted by the sponsor' },
    ],
    sections: [],
  },
];

export const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]));

// How methodology changes the way the phases are run (the order never changes).
export const METHODOLOGY_NOTES = {
  Waterfall:
    'Each phase is completed and signed off once, in order. Changes after sign-off go through formal change control.',
  Agile:
    'Initiation happens once. Requirements, design, build and test repeat every sprint for a slice of the backlog; gates are applied per release.',
  Hybrid:
    'Initiation, high-level requirements and architecture are signed off up front (Waterfall). Detailed requirements, build and test run in sprints (Agile).',
};

export const DEFINITION_OF_READY = [
  'Written as "As a ... I want ... so that ..."',
  'Has at least one acceptance criterion in Given/When/Then form',
  'Has a MoSCoW priority',
  'Traces to a business objective',
  'Is assigned to a release',
];

export const DEFINITION_OF_DONE = [
  'Code complete and peer reviewed',
  'Unit tests written and passing',
  'All acceptance criteria pass',
  'No open critical or high defects',
  'Documentation updated',
  'Accepted by the Product Owner',
];

export const SEVERITY_DEFINITIONS = [
  ['Critical', 'System unusable or data loss; no workaround', 'Fix before release'],
  ['High', 'Major function fails; workaround is difficult', 'Fix before release'],
  ['Medium', 'Function impaired; reasonable workaround exists', 'Fix in current or next release'],
  ['Low', 'Cosmetic or minor issue', 'Fix when capacity allows'],
];
