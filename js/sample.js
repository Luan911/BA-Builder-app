// A complete example project (fictional) so every screen has content to explore.
import { normalize } from './model.js';

const ac = (given, when, then) => ({ given, when, then });

export function sampleProject() {
  return normalize({
    id: 'prj_sample',
    meta: { name: 'Digital Personal Loan Origination', code: 'DLO', client: 'Kestrel Mutual (fictional)', sponsor: 'Head of Retail Lending', analyst: 'Lead Business Analyst', version: '0.4', methodology: 'Agile (Scrum)', domain: 'Retail banking', summary: 'Replace the branch-based, paper-heavy personal loan process with a fully digital application that gives customers a decision in minutes.' },
    charter: {
      problem: 'Personal loan applications are captured on paper in branches and re-keyed into the core banking system. The average time to decision is 5 working days, 32% of applicants abandon before a decision, and re-keying errors cause 1 in 12 applications to be reworked.',
      vision: 'Any eligible customer can apply for a personal loan on web or mobile and receive a decision in under 10 minutes.',
      scopeIn: ['Online application for personal loans up to R 250 000', 'Automated credit bureau check and affordability assessment', 'Digital document upload and e-signature', 'Back-office review queue for referred applications'],
      scopeOut: ['Home loans and vehicle finance', 'Collections and arrears management', 'Native mobile app (responsive web only in phase 1)'],
      successCriteria: ['Time to decision below 10 minutes for 80% of applications', 'Abandonment below 15%', 'Zero re-keying into core banking'],
      budget: 'R 8.5m', deadline: '2027-09-30', constraints: ['Must comply with the National Credit Act affordability rules', 'Customer data must stay in-country (POPIA)'],
    },
    businessCase: { discountRate: 11, years: 5, currency: 'R', options: 'Option A: Do nothing.\nOption B: Buy a SaaS loan origination platform.\nOption C: Build on the existing digital banking platform (recommended).', recommendation: 'Proceed with Option C: highest NPV, reuses existing identity and payment components, and keeps data in-country.' },
    objectives: [
      { id: 'o1', code: 'OBJ-01', title: 'Cut time to decision', kpi: 'Median minutes from submit to decision', baseline: '5 working days', target: '< 10 minutes', due: '2027-12-31' },
      { id: 'o2', code: 'OBJ-02', title: 'Grow loan book through digital channel', kpi: 'Monthly digital loan disbursements', baseline: 'R 0', target: 'R 40m per month', due: '2028-06-30' },
      { id: 'o3', code: 'OBJ-03', title: 'Eliminate re-keying', kpi: 'Applications re-keyed manually', baseline: '100%', target: '0%', due: '2027-09-30' },
    ],
    swot: [
      { category: 'Strength', text: 'Large existing customer base with verified digital identities' },
      { category: 'Strength', text: 'Mature internet banking platform and API gateway' },
      { category: 'Weakness', text: 'Credit decisioning rules live in spreadsheets maintained by one team' },
      { category: 'Weakness', text: 'Core banking batch window limits real-time account opening' },
      { category: 'Opportunity', text: 'Competitors still require a branch visit for loans' },
      { category: 'Opportunity', text: 'Open banking data can strengthen affordability checks' },
      { category: 'Threat', text: 'Fintech lenders offering instant credit' },
      { category: 'Threat', text: 'Rising fraud using synthetic identities' },
    ],
    pestle: [
      { factor: 'Political', impact: 'Low', text: 'Government drive for financial inclusion', response: 'Support smaller loan amounts' },
      { factor: 'Economic', impact: 'High', text: 'High interest rate cycle increases default risk', response: 'Conservative affordability buffer' },
      { factor: 'Social', impact: 'Medium', text: 'Customers expect instant, mobile-first services', response: 'Mobile-first design' },
      { factor: 'Technological', impact: 'Medium', text: 'Bureau APIs now available in real time', response: 'Integrate bureau API' },
      { factor: 'Legal', impact: 'High', text: 'National Credit Act and POPIA obligations', response: 'Compliance sign-off per release' },
      { factor: 'Environmental', impact: 'Low', text: 'Paper reduction targets', response: 'Fully paperless flow' },
    ],
    gaps: [
      { id: 'g1', code: 'GAP-01', area: 'Application capture', asIs: 'Paper forms in branch, re-keyed by staff', toBe: 'Customer self-service online form pre-filled from profile', gap: 'No digital capture channel', action: 'Build online application journey', priority: 'High', requirementIds: ['r3'] },
      { id: 'g2', code: 'GAP-02', area: 'Credit decision', asIs: 'Manual bureau lookup and spreadsheet scoring', toBe: 'Automated rules engine with real-time bureau call', gap: 'Rules not codified; no bureau integration', action: 'Codify rules, integrate bureau API', priority: 'High', requirementIds: ['r4'] },
      { id: 'g3', code: 'GAP-03', area: 'Documents', asIs: 'Photocopies of payslips filed in branch', toBe: 'Upload with automatic classification', gap: 'No document store', action: 'Use enterprise content service', priority: 'Medium', requirementIds: [] },
    ],
    financials: [
      { kind: 'Cost', year: 0, item: 'Build team (12 months)', category: 'People', amount: 5200000 },
      { kind: 'Cost', year: 0, item: 'Rules engine licence', category: 'Licences', amount: 900000 },
      { kind: 'Cost', year: 1, item: 'Run & support', category: 'Opex', amount: 1100000 },
      { kind: 'Cost', year: 2, item: 'Run & support', category: 'Opex', amount: 1100000 },
      { kind: 'Cost', year: 3, item: 'Run & support', category: 'Opex', amount: 1150000 },
      { kind: 'Benefit', year: 1, item: 'Net interest margin on new digital loans', category: 'Revenue', amount: 3800000 },
      { kind: 'Benefit', year: 2, item: 'Net interest margin on new digital loans', category: 'Revenue', amount: 6500000 },
      { kind: 'Benefit', year: 3, item: 'Net interest margin on new digital loans', category: 'Revenue', amount: 8200000 },
      { kind: 'Benefit', year: 1, item: 'Branch processing effort saved', category: 'Cost saving', amount: 1400000 },
      { kind: 'Benefit', year: 2, item: 'Branch processing effort saved', category: 'Cost saving', amount: 1500000 },
      { kind: 'Benefit', year: 3, item: 'Branch processing effort saved', category: 'Cost saving', amount: 1500000 },
    ],
    stakeholders: [
      { id: 's1', name: 'Head of Retail Lending', role: 'Sponsor', org: 'Retail Banking', power: 'High', interest: 'High', attitude: 'Champion', raci: 'A', approver: true, comms: 'Fortnightly steering committee', concerns: 'Growth targets and time to market' },
      { id: 's2', name: 'Credit Risk Manager', role: 'Credit policy owner', org: 'Risk', power: 'High', interest: 'Medium', attitude: 'Critic', raci: 'C', approver: true, comms: 'Weekly rules workshop', concerns: 'Automated decisions must not increase bad debt' },
      { id: 's3', name: 'Branch Operations Lead', role: 'Operations SME', org: 'Branch network', power: 'Medium', interest: 'High', attitude: 'Supporter', raci: 'C', comms: 'Sprint reviews', concerns: 'Staff roles will change' },
      { id: 's4', name: 'Compliance Officer', role: 'Regulatory compliance', org: 'Compliance', power: 'High', interest: 'Low', attitude: 'Neutral', raci: 'C', approver: true, comms: 'Monthly review', concerns: 'NCA and POPIA adherence' },
      { id: 's5', name: 'Solution Architect', role: 'Technical lead', org: 'IT', power: 'Medium', interest: 'High', attitude: 'Supporter', raci: 'R', comms: 'Daily stand-up', concerns: 'Integration with core banking' },
      { id: 's6', name: 'Contact Centre Manager', role: 'Customer support', org: 'Service', power: 'Low', interest: 'Medium', attitude: 'Neutral', raci: 'I', comms: 'Monthly newsletter' },
    ],
    raci: {
      'Business case': { s1: 'A', s2: 'C', s4: 'C', s5: 'C' },
      'Requirements baseline': { s1: 'A', s2: 'C', s3: 'C', s4: 'C', s5: 'R' },
      'Solution design': { s1: 'I', s2: 'C', s5: 'A' },
      UAT: { s1: 'A', s3: 'R', s2: 'C', s6: 'I' },
      'Go-live': { s1: 'A', s5: 'R', s4: 'C', s6: 'I' },
    },
    personas: [
      { id: 'p1', name: 'Applicant', kind: 'Human', description: 'Existing customer, 25–45, applying on a phone.', goals: ['Get a decision fast', 'Know the monthly repayment upfront'], pains: ['Visiting a branch during working hours', 'Not knowing the status'] },
      { id: 'p2', name: 'Credit Officer', kind: 'Human', description: 'Reviews applications that are referred by the rules engine.', goals: ['Clear queue within SLA'], pains: ['Missing documents'] },
      { id: 'p3', name: 'Credit Bureau', kind: 'System', description: 'External bureau providing credit reports and scores.' },
      { id: 'p4', name: 'Core Banking', kind: 'System', description: 'System of record for loan accounts.' },
    ],
    elicitation: [
      { id: 'e1', code: 'EL-01', date: '2026-10-05', technique: 'Interview', title: 'Sponsor vision interview', participants: ['s1'], agenda: ['Business drivers', 'Success measures', 'Constraints'], notes: 'Sponsor wants to launch before the festive season. Decision speed is the main differentiator.', outcomes: ['Target decision time < 10 minutes', 'Loan limit R 250 000 for phase 1'], actions: [{ action: 'Share competitor benchmark', owner: 's1', due: '2026-10-12', done: true }] },
      { id: 'e2', code: 'EL-02', date: '2026-10-14', technique: 'Workshop', title: 'Credit rules workshop', participants: ['s2', 's5', 's3'], agenda: ['Current scoring spreadsheet', 'Referral criteria', 'Affordability calculation'], notes: 'Walked through the scoring spreadsheet. 14 rules identified; 3 conflict with each other.', outcomes: ['Decision table for auto-approve / refer / decline', 'Affordability buffer of 10%'], actions: [{ action: 'Resolve conflicting rules 7, 9, 12', owner: 's2', due: '2026-10-28', done: false }, { action: 'Confirm bureau API contract', owner: 's5', due: '2026-10-25', done: false }] },
      { id: 'e3', code: 'EL-03', date: '2026-10-20', technique: 'Observation', title: 'Branch application job shadowing', participants: ['s3'], agenda: ['Observe 5 applications end to end'], notes: 'Average 42 minutes of staff time per application; most of it re-keying and copying documents.', outcomes: ['Pain points mapped on as-is process'], actions: [] },
    ],
    questions: [
      { code: 'Q-01', question: 'Can declined applicants re-apply within 30 days?', askedOf: 's2', due: '2026-11-20', status: 'Open' },
      { code: 'Q-02', question: 'Which e-signature provider is approved by Legal?', askedOf: 's4', due: '2026-11-25', status: 'Answered', answer: 'Use the group-approved provider already used for account opening.' },
    ],
    requirements: [
      { id: 'r1', code: 'BR-001', type: 'Business', title: 'Offer personal loans through digital channels', statement: 'The bank must allow existing customers to apply for personal loans without visiting a branch.', rationale: 'Customer demand and competitor pressure', priority: 'Must', status: 'Approved', source: 's1', objectiveIds: ['o1', 'o2'], parentIds: [], acceptance: [] },
      { id: 'r2', code: 'SR-001', type: 'Stakeholder', title: 'Know the outcome immediately', statement: 'Applicants need to know the outcome of their application in the same session.', priority: 'Must', status: 'Approved', source: 's1', objectiveIds: ['o1'], parentIds: ['r1'], acceptance: [] },
      { id: 'r3', code: 'FR-001', type: 'Functional', title: 'Submit a loan application', statement: 'The system shall allow a signed-in customer to submit a personal loan application for an amount between R 5 000 and R 250 000 and a term of 12 to 72 months.', rationale: 'Core capability', priority: 'Must', status: 'Approved', source: 's1', release: 'rel1', objectiveIds: ['o1', 'o3'], parentIds: ['r1'], acceptance: [ac('a signed-in customer on the application form', 'they submit an amount of R 50 000 over 36 months', 'the application is saved with status Submitted and a reference number is shown'), ac('a signed-in customer', 'they enter an amount above R 250 000', 'the form shows "The maximum amount is R 250 000" and cannot be submitted')] },
      { id: 'r4', code: 'FR-002', type: 'Functional', title: 'Automatically decide the application', statement: 'The system shall request a credit report from the bureau and apply the decision table DT-01 to return Approve, Refer or Decline within 60 seconds of submission.', priority: 'Must', status: 'Proposed', source: 's2', release: 'rel1', objectiveIds: ['o1'], parentIds: ['r2'], acceptance: [ac('a submitted application with bureau score 720 and affordability met', 'the decision runs', 'the outcome is Approve')] },
      { id: 'r5', code: 'FR-003', type: 'Functional', title: 'Review referred applications', statement: 'The system shall place referred applications in a credit officer queue, ordered by submission time, and allow the officer to approve or decline with a mandatory reason.', priority: 'Should', status: 'Draft', source: 's2', release: 'rel2', objectiveIds: ['o1'], parentIds: [], acceptance: [] },
      { id: 'r6', code: 'NFR-001', type: 'Non-functional', category: 'Performance', title: 'Decision response time', statement: 'The system shall return an automated decision within 60 seconds for 95% of applications.', metric: 'p95 decision time < 60 s', priority: 'Must', status: 'Approved', source: 's5', objectiveIds: ['o1'], parentIds: [], acceptance: [ac('1 000 test applications', 'they are submitted over one hour', '95% receive a decision within 60 seconds')] },
      { id: 'r7', code: 'NFR-002', type: 'Non-functional', category: 'Usability', title: 'Easy to use form', statement: 'The application form should be easy and quick to complete.', priority: 'Should', status: 'Draft', source: 's3', objectiveIds: [], parentIds: [], acceptance: [] },
      { id: 'r8', code: 'DR-001', type: 'Data', title: 'Retain application records', statement: 'The system shall retain application data and decision evidence for 5 years after the loan is closed.', priority: 'Must', status: 'Approved', source: 's4', objectiveIds: ['o3'], parentIds: [], acceptance: [] },
      { id: 'r9', code: 'TR-001', type: 'Transition', title: 'Train branch staff', statement: 'Branch staff must be trained to assist customers with the digital application before go-live.', priority: 'Should', status: 'Draft', source: 's3', objectiveIds: ['o2'], parentIds: [], acceptance: [] },
    ],
    stories: [
      { id: 'st1', code: 'US-001', epic: 'Apply online', asA: 'p1', iWant: 'to enter the loan amount and term and see my monthly repayment', soThat: 'I know if I can afford it before I apply', points: '3', priority: 'Must', status: 'Done', release: 'rel1', requirementIds: ['r3'], acceptance: [ac('I am on the calculator', 'I enter R 50 000 over 36 months', 'the monthly repayment is shown')], reach: 8000, impact: 2, confidence: 90, effort: 2, bv: 13, tc: 8, rr: 3, jobSize: 3 },
      { id: 'st2', code: 'US-002', epic: 'Apply online', asA: 'p1', iWant: 'my personal details pre-filled from my profile', soThat: 'I do not retype them', points: '5', priority: 'Should', status: 'In progress', release: 'rel1', requirementIds: ['r3'], acceptance: [], reach: 8000, impact: 1, confidence: 80, effort: 3, bv: 8, tc: 5, rr: 2, jobSize: 5 },
      { id: 'st3', code: 'US-003', epic: 'Decision', asA: 'p1', iWant: 'to receive a decision within minutes', soThat: 'I can plan my purchase', points: '8', priority: 'Must', status: 'Ready', release: 'rel1', requirementIds: ['r4', 'r6'], acceptance: [ac('I submitted an application', 'the decision is made', 'I see Approve, Refer or Decline with next steps')], reach: 8000, impact: 3, confidence: 70, effort: 6, bv: 20, tc: 13, rr: 8, jobSize: 8 },
      { id: 'st4', code: 'US-004', epic: 'Back office', asA: 'p2', iWant: 'a queue of referred applications', soThat: 'I can review them in order', points: '5', priority: 'Should', status: 'Backlog', release: 'rel2', requirementIds: ['r5'], acceptance: [], reach: 40, impact: 2, confidence: 80, effort: 3, bv: 8, tc: 5, rr: 5, jobSize: 5 },
      { id: 'st5', code: 'US-005', epic: 'Documents', asA: 'p1', iWant: 'to upload my payslip from my phone', soThat: 'I do not need to visit a branch', points: '5', priority: 'Could', status: 'Backlog', release: 'rel2', requirementIds: [], acceptance: [], reach: 3000, impact: 1, confidence: 60, effort: 4, bv: 5, tc: 3, rr: 2, jobSize: 5 },
    ],
    usecases: [
      { id: 'u1', code: 'UC-01', name: 'Submit loan application', primary: 'p1', secondary: ['p3'], level: 'User goal', goal: 'The applicant applies for a personal loan and receives a decision.', trigger: 'Applicant selects "Apply for a personal loan".', pre: ['Applicant is signed in to internet banking', 'Applicant is 18 or older'], main: ['Applicant enters amount and term', 'System shows the monthly repayment', 'Applicant confirms personal, employment and income details', 'Applicant accepts the credit check consent', 'System requests a credit report from the Credit Bureau', 'System applies the decision rules', 'System displays the decision and next steps'], alt: ['5a. Bureau unavailable: system refers the application and informs the applicant', '6a. Outcome is Refer: application goes to the credit officer queue'], exceptions: ['1a. Amount outside limits: system shows the allowed range'], post: ['Application stored with a decision and audit trail'], includes: [], requirementIds: ['r3', 'r4'] },
      { id: 'u2', code: 'UC-02', name: 'Review referred application', primary: 'p2', secondary: [], level: 'User goal', goal: 'Credit officer decides a referred application.', trigger: 'Application enters the referral queue.', pre: ['Officer has the credit officer role'], main: ['Officer opens the next application in the queue', 'System shows application, bureau report and rule results', 'Officer approves or declines with a reason', 'System notifies the applicant'], alt: ['2a. Documents missing: officer requests documents; application is paused'], exceptions: [], post: ['Decision recorded with officer ID and reason'], includes: [], requirementIds: ['r5'] },
    ],
    rules: [
      { code: 'RULE-01', name: 'Maximum loan amount', kind: 'Constraint', owner: 's2', statement: 'A personal loan must be between R 5 000 and R 250 000.', requirementIds: ['r3'] },
      { code: 'RULE-02', name: 'Affordability buffer', kind: 'Computation', owner: 's2', statement: 'Disposable income after the new instalment must be at least 10% of net income.', requirementIds: ['r4'] },
      { code: 'RULE-03', name: 'Minimum age', kind: 'Constraint', owner: 's4', statement: 'Applicants must be 18 years or older on the application date.', requirementIds: ['r3'] },
    ],
    decisionTables: [
      { code: 'DT-01', name: 'Credit decision', conditions: ['Bureau score >= 650', 'Affordability met (RULE-02)', 'Existing arrears'], actions: ['Approve', 'Refer', 'Decline'], rows: [{ when: 'Y, Y, N', then: 'X, -, -' }, { when: 'Y, Y, Y', then: '-, X, -' }, { when: 'Y, N, -', then: '-, X, -' }, { when: 'N, -, -', then: '-, -, X' }], notes: 'Agreed in workshop EL-02. Rows are evaluated top to bottom.' },
    ],
    tests: [
      { code: 'TC-001', title: 'Submit valid application', requirementIds: ['r3'], storyIds: ['st1'], pre: 'Signed-in test customer', steps: ['Open loan application', 'Enter R 50 000 over 36 months', 'Complete details and submit'], expected: 'Reference number shown; status Submitted', status: 'Passed', tester: 's3' },
      { code: 'TC-002', title: 'Amount above maximum', requirementIds: ['r3'], storyIds: [], pre: 'Signed-in test customer', steps: ['Enter R 300 000', 'Try to submit'], expected: 'Validation message; cannot submit', status: 'Failed', tester: 's3', actual: 'Message shown but submit button still enabled — defect DEF-14' },
      { code: 'TC-003', title: 'Automated approval', requirementIds: ['r4'], storyIds: ['st3'], pre: 'Bureau stub returns score 720', steps: ['Submit application'], expected: 'Decision Approve within 60 s', status: 'Not run' },
    ],
    processes: [
      { id: 'pr1', name: 'Personal loan application (as-is)', state: 'As-is', owner: 's3', description: 'Current branch-based process.', steps: [
        { id: 'S1', kind: 'start', label: 'Customer visits branch', lane: 'Applicant' },
        { id: 'S2', kind: 'task', label: 'Complete paper form', lane: 'Applicant', pain: 'Takes 20 minutes' },
        { id: 'S3', kind: 'task', label: 'Copy documents and re-key form', lane: 'Branch consultant', pain: 'Re-keying errors' },
        { id: 'S4', kind: 'task', label: 'Manual bureau check and scoring spreadsheet', lane: 'Credit officer' },
        { id: 'S5', kind: 'decision', label: 'Approved?', lane: 'Credit officer', yes: 'S6', no: 'S7' },
        { id: 'S6', kind: 'end', label: 'Customer called to sign', lane: 'Branch consultant' },
        { id: 'S7', kind: 'end', label: 'Decline letter posted', lane: 'Branch consultant' },
      ] },
      { id: 'pr2', name: 'Personal loan application (to-be)', state: 'To-be', owner: 's1', description: 'Digital self-service with automated decisioning.', steps: [
        { id: 'S1', kind: 'start', label: 'Applicant starts online', lane: 'Applicant' },
        { id: 'S2', kind: 'task', label: 'Enter amount, term and details', lane: 'Applicant' },
        { id: 'S3', kind: 'task', label: 'Request credit report', lane: 'System' },
        { id: 'S4', kind: 'decision', label: 'Auto-approve?', lane: 'System', yes: 'S7', no: 'S5' },
        { id: 'S5', kind: 'task', label: 'Review referred application', lane: 'Credit officer' },
        { id: 'S6', kind: 'decision', label: 'Approve?', lane: 'Credit officer', yes: 'S7', no: 'S8' },
        { id: 'S7', kind: 'end', label: 'E-sign and disburse', lane: 'System' },
        { id: 'S8', kind: 'end', label: 'Notify decline', lane: 'System' },
      ] },
    ],
    entities: [
      { id: 'en1', name: 'Customer', classification: 'Personal (PII)', retention: '5 years after relationship ends', owner: 's1', description: 'Bank customer', fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true }, { name: 'idNumber', type: 'string', required: true, unique: true, desc: '13-digit national ID' }, { name: 'fullName', type: 'string', required: true }, { name: 'email', type: 'email', required: true }, { name: 'dateOfBirth', type: 'date', required: true }] },
      { id: 'en2', name: 'Application', classification: 'Confidential', retention: '5 years after loan closed', owner: 's2', description: 'A loan application', fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true }, { name: 'customerId', type: 'uuid', required: true, fk: 'Customer' }, { name: 'amount', type: 'decimal', required: true, desc: '5 000 – 250 000' }, { name: 'termMonths', type: 'int', required: true, desc: '12 – 72' }, { name: 'status', type: 'enum', required: true, desc: 'Draft, Submitted, Approved, Referred, Declined, Disbursed' }, { name: 'submittedAt', type: 'datetime' }] },
      { id: 'en3', name: 'CreditCheck', classification: 'Sensitive', retention: '5 years', owner: 's2', description: 'Bureau result for an application', fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true }, { name: 'applicationId', type: 'uuid', required: true, fk: 'Application' }, { name: 'score', type: 'int' }, { name: 'reportRef', type: 'string' }, { name: 'checkedAt', type: 'datetime', required: true }] },
      { id: 'en4', name: 'Document', classification: 'Personal (PII)', retention: '5 years', description: 'Uploaded supporting document', fields: [{ name: 'id', type: 'uuid', pk: true, required: true, unique: true }, { name: 'applicationId', type: 'uuid', required: true, fk: 'Application' }, { name: 'kind', type: 'enum', desc: 'Payslip, Bank statement, ID' }, { name: 'storageKey', type: 'string', required: true }] },
    ],
    relationships: [
      { from: 'en1', to: 'en2', card: 'one-to-many', label: 'submits' },
      { from: 'en2', to: 'en3', card: 'one-to-many', label: 'is checked by' },
      { from: 'en2', to: 'en4', card: 'one-to-many', label: 'has' },
    ],
    states: [
      { name: 'Application lifecycle', entity: 'en2', initial: 'Draft', finals: ['Disbursed', 'Declined', 'Withdrawn'], transitions: [
        { from: 'Draft', to: 'Submitted', event: 'Applicant submits' }, { from: 'Submitted', to: 'Approved', event: 'Rules approve', guard: 'score >= 650 and affordable' },
        { from: 'Submitted', to: 'Referred', event: 'Rules refer' }, { from: 'Submitted', to: 'Declined', event: 'Rules decline' },
        { from: 'Referred', to: 'Approved', event: 'Officer approves' }, { from: 'Referred', to: 'Declined', event: 'Officer declines' },
        { from: 'Approved', to: 'Disbursed', event: 'Contract e-signed' }, { from: 'Draft', to: 'Withdrawn', event: 'Applicant cancels' },
      ] },
    ],
    apis: [
      { method: 'POST', path: '/applications', summary: 'Submit a loan application', tag: 'Applications', auth: 'OAuth2 / JWT bearer', params: [], request: '{\n  "amount": 50000,\n  "termMonths": 36,\n  "income": 32000\n}', response: '{\n  "id": "9b1c…",\n  "reference": "DLO-104233",\n  "status": "Submitted"\n}', codes: [{ code: '201', desc: 'Created' }, { code: '400', desc: 'Validation failed' }, { code: '401', desc: 'Not signed in' }], requirementIds: ['r3'] },
      { method: 'GET', path: '/applications/{id}', summary: 'Get application status and decision', tag: 'Applications', auth: 'OAuth2 / JWT bearer', params: [{ name: 'id', in: 'path', type: 'string', required: true, desc: 'Application ID' }], request: '', response: '{\n  "id": "9b1c…",\n  "status": "Approved",\n  "decisionAt": "2027-02-01T10:22:00Z"\n}', codes: [{ code: '200', desc: 'OK' }, { code: '404', desc: 'Not found' }], requirementIds: ['r4'] },
      { method: 'GET', path: '/referrals', summary: 'List referred applications for review', tag: 'Back office', auth: 'OAuth2 / JWT bearer', params: [{ name: 'page', in: 'query', type: 'integer', desc: 'Page number' }], request: '', response: '[ { "id": "…", "submittedAt": "…" } ]', codes: [{ code: '200', desc: 'OK' }, { code: '403', desc: 'Not a credit officer' }], requirementIds: ['r5'] },
    ],
    integrations: [
      { system: 'Credit Bureau', direction: 'Outbound', protocol: 'REST', frequency: 'Real-time per application', data: 'ID number, consent token → score, report reference', auth: 'mTLS + API key', owner: 's5', sla: '99.5%; on timeout refer the application' },
      { system: 'Core Banking', direction: 'Two-way', protocol: 'Message queue', frequency: 'Real-time', data: 'Approved loan → account number and disbursement status', auth: 'Service account', owner: 's5' },
      { system: 'E-signature service', direction: 'Outbound', protocol: 'REST', frequency: 'Per approved application', data: 'Contract PDF → signed contract', auth: 'OAuth2 client credentials', owner: 's4' },
    ],
    raid: [
      { code: 'R-01', type: 'Risk', description: 'Automated rules approve applicants who would previously have been declined, increasing bad debt.', likelihood: 3, impact: 5, owner: 's2', status: 'Open', response: 'Run new rules in shadow mode for 6 weeks before switching on.' },
      { code: 'R-02', type: 'Risk', description: 'Bureau API contract not signed in time for integration testing.', likelihood: 3, impact: 3, owner: 's5', status: 'In progress', response: 'Build against a stub; escalate via procurement.' },
      { code: 'A-01', type: 'Assumption', description: 'Existing internet banking login provides a verified identity.', owner: 's5', status: 'Open' },
      { code: 'I-01', type: 'Issue', description: 'Three credit rules in the spreadsheet conflict.', likelihood: 5, impact: 3, owner: 's2', status: 'In progress', response: 'Resolve in follow-up workshop.' },
      { code: 'D-01', type: 'Dependency', description: 'Core banking team must expose the loan account creation message.', owner: 's5', status: 'Open', due: '2027-01-31' },
    ],
    decisions: [
      { code: 'DEC-01', date: '2026-10-30', decision: 'Build on the existing digital banking platform (Option C).', options: ['Do nothing', 'Buy SaaS platform', 'Build on existing platform'], rationale: 'Highest NPV, reuses identity and keeps data in-country.', by: 's1' },
    ],
    changes: [
      { code: 'CR-001', date: '2026-11-10', title: 'Add joint applications', description: 'Allow two applicants on one loan.', reason: 'Requested by branch network for couples consolidating debt.', by: 's3', status: 'Under review', scope: 'New applicant entity relationship, UI for second applicant, bureau call per applicant', schedule: 15, cost: 420000, risk: 'Medium', requirementIds: ['r3', 'r4'] },
    ],
    releases: [
      { id: 'rel1', name: 'Release 1 — Apply & decide', goal: 'Online application with automated decision', start: '2027-01-11', end: '2027-04-30' },
      { id: 'rel2', name: 'Release 2 — Back office & documents', goal: 'Referral queue and document upload', start: '2027-05-03', end: '2027-08-27' },
    ],
    glossary: [
      { term: 'Affordability', definition: 'Assessment of whether the applicant can repay the loan after essential expenses, as required by the National Credit Act.' },
      { term: 'Referral', definition: 'An application that the rules engine neither approves nor declines; a credit officer decides it.' },
      { term: 'Bureau score', synonyms: 'Credit score', definition: 'A number from the credit bureau that predicts the likelihood of default.' },
      { term: 'NCA', synonyms: 'National Credit Act', definition: 'South African legislation regulating consumer credit.' },
    ],
    diagrams: [
      { id: 'dg1', name: 'Customer journey — apply for a loan', code: 'journey\n  title Applying for a personal loan\n  section Discover\n    See loan offer in app: 4: Applicant\n    Use repayment calculator: 5: Applicant\n  section Apply\n    Enter details: 3: Applicant\n    Upload payslip: 2: Applicant\n  section Decision\n    Receive instant decision: 5: Applicant, System\n    E-sign contract: 4: Applicant' },
    ],
    canvases: [],
  });
}
