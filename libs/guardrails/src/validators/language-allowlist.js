import { GuardrailViolation } from '../errors.js';

function detectLanguageTag(text = '') {
  const normalized = String(text);

  // Non-Latin scripts are definitely not English.
  if (/[^\u0000-\u024F\u1E00-\u1EFF\s\d\p{P}\p{S}]/u.test(normalized)) {
    return 'non_latin';
  }

  // Heuristic: if mostly ASCII letters/digits/punctuation, classify as English.
  const letters = normalized.match(/[A-Za-z]/g) || [];
  const latinExtended = normalized.match(/[À-ÖØ-öø-ÿ]/g) || [];
  const alphaCount = letters.length + latinExtended.length;

  if (alphaCount === 0) {
    return 'unknown';
  }

  const asciiRatio = letters.length / alphaCount;
  return asciiRatio >= 0.85 ? 'en' : 'latin_non_en';
}

export const languageAllowlistValidator = {
  validate: async ({ input, config }) => {
    const allowed = (config.allowed_languages || ['en']).map((lang) => String(lang).toLowerCase());

    if (allowed.length === 0) {
      return;
    }

    const text = typeof input === 'string' ? input : JSON.stringify(input || '');
    const detected = detectLanguageTag(text);

    if (detected === 'unknown') {
      return;
    }

    const passes =
      allowed.includes(detected) || (detected === 'latin_non_en' && allowed.includes('latin'));
    if (!passes) {
      throw new GuardrailViolation('Input language is not in allowlist', {
        guardrail: 'language_allowlist',
        type: 'unsupported_language',
        value: detected,
        metadata: {
          allowed_languages: allowed,
          detected_language: detected,
        },
      });
    }
  },
};
