import { GuardrailViolation, RetryRequest } from './errors.js';

export class GuardrailsEngine {
  constructor(policy, validators) {
    this.policy = policy;
    this.validators = validators;
  }

  async executeInput({ input, context }) {
    return this.executeRules({
      rules: this.policy.input,
      payload: { input, context },
      phase: 'input',
    });
  }

  async executeContext({ input, context }) {
    return this.executeRules({
      rules: this.policy.context,
      payload: { input, context },
      phase: 'context',
    });
  }

  async executeOutput({ output, context }) {
    return this.executeRules({
      rules: this.policy.output,
      payload: { output, context },
      phase: 'output',
    });
  }

  async executeRules({ rules, payload, phase }) {
    if (!rules) {
      return {
        allowed: true,
        violations: [],
        ...('output' in payload ? { output: payload.output } : {}),
      };
    }

    const violations = [];
    let currentOutput = payload.output;

    for (const [key, config] of Object.entries(rules)) {
      if (!config?.enabled) continue;

      const validator = this.validators[key];
      if (!validator) {
        console.warn(`Validator not found for ${phase} guardrail: ${key}`);
        continue;
      }

      try {
        const result = await validator.validate({
          ...payload,
          output: currentOutput,
          config,
        });

        if (phase === 'output' && result) {
          if (result.output) {
            currentOutput = result.output;
          } else if (result.sanitized) {
            currentOutput = result.sanitized;
          }

          if (result.violation) {
            violations.push(new GuardrailViolation(result.violation.message, result.violation));
          }
        }
      } catch (err) {
        if (!(err instanceof GuardrailViolation)) {
          throw err;
        }

        violations.push(err);
        const action = config.action || config.action_on_violation || 'reject';

        if (action === 'reject') {
          throw err;
        }
        if (action === 'retry' && phase === 'output') {
          throw new RetryRequest('Guardrail requested retry', { guardrail: key });
        }
      }
    }

    const response = { allowed: true, violations };
    if (phase === 'output') {
      response.output = currentOutput;
    }
    return response;
  }
}
