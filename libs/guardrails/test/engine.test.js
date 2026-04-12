import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GuardrailsEngine, GuardrailViolation } from '../src/index.js';

// Mock Validators
const mockValidators = {
  size_limits: {
    validate: async ({ input, config }) => {
      if (input.length > config.max) {
        throw new GuardrailViolation('Too large', { guardrail: 'size_limits' });
      }
    },
  },
  pii_detection: {
    validate: async ({ input, config }) => {
      if (input.includes('email')) {
        throw new GuardrailViolation('PII', { guardrail: 'pii_detection' });
      }
    },
  },
  output_check: {
    validate: async ({ output, config }) => {
      if (output.includes('bad')) {
        if (config.action === 'sanitize') {
          return { sanitized: output.replace('bad', 'good') };
        }
        throw new GuardrailViolation('Bad output', { guardrail: 'output_check' });
      }
    },
  },
  tool_access: {
    validate: async ({ context, config }) => {
      const requested = context?.requestedTools || [];
      const allowed = config.allowed_tools || [];
      const invalid = requested.filter((tool) => !allowed.includes(tool));
      if (invalid.length > 0) {
        throw new GuardrailViolation('Tool not allowed', {
          guardrail: 'tool_access',
          value: invalid,
        });
      }
    },
  },
};

describe('Guardrails Engine', () => {
  it('should pass valid input', async () => {
    const policy = {
      input: {
        size_limits: { enabled: true, max: 10, action: 'reject' },
      },
    };
    const engine = new GuardrailsEngine(policy, mockValidators);
    const result = await engine.executeInput({ input: 'short' });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.violations.length, 0);
  });

  it('should reject invalid input (fail_closed/reject)', async () => {
    const policy = {
      input: {
        size_limits: { enabled: true, max: 3, action: 'reject' },
      },
    };
    const engine = new GuardrailsEngine(policy, mockValidators);
    await assert.rejects(
      async () => {
        await engine.executeInput({ input: 'long input' });
      },
      (err) => {
        assert.strictEqual(err.name, 'GuardrailViolation');
        return true;
      },
    );
  });

  it('should collect violations if action is not reject (e.g. flag)', async () => {
    const policy = {
      input: {
        size_limits: { enabled: true, max: 3, action: 'flag' },
      },
    };
    const engine = new GuardrailsEngine(policy, mockValidators);
    const result = await engine.executeInput({ input: 'long input' });
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.violations.length, 1);
  });

  it('should reject disallowed tools in context policy', async () => {
    const policy = {
      context: {
        tool_access: { enabled: true, allowed_tools: ['search'], action_on_violation: 'reject' },
      },
    };

    const engine = new GuardrailsEngine(policy, mockValidators);
    await assert.rejects(
      async () => {
        await engine.executeContext({ context: { requestedTools: ['terminal'] } });
      },
      (err) => {
        assert.strictEqual(err.name, 'GuardrailViolation');
        assert.strictEqual(err.guardrail, 'tool_access');
        return true;
      },
    );
  });

  it('should sanitize output', async () => {
    const policy = {
      output: {
        output_check: { enabled: true, action: 'sanitize' },
      },
    };
    const engine = new GuardrailsEngine(policy, mockValidators);
    const result = await engine.executeOutput({ output: 'this is bad' });
    assert.strictEqual(result.output, 'this is good');
  });
});
