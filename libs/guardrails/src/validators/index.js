import { inputSizeValidator } from './input-size.js';
import { piiValidator } from './pii.js';
import { secretsValidator } from './secrets.js';
import { promptInjectionValidator } from './prompt-injection.js';
import { schemaValidator } from './schema.js';
import { profanityValidator } from './profanity.js';
import { toxicityValidator } from './toxicity.js';
import { competitorsValidator } from './competitors.js';
import { gibberishValidator } from './gibberish.js';
import { externalUrlsValidator } from './external-urls.js';

const noopValidator = {
    validate: async () => { /* allow */ }
};

export const validators = {
    size_limits: inputSizeValidator,
    pii_detection: piiValidator,
    secrets_detection: secretsValidator,
    prompt_injection: promptInjectionValidator,
    schema_validation: schemaValidator,
    profanity_filter: profanityValidator,
    toxicity_detection: toxicityValidator,
    sensitive_content: toxicityValidator,  
    competitors_detection: competitorsValidator,
    gibberish_detection: gibberishValidator,
    external_urls: externalUrlsValidator,
    
    // Missing implementations - mapped to noop for now
    language_allowlist: noopValidator,
    tool_access: noopValidator,
    hallucination_detection: noopValidator,
    factuality_check: noopValidator,
};
