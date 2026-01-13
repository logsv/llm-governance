import { GuardrailsEngine, loadPolicy, validators } from '@llm-governance/guardrails';
import { persistenceService, calculateCost } from '@llm-governance/observability';
import { runWithContext } from './context.js';
import crypto from 'crypto';

let engine = null;
let initialized = false;

// Initialize the SDK with configuration
export function init(config) {
    if (initialized) return;

    if (config.policyPath) {
        try {
            const policy = loadPolicy(config.policyPath);
      engine = new GuardrailsEngine(policy, validators);
      console.log('LLM Guardrails SDK initialized with policy:', config.policyPath);
    } catch (err) {
      console.error('Failed to load guardrails policy:', err);
            if (config.strict) throw err;
        }
    } else if (config.policy) {
        engine = new GuardrailsEngine(config.policy, validators);
    }

    initialized = true;
}

export async function observe(options, fn) {
    if (!initialized && options.policyPath) {
        init({ policyPath: options.policyPath });
    }

    const start = Date.now();
    const requestId = crypto.randomUUID();
    
    // Default metadata
    const metadata = {
        requestId,
        timestamp: new Date(),
        ...options.metadata,
        guardrail_violations: [] // Track all violations here
    };

    return runWithContext({ requestId, metadata }, async () => {
        try {
            // 1. Input Guardrails
            if (engine && options.input) {
                const validation = await engine.executeInput({ 
                    input: options.input,
                    context: metadata 
                });
                
                if (validation.violations && validation.violations.length > 0) {
                    metadata.guardrail_violations.push(...validation.violations.map(v => ({
                        guardrail: v.guardrail,
                        message: v.message,
                        value: v.value
                    })));
                }

                // If modified input is returned (e.g. masked), we can't easily update fn args
                // unless the user code is aware. For now, we assume validation pass/fail/mask.
            }

            // 2. Execute User Function
            let result;
            try {
                result = await fn();
            } catch (err) {
                // Record execution error
                await persistenceService.logRequest({
                    ...metadata,
                    latencyMs: Date.now() - start,
                    status: 'error',
                    errorCode: err.code || 'EXECUTION_ERROR',
                    errorMessage: err.message
                });
                throw err;
            }

            // 3. Output Guardrails
            if (engine && result) {
                // Determine output string/object
                // If result is an object with 'content' (like OpenAI), use that.
                // Or just stringify the whole thing?
                // Let's try to be smart: if result.content exists, check that.
                // But user might want to check full JSON.
                // We'll use result as is if possible, or stringify.
                
                const outputToCheck = result.content || result; 

                const guardResult = await engine.executeOutput({ 
                    output: outputToCheck,
                    context: metadata
                });
                
                if (guardResult.violations && guardResult.violations.length > 0) {
                    metadata.guardrail_violations.push(...guardResult.violations.map(v => ({
                        guardrail: v.guardrail,
                        message: v.message,
                        value: v.value
                    })));
                }

                if (guardResult && guardResult.output) {
                     // If result was an object and we checked content, we update content
                     if (result.content && typeof guardResult.output === 'string') {
                         result.content = guardResult.output;
                     } else {
                         result = guardResult.output;
                     }
                }
            }

            // 4. Observability & Cost
            const latencyMs = Date.now() - start;
            
            // Calculate cost if usage provided
            let tokensIn = 0;
            let tokensOut = 0;

            if (options.usage) {
                tokensIn = options.usage.prompt_tokens || 0;
                tokensOut = options.usage.completion_tokens || 0;
            }

            // Persist Log (Fire and forget to avoid blocking)
            persistenceService.logRequest({
                ...metadata,
                latencyMs,
                status: 'success',
                model: options.model,
                provider: options.provider,
                tokensIn,
                tokensOut
            }).catch(err => console.error('Async Log Error:', err));

            return result;

        } catch (err) {
            // If guardrail violation (Reject Action), log it
            if (err.name === 'GuardrailViolation') {
                metadata.guardrail_violations.push({
                    guardrail: err.guardrail,
                    message: err.message,
                    value: err.value
                });
                
                // Fire and forget logging
                persistenceService.logRequest({
                    ...metadata,
                    latencyMs: Date.now() - start,
                    status: 'blocked',
                    errorCode: 'GUARDRAIL_VIOLATION',
                    errorMessage: err.message
                }).catch(e => console.error('Async Log Error:', e));
            }
            throw err;
        }
    });
}
