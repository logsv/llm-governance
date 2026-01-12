import llm from '../libs/sdk/index.js';
import { BaseLLMProvider } from '@llm-governance/gateway';

// Mock Provider for Demo
class MockProvider extends BaseLLMProvider {
    async generate(messages, config) {
        const lastMsg = messages[messages.length - 1].content;
        console.log(`[MockProvider] Generating response for: "${lastMsg.substring(0, 50)}..."`);
        
        // Mock Judge Responses (Must return JSON)
        if (lastMsg.includes('You are an impartial AI Judge')) {
            return {
                content: JSON.stringify({
                    relevance: 5,
                    accuracy: 5,
                    clarity: 5,
                    hallucination_risk: 1,
                    overall_score: 5,
                    reasoning: "Perfect response."
                })
            };
        }

        // Mock Candidate Responses
        if (lastMsg.includes('joke')) {
            return { content: "Why did the chicken cross the road? To get to the other side!" };
        }

        return { content: "Mock response" };
    }
}

async function runDemo() {
    console.log("--- Starting Evaluation SDK Demo ---");

    // 1. Setup Mock Provider
    const mockProvider = new MockProvider({});
    llm.gateway.registerProvider('mock', mockProvider);

    // 2. Define a Test Dataset
    const dataset = [
        {
            input: "Tell me a joke about chickens",
            expected_traits: {
                tone: "humorous",
                topic: "chickens"
            }
        }
    ];

    // 3. Run Evaluation (Without Prompt ID for simplicity in this demo)
    // In a real scenario, you'd use llm.prompts.create() first.
    console.log("\n--- Running Evaluation ---");
    const results = await llm.evaluation.run({
        dataset: dataset,
        config: {
            provider: 'mock',
            model: 'demo-model'
        },
        judgeConfig: {
            primary: {
                provider: 'mock',
                model: 'judge-model'
            }
        }
    });

    console.log("\n--- Evaluation Results ---");
    console.log(JSON.stringify(results, null, 2));
}

runDemo().catch(console.error);
