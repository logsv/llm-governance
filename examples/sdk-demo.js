import llm from '../libs/sdk/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChatPromptTemplate } from '@langchain/core/prompts';

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
        
        const promptTemplate = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant."],
            ["user", "{input}"]
        ]);
        
        const input = "Tell me a joke";
        const formattedMessages = await promptTemplate.formatMessages({ input });
        // For this mock, we just convert messages to a string representation
        const promptString = formattedMessages.map(m => `${m._getType()}: ${m.content}`).join('\n');

        const response = await llm.observe({
            input: promptString,
            model: "gpt-4",
            provider: "openai",
            metadata: { user: "alice" }
        }, async () => {
            return await callOpenAI(input); // Mock still needs the core intent, or we can pass the whole promptString
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Test 1 Failed:', err.message);
    }

    // 3. PII Request (Should be masked or flagged)
    try {
        console.log('\n--- Test 2: PII Leak Simulation ---');
        
        const promptTemplate = ChatPromptTemplate.fromMessages([
            ["system", "You are a helpful assistant that processes user data."],
            ["user", "{question}"]
        ]);
        
        const question = "What is your email?";
        const formattedMessages = await promptTemplate.formatMessages({ question });
        const promptString = formattedMessages.map(m => `${m._getType()}: ${m.content}`).join('\n');

        const response = await llm.observe({
            input: promptString,
            // model and provider are optional
            metadata: { user: "bob" }
        }, async () => {
            return await callOpenAI(question);
        });
        console.log('Response:', response);
    } catch (err) {
        console.error('Test 2 Exception:', err.message);
    }

    // 4. Input Guardrail (e.g. Prompt Injection or Secret)
    try {
        console.log('\n--- Test 3: Input Violation (Secret) ---');
        
        const promptTemplate = ChatPromptTemplate.fromMessages([
            ["system", "You are a secure assistant."],
            ["user", "{user_input}"]
        ]);

        const userInput = "Here is my API key: sk-1234567890abcdef1234567890abcdef";
        const formattedMessages = await promptTemplate.formatMessages({ user_input: userInput });
        const promptString = formattedMessages.map(m => `${m._getType()}: ${m.content}`).join('\n');

        const response = await llm.observe({
            input: promptString,
            // model and provider are optional
        }, async () => {
            return await callOpenAI(userInput);
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
