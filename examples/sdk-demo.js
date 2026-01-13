import llm from '../libs/sdk/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.resolve(__dirname, '../libs/guardrails/policies/default-enterprise-guardrails.yml');

// Mock LLM Provider
async function callOpenAI(prompt) {
    console.log(`[MockProvider] Calling OpenAI with: "${prompt}"`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Latency
    
    // Simulate PII response for testing guardrails
    if (prompt.includes('email')) {
        return "Sure, my email is test@example.com";
    }
    
    return "This is a safe response from the LLM.";
}

async function runDemo() {
    console.log('--- Starting SDK Demo ---');
    
    // 1. Initialize SDK
    llm.init({
        policyPath: POLICY_PATH,
        strict: true
    });

    console.log('SDK Initialized.');

    // 2. Safe Request
    try {
        console.log('\n--- Test 1: Safe Request ---');
        const response = await llm.observe({
            input: "Tell me a joke",
            model: "gpt-4",
            provider: "openai",
            metadata: { user: "alice" }
        }, async () => {
            return await callOpenAI("Tell me a joke");
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Test 1 Failed:', err.message);
    }

    // 3. PII Request (Should be masked or flagged)
    try {
        console.log('\n--- Test 2: PII Leak Simulation ---');
        // The mock provider returns an email. The output guardrail should catch it.
        // We need to pass the output to the engine. 
        // Note: The current SDK implementation runs output guardrails on the return value of the function.
        
        const response = await llm.observe({
            input: "What is your email?",
            // model and provider are optional
            metadata: { user: "bob" }
        }, async () => {
            return await callOpenAI("What is your email?");
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Test 2 Exception:', err.message);
    }

    // 4. Input Guardrail (e.g. Prompt Injection or Secret)
    try {
        console.log('\n--- Test 3: Input Violation (Secret) ---');
        // Assuming default policy has secrets detection
        const response = await llm.observe({
            input: "Here is my API key: sk-1234567890abcdef1234567890abcdef",
            // model and provider are optional
        }, async () => {
            return await callOpenAI("Here is my API key...");
        });
        console.log('Response:', response);
    } catch (err) {
        console.log('Test 3 Caught Expected Violation:', err.message);
    }
    
    // Wait for async logs to process (if any)
    console.log('\nDemo complete. Waiting for logs to flush...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    process.exit(0);
}

runDemo();
