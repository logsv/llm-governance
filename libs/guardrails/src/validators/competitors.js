import { GuardrailViolation } from '../errors.js';

export const competitorsValidator = {
    validate: async ({ input, output, config }) => {
        const text = typeof output === 'string' ? output : (typeof input === 'string' ? input : JSON.stringify(output || input));
        const competitors = config.competitors || [];
        const detected = [];

        const lowerText = text.toLowerCase();
        
        for (const competitor of competitors) {
            // Simple inclusion check, can be improved with regex for word boundaries
            if (lowerText.includes(competitor.toLowerCase())) {
                detected.push(competitor);
            }
        }

        if (detected.length > 0) {
            throw new GuardrailViolation('Competitor mention detected', {
                guardrail: 'competitors_detection',
                type: 'competitor_mention',
                value: detected,
                metadata: { competitors: detected }
            });
        }
    }
};
