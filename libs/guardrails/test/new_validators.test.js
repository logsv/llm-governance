import { describe, it } from 'node:test';
import assert from 'node:assert';
import { competitorsValidator } from '../src/validators/competitors.js';
import { gibberishValidator } from '../src/validators/gibberish.js';
import { externalUrlsValidator } from '../src/validators/external-urls.js';
import { languageAllowlistValidator } from '../src/validators/language-allowlist.js';
import { toolAccessValidator } from '../src/validators/tool-access.js';
import { hallucinationValidator } from '../src/validators/hallucination.js';

describe('New Validators', () => {
  describe('Competitors Validator', () => {
    it('should detect competitors', async () => {
      await assert.rejects(
        async () => {
          await competitorsValidator.validate({
            input: 'I think CompetitorX is better.',
            config: { competitors: ['CompetitorX'] },
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.ok(err.value.includes('CompetitorX'));
          return true;
        },
      );
    });

    it('should allow non-competitors', async () => {
      await competitorsValidator.validate({
        input: 'I love this product.',
        config: { competitors: ['CompetitorX'] },
      });
    });
  });

  describe('Gibberish Validator', () => {
    it('should detect character repetition', async () => {
      await assert.rejects(
        async () => {
          await gibberishValidator.validate({
            input: 'This is greaaaaaaaaaat',
            config: {},
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.ok(err.message.includes('repetition'));
          return true;
        },
      );
    });

    it('should detect low vowel count', async () => {
      await assert.rejects(
        async () => {
          await gibberishValidator.validate({
            input: 'thxqzlwmvkthxqzlwmvk',
            config: {},
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.ok(err.message.includes('low vowel count'));
          return true;
        },
      );
    });

    it('should allow normal text', async () => {
      await gibberishValidator.validate({
        input: 'This is a normal sentence.',
        config: {},
      });
    });
  });

  describe('External URLs Validator', () => {
    it('should detect unauthorized URLs', async () => {
      await assert.rejects(
        async () => {
          await externalUrlsValidator.validate({
            input: 'Check this out: https://malicious.com',
            config: { allowlist_domains: ['example.com'] },
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.ok(err.value.includes('https://malicious.com'));
          return true;
        },
      );
    });

    it('should allow authorized URLs', async () => {
      await externalUrlsValidator.validate({
        input: 'Check this out: https://example.com/page',
        config: { allowlist_domains: ['example.com'] },
      });
    });
  });

  describe('Language Allowlist Validator', () => {
    it('should reject non-English text when only English is allowed', async () => {
      await assert.rejects(
        async () => {
          await languageAllowlistValidator.validate({
            input: 'Это тест на русском языке',
            config: { allowed_languages: ['en'] },
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.strictEqual(err.guardrail, 'language_allowlist');
          return true;
        },
      );
    });

    it('should allow English text', async () => {
      await languageAllowlistValidator.validate({
        input: 'This is a valid English sentence.',
        config: { allowed_languages: ['en'] },
      });
    });
  });

  describe('Hallucination Validator', () => {
    it('should flag ungrounded factual framing without citation', async () => {
      await assert.rejects(
        async () => {
          await hallucinationValidator.validate({
            output: 'Studies show this treatment works for 95% of patients.',
            config: { strategy: 'heuristic' },
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.strictEqual(err.guardrail, 'hallucination_detection');
          return true;
        },
      );
    });

    it('should allow claim framing when citation exists', async () => {
      await hallucinationValidator.validate({
        output: 'Studies show this works. Source: https://example.org/study',
        config: { strategy: 'heuristic' },
      });
    });
  });

  describe('Tool Access Validator', () => {
    it('should reject unauthorized tools', async () => {
      await assert.rejects(
        async () => {
          await toolAccessValidator.validate({
            context: { requestedTools: ['browser', 'search'] },
            config: { allowed_tools: ['search'] },
          });
        },
        (err) => {
          assert.strictEqual(err.name, 'GuardrailViolation');
          assert.strictEqual(err.guardrail, 'tool_access');
          return true;
        },
      );
    });

    it('should allow authorized tools', async () => {
      await toolAccessValidator.validate({
        context: { requestedTools: ['search'] },
        config: { allowed_tools: ['search', 'calculator'] },
      });
    });
  });
});
