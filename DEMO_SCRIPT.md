# Demo Walkthrough Script (10 Mins)

## Introduction (0:00 - 1:30)
- **Concept**: "Today, I'm showing you the LLM Governance Platform, an open-source gateway to manage, secure, and observe LLM applications in the enterprise."
- **Problem**: "Integrating LLMs isn't just about calling an API. You need to handle costs, PII security, prompt versioning, and regression testing."
- **Solution**: "This platform sits between your apps and providers like OpenAI, enforcing policy and tracking everything."

## 1. Setup & Architecture (1:30 - 3:00)
- **Visual**: Show `README.md` Architecture Diagram.
- **Action**: Show `docker-compose.yml` running (Redis + Postgres).
- **Action**: Start the server: `npm start`.
- **Highlight**: "It's a modular Node.js monorepo. We have services for Gateway, Guardrails, Prompts, and Observability."

## 2. Prompt Management (3:00 - 5:00)
- **Action**: Use Postman or `curl` (or the client demo script) to create a new Prompt Template.
- **Highlight**: "Notice we're defining variables like `{{user_input}}`. This prompt is now versioned in our database."
- **Action**: Send a request using `prompt_id`.
- **Result**: "The gateway resolves the prompt, fills the template, calls OpenAI, and returns the result."

## 3. Guardrails in Action (5:00 - 7:00)
- **Action**: Send a request containing PII (e.g., "My email is test@example.com").
- **Result**: Show the request being blocked or redacted (depending on config).
- **Highlight**: "This happened *before* the data ever left our network. The LLM provider never saw that email."
- **Action**: Show `observability.yaml` or code where policies are configured.

## 4. Observability & Cost (7:00 - 8:30)
- **Visual**: Open `http://localhost:3000/metrics`.
- **Highlight**: "We have Prometheus metrics for latency, error rates, and costs."
- **Visual**: Connect to Postgres (optional) or show logs.
- **Highlight**: "Every request is logged asynchronously via BullMQ to avoid latency penalties. We track exact token usage and cost per department/model."

## 5. Evaluation & Regression (8:30 - 9:30)
- **Concept**: "Before shipping a new prompt version, we run it against a Golden Dataset."
- **Action**: Trigger an evaluation run (or show code for `evaluation/src/runner.js`).
- **Highlight**: "An LLM-as-Judge scores the output on Accuracy and Hallucination. If the score drops, the CI/CD pipeline would fail."

## Conclusion (9:30 - 10:00)
- **Summary**: "We have a secure, observable, and quality-controlled gateway."
- **Call to Action**: "Check out the repo, try the `examples/client-demo.js`, and feel free to contribute!"
