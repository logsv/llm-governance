import { GuardrailViolation } from '../errors.js';

export const externalUrlsValidator = {
    validate: async ({ input, output, config }) => {
        const text = typeof output === 'string' ? output : (typeof input === 'string' ? input : JSON.stringify(output || input));
        
        // Regex to find URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex) || [];
        
        if (urls.length === 0) return;

        const allowedDomains = config.allowlist_domains || [];
        const violations = [];

        for (const url of urls) {
            try {
                const urlObj = new URL(url);
                const domain = urlObj.hostname;
                
                // Check if domain is allowed
                // We handle subdomains strictly or loosely? Let's do endsWith for looseness
                const isAllowed = allowedDomains.some(allowed => 
                    domain === allowed || domain.endsWith('.' + allowed)
                );

                if (!isAllowed) {
                    violations.push(url);
                }
            } catch (e) {
                // Invalid URL format, maybe ignore
            }
        }

        if (violations.length > 0) {
             throw new GuardrailViolation('Unauthorized external URLs detected', {
                guardrail: 'external_urls',
                type: 'unauthorized_url',
                value: violations,
                metadata: { urls: violations }
             });
        }
    }
};
