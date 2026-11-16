// The guided "Build your spec" wizard: 10 steps in SDLC order.
// Each step edits one or more sections. Rules point at sections; this maps them to steps.

export const STEPS = [
  { id: 'basics', title: 'Project basics', hint: 'Name, problem and scope', sections: ['project'], phase: 'initiation' },
  { id: 'goals', title: 'Goals', hint: 'What success looks like', sections: ['objectives'], phase: 'initiation' },
  { id: 'people', title: 'People', hint: 'Stakeholders and users', sections: ['stakeholders'], phase: 'initiation' },
  { id: 'requirements', title: 'Requirements', hint: 'What the system must do', sections: ['requirements'], phase: 'requirements' },
  { id: 'quality', title: 'Quality & rules', hint: 'Speed, security, business rules', sections: ['nfrs', 'rules'], phase: 'requirements' },
  { id: 'data', title: 'Data', hint: 'What information is stored', sections: ['entities'], phase: 'design' },
  { id: 'processes', title: 'Processes', hint: 'How the work flows', sections: ['processes'], phase: 'design' },
  { id: 'systems', title: 'Systems', hint: 'Integrations and architecture', sections: ['integrations', 'components'], phase: 'design' },
  { id: 'plan', title: 'Releases', hint: 'What ships when', sections: ['releases'], phase: 'build' },
  { id: 'risks', title: 'Risks & decisions', hint: 'RAID log, decisions, questions', sections: ['raid', 'decisions'], phase: 'initiation' },
];

export const stepIndex = (id) => Math.max(0, STEPS.findIndex((s) => s.id === id));
export const stepForSection = (section) => STEPS.find((s) => s.sections.includes(section)) || STEPS[0];
export const stepRoute = (stepId) => `#/build/${stepId}`;
