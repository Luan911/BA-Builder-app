// Pattern matcher for meeting notes, emails and briefs.
// It does not "understand" text: it recognises well-known requirement phrasing
// and sorts sentences into candidates that a person then confirms.

const NFR_HINTS =
  /\b(\d+(\.\d+)?\s?(ms|milliseconds?|seconds?|secs?|minutes?|%|percent|users|requests|tps|rps)|uptime|availability|available 24|response time|load time|latency|concurrent|throughput|encrypt\w*|secure|security|authenticat\w*|password|audit|backup|recover\w*|disaster|accessib\w*|wcag|gdpr|popia|hipaa|pci|compliance|scal\w+|browser|mobile[- ]friendly|languages?)\b/i;

const NFR_CATEGORY = [
  [/\b(ms|milliseconds?|seconds?|response time|load time|latency|throughput|tps|rps)\b/i, 'Performance'],
  [/\b(uptime|availability|available 24|downtime)\b/i, 'Availability'],
  [/\b(gdpr|popia|hipaa|personal (data|information)|consent|privacy)\b/i, 'Privacy'],
  [/\b(encrypt\w*|secure|security|authenticat\w*|password|audit|mfa|2fa|role)\b/i, 'Security'],
  [/\b(accessib\w*|wcag|screen reader)\b/i, 'Accessibility'],
  [/\b(concurrent|scal\w+|users at once|peak)\b/i, 'Scalability'],
  [/\b(backup|recover\w*|disaster|reliab\w*)\b/i, 'Reliability'],
  [/\b(pci|compliance|regulat\w*)\b/i, 'Compliance'],
  [/\b(browser|mobile[- ]friendly|device)\b/i, 'Compatibility'],
];

export function categoriseNfr(text) {
  for (const [re, cat] of NFR_CATEGORY) if (re.test(text)) return cat;
  return 'Performance';
}

function sentences(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap((line) => {
      const clean = line.replace(/^\s*(?:[-*•▪◦]|\d+[.)]|[a-z][.)])\s+/i, '').trim();
      if (!clean) return [];
      // Keep "As a ... so that ..." stories whole; otherwise split on sentence ends.
      if (/^as an?\s/i.test(clean)) return [clean];
      return clean.split(/(?<=[.!?])\s+(?=[A-Z"'(])/).map((s) => s.trim()).filter(Boolean);
    });
}

const STORY_RE = /^as an?\s+(.+?),?\s+i\s+(?:want|need|would like)\s+(?:to\s+)?(.+?)(?:,?\s+so\s+(?:that\s+)?(.+?))?[.!]?$/i;
const GWT_RE = /^given\s+(.+?),?\s+when\s+(.+?),?\s+then\s+(.+?)[.!]?$/i;

export function extractFromText(text) {
  const out = { stories: [], requirements: [], nfrs: [], rules: [], risks: [], assumptions: [], constraints: [], decisions: [], questions: [], acceptance: [] };
  const seen = new Set();
  for (const s of sentences(text)) {
    const key = s.toLowerCase();
    if (seen.has(key) || s.length < 6) continue;
    seen.add(key);

    let m = s.match(STORY_RE);
    if (m) {
      out.stories.push({ actor: titleCase(m[1]), want: m[2].trim(), benefit: (m[3] || '').trim(), source: s });
      continue;
    }
    m = s.match(GWT_RE);
    if (m) {
      out.acceptance.push({ given: m[1], when: m[2], then: m[3], source: s });
      continue;
    }
    if (/\?\s*$/.test(s)) { out.questions.push({ text: s }); continue; }
    if (/^(decision|decided|agreed|we (have )?(decided|agreed)|it was (decided|agreed)|resolution)\b[:\s-]*/i.test(s) || /\b(it was|we have|we) (decided|agreed) (that|to)\b/i.test(s)) {
      out.decisions.push({ text: s.replace(/^(decision|resolution)\s*[:-]\s*/i, '') });
      continue;
    }
    if (/^(risk|concern)\s*[:-]/i.test(s) || /\b(risk that|there is a risk|might not|may not be (ready|available)|could delay|could fail|is a concern)\b/i.test(s)) {
      out.risks.push({ text: s.replace(/^(risk|concern)\s*[:-]\s*/i, '') });
      continue;
    }
    if (/^assum\w*\s*[:-]/i.test(s) || /\b(we assume|assuming|it is assumed|assumption is)\b/i.test(s)) {
      out.assumptions.push({ text: s.replace(/^assum\w*\s*[:-]\s*/i, '') });
      continue;
    }
    if (/^(constraint|limitation)\s*[:-]/i.test(s) || /\b(must be hosted|cannot exceed|may not exceed|limited to|no more than|budget (is|of)|deadline|must go live (by|before))\b/i.test(s)) {
      out.constraints.push({ text: s.replace(/^(constraint|limitation)\s*[:-]\s*/i, '') });
      continue;
    }
    if (/^(rule|business rule)\s*[:-]/i.test(s) || (!NFR_HINTS.test(s) && /\b(only if|not allowed|is not permitted|at most|at least|maximum of|minimum of|must not be more than)\b/i.test(s))) {
      out.rules.push({ text: s.replace(/^(business rule|rule)\s*[:-]\s*/i, '') });
      continue;
    }
    if (/\b(shall|must|should|needs? to|has to|have to|is required to|are required to|will need to|requires?)\b/i.test(s)) {
      // "be able to" / "allow" describes behaviour (functional) even if it mentions e.g. passwords.
      const behaviour = /\b(be able to|allow\w*|let|enable\w*|can)\b/i.test(s);
      if (NFR_HINTS.test(s) && !behaviour) out.nfrs.push({ text: s, category: categoriseNfr(s) });
      else out.requirements.push({ text: s, statement: toShall(s) });
    }
  }
  return out;
}

/** Rewrite a sentence into "The system shall ..." form where the pattern is clear. */
export function toShall(s) {
  let t = s.trim().replace(/[.!]+$/, '');
  if (/\bshall\b/i.test(t)) return `${t}.`;
  t = t.replace(/\b(must|should|needs? to|has to|have to|is required to|are required to|will need to)\b/i, 'shall');
  if (!/\bshall\b/i.test(t)) return `The system shall ${lower(t)}.`;
  // "Users must be able to ..." -> "The system shall allow users to ..."
  const m = t.match(/^(.*?)\s+shall\s+be able to\s+(.*)$/i);
  if (m && !/^the system$/i.test(m[1])) return `The system shall allow ${lower(m[1])} to ${m[2]}.`;
  if (/^(it|we|this)\b/i.test(t)) t = t.replace(/^(it|we|this)\b/i, 'The system');
  return `${upper(t)}.`;
}

/** Turn a story's "want" into a short title, e.g. "book an appointment online". */
export function titleFrom(text) {
  return upper(String(text || '').replace(/^(the system shall|shall|to)\s+/i, '').replace(/[.!]+$/, '').slice(0, 80));
}

const lower = (s) => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const upper = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const titleCase = (s) => s.trim().replace(/\b\w/g, (c) => c.toUpperCase());
