import { GuardrailViolation } from '../errors.js';

const DEFAULT_UNGROUNDED_PATTERNS = [
  /studies\s+show/gi,
  /research\s+shows?/gi,
  /according\s+to\s+(experts|scientists|reports|sources)/gi,
  /statistics\s+show/gi,
  /data\s+shows?/gi,
];

const DEFAULT_CITATION_PATTERNS = [
  /https?:\/\/\S+/gi,
  /\[[^\]]+\]\([^\)]+\)/g, // markdown link style
  /source\s*:\s*\S+/gi,
];

function collectMatches(text, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found && found.length > 0) {
      matches.push(...found);
    }
  }
  return matches;
}

export const hallucinationValidator = {
  validate: async ({ output, config = {} }) => {
    const text = typeof output === 'string' ? output : JSON.stringify(output || '');

    if (!text || text.trim().length === 0) {
      return;
    }

    const ungroundedClaims = collectMatches(text, DEFAULT_UNGROUNDED_PATTERNS);
    if (ungroundedClaims.length === 0) {
      return;
    }

    const hasCitations = collectMatches(text, DEFAULT_CITATION_PATTERNS).length > 0;
    if (!hasCitations) {
      throw new GuardrailViolation('Potential hallucination: ungrounded factual claim', {
        guardrail: 'hallucination_detection',
        type: 'ungrounded_claim',
        value: ungroundedClaims.slice(0, 3),
        metadata: {
          strategy: config.strategy || 'heuristic',
          requires_citation: true,
        },
      });
    }
  },
};
