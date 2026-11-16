// A complete example project so every screen has real content to show.
// A few gaps are left on purpose so the quality checks have something to report.
import { normalizeProject } from './model.js';

export function sampleProject() {
  return normalizeProject({
    id: 'prj_sample',
    meta: {
      name: 'Clinic Online Appointment Booking',
      code: 'CAB',
      client: 'Riverside Family Clinics',
      sponsor: 'stk_sponsor',
      preparedBy: 'Business Analysis Team',
      domain: 'Healthcare',
      methodology: 'Hybrid',
      compliance: ['POPIA', 'WCAG 2.2'],
      version: '0.3',
      summary:
        'A web and mobile-friendly booking service that lets patients book, reschedule and cancel clinic appointments online, sends reminders, and gives reception staff a live view of the day’s schedule.',
    },
    initiation: {
      problem:
        'Patients can only book by phone during office hours. Reception spends about 40% of the day on calls, 18% of appointments are missed, and patients wait an average of 6 minutes on hold.',
      vision: 'Any patient can book a confirmed appointment in under two minutes, at any time, from any device.',
      scopeIn: [
        'Online booking, rescheduling and cancellation for registered patients',
        'SMS and email reminders',
        'Reception schedule view and manual booking',
        'Integration with the existing practice management system (PMS)',
      ],
      scopeOut: ['Online payments', 'Video consultations', 'Native iOS / Android apps (phase 2)'],
      budget: 'R 1.2m',
      targetDate: '2027-06-30',
      successCriteria: [
        'Sponsor accepts the solution after UAT',
        'Missed appointments reduced to under 8% within 3 months of go-live',
      ],
    },
    objectives: [
      { id: 'obj_1', code: 'OBJ-01', title: 'Reduce phone booking workload', kpi: 'Share of bookings made online', target: '60% within 6 months' },
      { id: 'obj_2', code: 'OBJ-02', title: 'Reduce missed appointments', kpi: 'No-show rate', target: 'Below 8%' },
      { id: 'obj_3', code: 'OBJ-03', title: 'Improve patient experience', kpi: 'Booking satisfaction score', target: '4.5 / 5' },
    ],
    stakeholders: [
      { id: 'stk_sponsor', name: 'Dr N. Mokoena', role: 'Clinical Director (Sponsor)', organisation: 'Riverside Family Clinics', side: 'Client', raci: 'A', influence: 'High', interest: 'High', approver: true },
      { id: 'stk_ops', name: 'Thandi Khumalo', role: 'Operations Manager', organisation: 'Riverside Family Clinics', side: 'Client', raci: 'R', influence: 'High', interest: 'High', approver: true },
      { id: 'stk_recep', name: 'Reception team lead', role: 'Subject matter expert', organisation: 'Riverside Family Clinics', side: 'Client', raci: 'C', influence: 'Medium', interest: 'High', approver: false },
      { id: 'stk_ba', name: 'Business Analyst', role: 'Lead BA', organisation: 'Delivery team', side: 'Delivery', raci: 'R', influence: 'Medium', interest: 'High', approver: false },
      { id: 'stk_tl', name: 'Tech Lead', role: 'Technical Lead', organisation: 'Delivery team', side: 'Delivery', raci: 'R', influence: 'High', interest: 'High', approver: true },
      { id: 'stk_pms', name: 'PMS vendor', role: 'Integration owner', organisation: 'MedSoft (Pty) Ltd', side: 'Third party', raci: 'C', influence: 'Medium', interest: 'Low', approver: false },
    ],
    actors: [
      { id: 'act_patient', name: 'Patient', description: 'A registered clinic patient booking for themselves or a dependant.', goals: 'Book quickly at a convenient time without phoning.' },
      { id: 'act_recep', name: 'Receptionist', description: 'Front-desk staff who manage the daily schedule.', goals: 'See the live schedule and fill gaps.' },
      { id: 'act_admin', name: 'Clinic Administrator', description: 'Configures doctors, rooms and opening hours.', goals: 'Keep availability accurate.' },
    ],
    requirements: [
      {
        id: 'req_1', code: 'FR-001', title: 'View available appointment slots',
        statement: 'The system shall display available appointment slots per doctor for the next 30 days, based on the PMS schedule.',
        actorId: 'act_patient', benefit: 'I can choose a time that suits me', objectiveIds: ['obj_1', 'obj_3'], priority: 'Must', source: 'stk_ops', status: 'Approved', releaseId: 'rel_1',
        acceptance: [
          { id: 'ac_1', title: 'Slots shown for selected doctor', given: 'a patient is signed in and selects Dr Smith', when: 'they open the booking calendar', then: 'only Dr Smith’s free 15-minute slots for the next 30 days are shown' },
          { id: 'ac_2', title: 'No availability', given: 'a doctor has no free slots in the next 30 days', when: 'the patient selects that doctor', then: 'the message "No appointments available - please choose another doctor" is shown' },
        ],
      },
      {
        id: 'req_2', code: 'FR-002', title: 'Book an appointment',
        statement: 'The system shall let a signed-in patient book one available slot and shall write the booking to the PMS within 5 seconds.',
        actorId: 'act_patient', benefit: 'my appointment is confirmed without phoning the clinic', objectiveIds: ['obj_1'], priority: 'Must', source: 'stk_ops', status: 'Approved', releaseId: 'rel_1',
        acceptance: [
          { id: 'ac_3', title: 'Successful booking', given: 'a patient has selected a free slot', when: 'they confirm the booking', then: 'the booking is saved in the PMS and a confirmation number is shown' },
          { id: 'ac_4', title: 'Slot taken meanwhile', given: 'another patient books the same slot first', when: 'the patient confirms', then: 'the message "This slot was just taken" is shown and the calendar refreshes' },
        ],
      },
      {
        id: 'req_3', code: 'FR-003', title: 'Cancel or reschedule an appointment',
        statement: 'The system shall let a patient cancel or reschedule a booking up to 2 hours before the appointment start time.',
        actorId: 'act_patient', benefit: 'the slot is freed for someone else', objectiveIds: ['obj_2'], priority: 'Must', source: 'stk_ops', status: 'Approved', releaseId: 'rel_1',
        acceptance: [
          { id: 'ac_5', title: 'Cancel in time', given: 'an appointment starts in more than 2 hours', when: 'the patient cancels it', then: 'the booking is removed from the PMS and the slot becomes available' },
          { id: 'ac_6', title: 'Too late to cancel', given: 'an appointment starts in less than 2 hours', when: 'the patient tries to cancel', then: 'the message "Please call the clinic to cancel" is shown' },
        ],
      },
      {
        id: 'req_4', code: 'FR-004', title: 'Send appointment reminders',
        statement: 'The system shall send an SMS and email reminder 24 hours before each appointment.',
        actorId: 'act_patient', benefit: 'I do not forget my appointment', objectiveIds: ['obj_2'], priority: 'Should', source: 'stk_sponsor', status: 'Approved', releaseId: 'rel_2',
        acceptance: [
          { id: 'ac_7', title: 'Reminder sent', given: 'an appointment is 24 hours away', when: 'the reminder job runs', then: 'one SMS and one email are sent to the patient’s registered contacts' },
        ],
      },
      {
        id: 'req_5', code: 'FR-005', title: 'View the daily schedule',
        statement: 'The system shall show reception a live schedule for the current day, refreshed at least every 60 seconds.',
        actorId: 'act_recep', benefit: 'I can see gaps and late arrivals at a glance', objectiveIds: ['obj_1'], priority: 'Should', source: 'stk_recep', status: 'Proposed', releaseId: 'rel_2',
        acceptance: [],
      },
      {
        id: 'req_6', code: 'FR-006', title: 'Manage doctor availability',
        statement: 'The system should allow administrators to manage opening hours quickly and easily.',
        actorId: 'act_admin', benefit: '', objectiveIds: [], priority: 'Could', source: 'stk_ops', status: 'Proposed', releaseId: '',
        acceptance: [],
      },
    ],
    nfrs: [
      { id: 'nfr_1', code: 'NFR-001', category: 'Performance', statement: 'Booking calendar pages shall load quickly.', metric: 'Page load time (95th percentile)', target: '< 2 seconds on 4G', priority: 'Must' },
      { id: 'nfr_2', code: 'NFR-002', category: 'Availability', statement: 'The booking service shall be available outside clinic hours.', metric: 'Monthly uptime', target: '99.5%', priority: 'Must' },
      { id: 'nfr_3', code: 'NFR-003', category: 'Privacy', statement: 'Personal and health information shall be processed in line with POPIA.', metric: 'POPIA compliance review', target: 'Passed before go-live', priority: 'Must' },
      { id: 'nfr_4', code: 'NFR-004', category: 'Accessibility', statement: 'Patient-facing screens shall meet WCAG 2.2 AA.', metric: 'Accessibility audit', target: 'No AA failures', priority: 'Should' },
    ],
    rules: [
      { id: 'br_1', code: 'BR-01', statement: 'Appointments are 15 minutes long and start on the quarter hour.', requirementIds: ['req_1', 'req_2'] },
      { id: 'br_2', code: 'BR-02', statement: 'A patient may hold at most 2 future appointments at a time.', requirementIds: ['req_2'] },
      { id: 'br_3', code: 'BR-03', statement: 'Cancellations are allowed online only up to 2 hours before the start time.', requirementIds: ['req_3'] },
    ],
    entities: [
      {
        id: 'ent_patient', name: 'Patient', description: 'A registered patient of the clinic.',
        fields: [
          { name: 'patient_id', type: 'uuid', pk: true, required: true, unique: true, fk: '', rule: '' },
          { name: 'full_name', type: 'string', pk: false, required: true, unique: false, fk: '', rule: 'Max 120 characters' },
          { name: 'mobile', type: 'string', pk: false, required: true, unique: false, fk: '', rule: 'E.164 format, e.g. +27821234567' },
          { name: 'email', type: 'email', pk: false, required: false, unique: true, fk: '', rule: 'Valid email address' },
        ],
      },
      {
        id: 'ent_doctor', name: 'Doctor', description: 'A practitioner who sees patients.',
        fields: [
          { name: 'doctor_id', type: 'uuid', pk: true, required: true, unique: true, fk: '', rule: '' },
          { name: 'full_name', type: 'string', pk: false, required: true, unique: false, fk: '', rule: '' },
          { name: 'pms_ref', type: 'string', pk: false, required: true, unique: true, fk: '', rule: 'Matches PMS practitioner code' },
        ],
      },
      {
        id: 'ent_appt', name: 'Appointment', description: 'A booked 15-minute slot.',
        fields: [
          { name: 'appointment_id', type: 'uuid', pk: true, required: true, unique: true, fk: '', rule: '' },
          { name: 'patient_id', type: 'uuid', pk: false, required: true, unique: false, fk: 'Patient', rule: '' },
          { name: 'doctor_id', type: 'uuid', pk: false, required: true, unique: false, fk: 'Doctor', rule: '' },
          { name: 'starts_at', type: 'datetime', pk: false, required: true, unique: false, fk: '', rule: 'On the quarter hour (BR-01)' },
          { name: 'status', type: 'enum', pk: false, required: true, unique: false, fk: '', rule: 'Booked | Cancelled | Attended | No-show' },
        ],
      },
      {
        id: 'ent_reminder', name: 'Reminder', description: 'A reminder message sent for an appointment.',
        fields: [
          { name: 'reminder_id', type: 'uuid', pk: true, required: true, unique: true, fk: '', rule: '' },
          { name: 'appointment_id', type: 'uuid', pk: false, required: true, unique: false, fk: 'Appointment', rule: '' },
          { name: 'channel', type: 'enum', pk: false, required: true, unique: false, fk: '', rule: 'SMS | Email' },
          { name: 'sent_at', type: 'datetime', pk: false, required: false, unique: false, fk: '', rule: '' },
        ],
      },
    ],
    relationships: [
      { id: 'rel_a', fromId: 'ent_patient', toId: 'ent_appt', cardinality: 'one-to-many', label: 'books' },
      { id: 'rel_b', fromId: 'ent_doctor', toId: 'ent_appt', cardinality: 'one-to-many', label: 'sees' },
      { id: 'rel_c', fromId: 'ent_appt', toId: 'ent_reminder', cardinality: 'one-to-many', label: 'triggers' },
    ],
    processes: [
      {
        id: 'proc_book', name: 'Book an appointment online', description: 'From choosing a doctor to receiving a confirmation.',
        steps: [
          { code: 'S1', type: 'start', label: 'Patient opens booking page', actorId: 'act_patient', next: 'S2' },
          { code: 'S2', type: 'task', label: 'Sign in', actorId: 'act_patient', next: 'S3' },
          { code: 'S3', type: 'task', label: 'Choose doctor and date', actorId: 'act_patient', next: 'S4' },
          { code: 'S4', type: 'task', label: 'Fetch free slots from PMS', actorId: 'sys', next: 'S5', integrationId: 'int_pms' },
          { code: 'S5', type: 'decision', label: 'Slots available?', actorId: 'sys', yes: 'S6', no: 'S9' },
          { code: 'S6', type: 'task', label: 'Select slot and confirm', actorId: 'act_patient', next: 'S7' },
          { code: 'S7', type: 'decision', label: 'Slot still free?', actorId: 'sys', yes: 'S10', no: 'S4' },
          { code: 'S10', type: 'task', label: 'Save booking to PMS', actorId: 'sys', next: 'S8', integrationId: 'int_pms' },
          { code: 'S8', type: 'end', label: 'Booking confirmed', actorId: 'act_patient' },
          { code: 'S9', type: 'end', label: 'Show "No appointments available"', actorId: 'sys' },
        ],
      },
    ],
    integrations: [
      { id: 'int_pms', name: 'Practice Management System', direction: 'Two-way', protocol: 'REST', purpose: 'Read doctor schedules and write bookings', dataExchanged: 'Doctors, slots, appointments', auth: 'OAuth 2.0 client credentials', owner: 'stk_pms' },
      { id: 'int_sms', name: 'SMS gateway', direction: 'Outbound', protocol: 'REST', purpose: 'Send appointment reminders', dataExchanged: 'Mobile number, message text', auth: 'API key', owner: '' },
      { id: 'int_email', name: 'Email service', direction: 'Outbound', protocol: 'Other', purpose: 'Send confirmations and reminders', dataExchanged: 'Email address, message', auth: '', owner: '' },
    ],
    components: [
      { id: 'cmp_web', name: 'Patient web app', type: 'client', tech: 'Responsive web (React)', connectsTo: ['cmp_api'] },
      { id: 'cmp_recep', name: 'Reception console', type: 'client', tech: 'Web', connectsTo: ['cmp_api'] },
      { id: 'cmp_api', name: 'Booking API', type: 'service', tech: 'Node.js', connectsTo: ['cmp_db', 'cmp_pms', 'cmp_queue'] },
      { id: 'cmp_worker', name: 'Reminder worker', type: 'service', tech: 'Scheduled job', connectsTo: ['cmp_db', 'cmp_sms', 'cmp_mail'] },
      { id: 'cmp_queue', name: 'Event queue', type: 'queue', tech: 'RabbitMQ', connectsTo: ['cmp_worker'] },
      { id: 'cmp_db', name: 'Booking database', type: 'datastore', tech: 'PostgreSQL', connectsTo: [] },
      { id: 'cmp_pms', name: 'Practice Management System', type: 'external', tech: 'MedSoft PMS', connectsTo: [] },
      { id: 'cmp_sms', name: 'SMS gateway', type: 'external', tech: '', connectsTo: [] },
      { id: 'cmp_mail', name: 'Email service', type: 'external', tech: '', connectsTo: [] },
    ],
    releases: [
      { id: 'rel_1', name: 'Release 1 - Core booking', goal: 'Patients can book, cancel and reschedule online', start: '2027-01-11', end: '2027-03-19' },
      { id: 'rel_2', name: 'Release 2 - Reminders & reception', goal: 'Reminders and live reception schedule', start: '2027-03-22', end: '2027-05-14' },
    ],
    risks: [
      { id: 'rsk_1', code: 'R-01', description: 'PMS vendor API has rate limits that may slow slot lookups at peak times.', likelihood: 4, impact: 4, mitigation: 'Cache slot data for 60 seconds; agree limits with vendor.', owner: 'stk_tl', status: 'Mitigating' },
      { id: 'rsk_2', code: 'R-02', description: 'Older patients may struggle with online booking.', likelihood: 3, impact: 3, mitigation: 'Keep phone booking; usability test with patients over 65.', owner: 'stk_ops', status: 'Open' },
      { id: 'rsk_3', code: 'R-03', description: 'SMS costs exceed budget if reminders are sent twice.', likelihood: 2, impact: 3, mitigation: '', owner: '', status: 'Open' },
    ],
    assumptions: [
      { id: 'asm_1', code: 'A-01', text: 'The PMS vendor will provide a test environment by January 2027.', owner: 'stk_pms', validated: false },
      { id: 'asm_2', code: 'A-02', text: 'All patients already have a mobile number on record.', owner: 'stk_ops', validated: true },
    ],
    constraints: [
      { id: 'con_1', code: 'C-01', text: 'Patient data must be hosted in South Africa.' },
      { id: 'con_2', code: 'C-02', text: 'Go-live before the winter flu season (end of June 2027).' },
    ],
    dependencies: [
      { id: 'dep_1', code: 'DEP-01', text: 'PMS booking API v2 released by the vendor', owner: 'stk_pms', due: '2027-01-31' },
    ],
    decisions: [
      { id: 'dec_1', code: 'D-01', date: '2026-10-14', decision: 'Phone booking stays available alongside online booking.', rationale: 'Avoid excluding patients without smartphones.', owner: 'stk_sponsor' },
      { id: 'dec_2', code: 'D-02', date: '2026-10-21', decision: 'Online payments are out of scope for this project.', rationale: 'Medical aid billing rules need a separate project.', owner: 'stk_sponsor' },
    ],
    questions: [
      { id: 'q_1', code: 'Q-01', question: 'Can dependants (children) be booked from a parent’s profile?', askedOf: 'Client', owner: 'stk_ops', due: '2026-11-30', status: 'Open', answer: '' },
      { id: 'q_2', code: 'Q-02', question: 'Which SMS gateway does the clinic already have a contract with?', askedOf: 'Client', owner: 'stk_ops', due: '2026-11-20', status: 'Answered', answer: 'Clickatell' },
      { id: 'q_3', code: 'Q-03', question: 'Does the PMS API support webhooks for schedule changes?', askedOf: 'Delivery', owner: 'stk_tl', due: '2026-12-05', status: 'Open', answer: '' },
    ],
    gates: {
      initiation: {
        checklist: { kickoff: true, budget: true, comms: true },
        approved: true,
        approvedBy: 'Dr N. Mokoena',
        approvedOn: '2026-10-28',
      },
    },
  });
}
