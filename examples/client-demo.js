/**
 * Example Client for LLM Governance Platform
 * 
 * Demonstrates:
 * 1. Creating a Prompt
 * 2. Sending a Request via Gateway (using the prompt)
 * 3. Checking for Guardrails (simulated violation)
 * 4. Triggering an Evaluation
 */

const API_URL = 'http://localhost:3000';

async function main() {
  console.log('🚀 Starting LLM Governance Demo Client...\n');

  try {
    // 1. Create a Prompt
    console.log('1️⃣  Creating a new Prompt...');
    const promptRes = await fetch(`${API_URL}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `customer-support-${Date.now()}`,
        description: 'Standard support response',
        template: 'You are a helpful support agent. User says: {{user_input}}',
        initialVersion: {
            version: '1.0.0',
            template: 'You are a helpful support agent. User says: {{user_input}}',
            metadata: { model: 'gpt-3.5-turbo' }
        }
      })
    });
    
    if (!promptRes.ok) throw new Error(await promptRes.text());
    const prompt = await promptRes.json();
    console.log(`✅ Prompt Created: ${prompt.name} (ID: ${prompt.id})\n`);

    // 2. Execute Request via Gateway
    console.log('2️⃣  Executing LLM Request...');
    const chatRes = await fetch(`${API_URL}/llm/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_id: prompt.id, // Use the prompt we just created
        input: {
            user_input: "My payment failed."
        },
        config: {
            provider: "openai", // Assuming mock or configured
            model: "gpt-3.5-turbo"
        },
        env: "dev"
      })
    });

    const chatData = await chatRes.json();
    console.log(`✅ Response Received:`);
    console.log(`   Content: ${chatData.choices?.[0]?.message?.content || JSON.stringify(chatData)}\n`);

    // 3. Demonstrate Guardrail Violation (PII)
    console.log('3️⃣  Testing Guardrails (PII Injection)...');
    const failRes = await fetch(`${API_URL}/llm/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // No prompt_id, direct input
          messages: [{ role: 'user', content: "My email is test@example.com and my secret is 12345." }],
          config: { provider: "openai" },
          env: "prod" // Guardrails usually active in prod
        })
      });
  
    if (failRes.status === 400 || failRes.status === 422) {
        const err = await failRes.json();
        console.log(`🛡️  Guardrail Caught It! Status: ${failRes.status}`);
        console.log(`   Error: ${JSON.stringify(err)}\n`);
    } else {
        console.log(`⚠️  Request Passed (Guardrails might be permissive or PII detector needs specific config). Status: ${failRes.status}\n`);
    }

    // 4. Trigger Evaluation (Mock)
    // Note: The API usually exposes endpoints for this, or it runs in background.
    // If we implemented an explicit eval endpoint, we'd call it here.
    // For now, let's just log that it's an async process.
    console.log('4️⃣  Evaluation & Observability');
    console.log('   - Metrics are available at http://localhost:3000/metrics');
    console.log('   - Request logs are persisted to Postgres.');
    console.log('   - Evaluations run via BullMQ worker.\n');

  } catch (err) {
    console.error('❌ Demo Failed:', err.message);
  }
}

main();
