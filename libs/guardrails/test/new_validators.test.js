import { describe, it } from 'node:test';
import assert from 'node:assert';
import { competitorsValidator } from '../src/validators/competitors.js';
import { gibberishValidator } from '../src/validators/gibberish.js';
import { externalUrlsValidator } from '../src/validators/external-urls.js';

describe('New Validators', () => {
    describe('Competitors Validator', () => {
        it('should detect competitors', async () => {
            await assert.rejects(async () => {
                await competitorsValidator.validate({
                    input: 'I think CompetitorX is better.',
                    config: { competitors: ['CompetitorX'] }
                });
            }, (err) => {
                assert.strictEqual(err.name, 'GuardrailViolation');
                assert.ok(err.value.includes('CompetitorX'));
                return true;
            });
        });

        it('should allow non-competitors', async () => {
            await competitorsValidator.validate({
                input: 'I love this product.',
                config: { competitors: ['CompetitorX'] }
            });
        });
    });

    describe('Gibberish Validator', () => {
        it('should detect character repetition', async () => {
            await assert.rejects(async () => {
                await gibberishValidator.validate({
                    input: 'This is greaaaaaaaaaat',
                    config: {}
                });
            }, (err) => {
                assert.strictEqual(err.name, 'GuardrailViolation');
                assert.ok(err.message.includes('repetition'));
                return true;
            });
        });

        it('should detect low vowel count', async () => {
            await assert.rejects(async () => {
                await gibberishValidator.validate({
                    input: 'thxqzlwmvkthxqzlwmvk', // 20 chars, no vowels
                    config: {}
                });
            }, (err) => {
                assert.strictEqual(err.name, 'GuardrailViolation');
                assert.ok(err.message.includes('low vowel count'));
                return true;
            });
        });

        it('should allow normal text', async () => {
            await gibberishValidator.validate({
                input: 'This is a normal sentence.',
                config: {}
            });
        });
    });

    describe('External URLs Validator', () => {
        it('should detect unauthorized URLs', async () => {
            await assert.rejects(async () => {
                await externalUrlsValidator.validate({
                    input: 'Check this out: https://malicious.com',
                    config: { allowlist_domains: ['example.com'] }
                });
            }, (err) => {
                assert.strictEqual(err.name, 'GuardrailViolation');
                assert.ok(err.value.includes('https://malicious.com'));
                return true;
            });
        });

        it('should allow authorized URLs', async () => {
            await externalUrlsValidator.validate({
                input: 'Check this out: https://example.com/page',
                config: { allowlist_domains: ['example.com'] }
            });
        });
    });
});
