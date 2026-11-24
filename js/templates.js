// Non-functional templates: realistic, measurable starting points the analyst edits.
export const NFR_TEMPLATES = [
  ['Performance', 'Response time', 'The system shall respond to 95% of user requests within 2 seconds while 500 users are active.', 'p95 response time < 2 s at 500 concurrent users'],
  ['Availability', 'Uptime', 'The system shall be available 99.9% of each calendar month, excluding planned maintenance announced 48 hours in advance.', 'Monthly uptime ≥ 99.9%'],
  ['Security', 'Strong sign-in', 'The system shall require multi-factor authentication for all staff accounts and lock an account after 5 failed sign-in attempts.', 'MFA on 100% of staff accounts; lock after 5 failures'],
  ['Privacy', 'Encrypt personal data', 'The system shall encrypt personal data at rest with AES-256 and in transit with TLS 1.2 or higher.', '100% of personal data encrypted'],
  ['Usability', 'Learnability', 'A first-time user shall complete the main task without help in under 5 minutes in at least 90% of usability test sessions.', '≥ 90% complete in < 5 min'],
  ['Accessibility', 'WCAG compliance', 'All user-facing screens shall conform to WCAG 2.2 level AA.', '0 level AA failures in the accessibility audit'],
  ['Scalability', 'Growth', 'The system shall support 10 000 daily active users without changes to the architecture, with response times still meeting the performance requirement.', '10 000 DAU within p95 < 2 s'],
  ['Reliability', 'Recovery', 'The system shall be restored within 4 hours of a failure (RTO) with no more than 15 minutes of data loss (RPO).', 'RTO ≤ 4 h, RPO ≤ 15 min'],
  ['Auditability', 'Audit trail', 'The system shall log every create, update or delete of business data with the user, the time, the old value and the new value. Audit records shall be kept for 7 years.', '100% of changes logged; 7-year retention'],
  ['Compliance', 'Data protection law', 'The system shall allow an authorised administrator to export or delete all personal data held about a person within 30 days of a verified request.', 'Requests completed within 30 days'],
  ['AI governance', 'Human approval of AI decisions', 'The system shall record each AI recommendation with the model version, the input data and a confidence score, and shall require a person to approve any recommended refund above R 5 000.', '100% of AI recommendations logged; approval above R 5 000'],
];

// Starter blocks: common modules most software projects need, ready to tailor.
// Requirements: [title, statement, story ("I want…"), [scenarios]] — the last scenario is an unhappy path.
const ac = (given, when, then) => ({ given, when, then });
export const STARTERS = {
  requirements: [
    { id: 'auth', title: 'Sign-in & role-based access', items: [
      ['Sign in with a one-time code', 'The system shall require users to sign in with their username, password and a one-time code sent to their registered device.', 'to sign in securely with a one-time code', [ac('a registered user', 'they enter a valid password and one-time code', 'they are signed in'), ac('a registered user', 'they enter a wrong one-time code 3 times in a row', 'the account is locked for 15 minutes and they are told how to unlock it')]],
      ['Restrict functions by role', 'The system shall allow each function only to the roles given access in the roles and permissions matrix.', 'to see only the functions my role allows', [ac('a user with the required role', 'they open a function', 'the function opens'), ac('a user without the required role', 'they try to open the function', 'access is refused with a clear message and the attempt is logged')]],
      ['End idle sessions', 'The system shall end a session after 15 minutes without activity.', 'my session to end automatically when I walk away', [ac('a signed-in user', 'there is no activity for 15 minutes', 'they are signed out and returned to the sign-in page'), ac('a user with unsaved changes', 'the session is about to time out', 'they are warned 2 minutes before so they can stay signed in')]],
    ] },
    { id: 'audit', title: 'Audit trail', items: [
      ['Record every change', 'The system shall record the user, time, old value and new value for every change to business data.', 'every change to be recorded', [ac('a user changes a record', 'they save the change', 'an audit entry shows who changed what and when'), ac('a save fails', 'the change is not stored', 'no audit entry is written and the user is told the save failed')]],
      ['View change history', 'The system shall let an auditor view the change history of any record, newest first.', 'to see the change history of a record', [ac('an auditor', 'they open the history of a record', 'all changes are listed, newest first'), ac('a user without the auditor role', 'they try to open the history', 'access is refused')]],
    ] },
    { id: 'notify', title: 'Notifications', items: [
      ['Notify on status change', 'The system shall email the customer within 5 minutes when the status of their request changes.', 'to be notified when my request changes', [ac('a customer with a request', 'its status changes', 'they receive an email within 5 minutes'), ac('the email cannot be delivered', 'the notification fails', 'the status change still stands, the failure is logged and support can resend it')]],
      ['Choose notification channels', 'The system shall let users choose to receive each type of notification by email, SMS or not at all.', 'to choose how I am notified', [ac('a signed-in user', 'they change their notification settings', 'later notifications follow their choice'), ac('a user who opted out of SMS', 'an SMS notification is due', 'no SMS is sent')]],
    ] },
    { id: 'search', title: 'Search, filter & export', items: [
      ['Search records', 'The system shall return search results within 2 seconds for searches by name, reference number or date range.', 'to find a record quickly', [ac('records that match', 'the user searches by reference number', 'matching records are shown within 2 seconds'), ac('no records match', 'the user searches', 'a "no results" message suggests changing the search')]],
      ['Filter results', 'The system shall let users filter results by status, date range or owner.', 'to filter the list to what I need', [ac('a list of results', 'the user applies a status filter', 'only matching results are shown with the filter visible'), ac('a filter that matches nothing', 'it is applied', 'an empty state explains how to clear filters')]],
      ['Export results', 'The system shall export the current filtered results to a CSV file of up to 10 000 rows.', 'to export the results to Excel', [ac('a filtered list', 'the user exports it', 'a CSV with the visible columns downloads'), ac('more than 10 000 results', 'the user exports', 'they are asked to narrow the filter first')]],
    ] },
    { id: 'upload', title: 'File upload', items: [
      ['Upload documents', 'The system shall accept PDF, JPG or PNG files of up to 10 MB each.', 'to upload supporting documents', [ac('a valid PDF under 10 MB', 'the user uploads it', 'it is attached and listed with its name and size'), ac('a 15 MB file or an unsupported type', 'the user uploads it', 'it is rejected with the allowed types and size')]],
      ['Scan uploads for malware', 'The system shall scan every uploaded file for malware before it is stored.', 'uploads to be safe', [ac('a clean file', 'it is uploaded', 'it is stored after the scan passes'), ac('an infected file', 'it is uploaded', 'it is rejected, the user is told and security is alerted')]],
    ] },
  ],
  personas: [
    { id: 'roles', title: 'Common user roles & systems', items: [
      ['Administrator', 'Human', 'Configures the system, manages users and roles.'],
      ['Approver', 'Human', 'Reviews and approves or declines requests within their mandate.'],
      ['Customer', 'Human', 'Uses the self-service channel to request and track services.'],
      ['Support agent', 'Human', 'Helps customers, resolves issues and can view their records.'],
      ['Auditor', 'Human', 'Reviews records and change history; read-only access.'],
      ['External system', 'System', 'Another system that exchanges data with ours through an API or file.'],
    ] },
  ],
  raid: [
    { id: 'common', title: 'Common software-project RAID items', items: [
      ['Dependency', 'Third-party API test environment and credentials are available before integration testing starts.'],
      ['Assumption', 'Anonymised, POPIA-compliant test data is available for UAT.'],
      ['Risk', 'Key business stakeholders are not available for workshops and UAT, delaying sign-off.'],
      ['Risk', 'The privacy and security review is not completed before go-live.'],
      ['Dependency', 'A production cut-over and data migration window is agreed with operations.'],
      ['Assumption', 'Users have modern browsers and devices supported by the solution.'],
    ] },
  ],
};
