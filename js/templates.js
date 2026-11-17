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
];
