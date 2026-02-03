import { GuardrailViolation } from '../errors.js';

export const gibberishValidator = {
    validate: async ({ input, output, config }) => {
        const text = typeof output === 'string' ? output : (typeof input === 'string' ? input : JSON.stringify(output || input));
        
        // Simple heuristic: unique character ratio
        // Gibberish often has high repetition (e.g., "asdfasdfasdf") or very low repetition of common chars?
        // Actually, "lkajsdflkjasdflkj" has low unique chars relative to length.
        // Random strings "8973425hkjh" might have high entropy.
        
        // Let's use a simple approach: 
        // 1. Check for repeated characters (e.g. "aaaaa")
        // 2. Check for lack of spaces in long strings (if sentence expected)
        
        const threshold = config.threshold || 0.8; // Not used in this simple heuristic yet
        
        // Check 1: Long uninterrupted strings (potential keyboard smash or hex dump)
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.length > 30 && !word.includes('-') && !word.includes('.')) {
                 // Exempt URLs potentially, but this is a rough check
                 throw new GuardrailViolation('Gibberish detected (long uninterrupted string)', {
                    guardrail: 'gibberish_detection',
                    type: 'gibberish',
                    value: word,
                    metadata: { reason: 'long_word' }
                 });
            }
        }

        // Check 2: Character Repetition
        // e.g. "hahahahaha" or "aaaaaaa"
        if (/(.)\1{9,}/.test(text)) {
             throw new GuardrailViolation('Gibberish detected (character repetition)', {
                guardrail: 'gibberish_detection',
                type: 'gibberish',
                value: text.match(/(.)\1{9,}/)[0],
                metadata: { reason: 'repetition' }
             });
        }
        
        // Check 3: Low Vowel Count (English specific)
        // Normal English text usually has ~30-40% vowels.
        const vowels = text.match(/[aeiouy]/gi);
        const letters = text.match(/[a-z]/gi);
        
        if (letters && letters.length > 10) {
            const ratio = (vowels ? vowels.length : 0) / letters.length;
            if (ratio < 0.05) { // Very low vowel count
                 throw new GuardrailViolation('Gibberish detected (low vowel count)', {
                    guardrail: 'gibberish_detection',
                    type: 'gibberish',
                    value: ratio,
                    metadata: { reason: 'low_vowels', ratio }
                 });
            }
        }
    }
};
