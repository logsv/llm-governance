# LLM Governance SDK

> **Enterprise-grade in-process instrumentation for securing, observing, and managing LLM applications.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![Status](https://img.shields.io/badge/status-beta-orange.svg)

This library provides a drop-in SDK for Large Language Model (LLM) governance. It wraps your existing LLM calls to automatically enforce security guardrails, track costs, and record audit logs directly within your application process.

## 🚀 Features

### 🛡️ Guardrails & Security
- **In-Process Protection**: Validates inputs and outputs directly within your application process.
- **PII Detection & Masking**: Automatically redacts sensitive data (Email, Phone, Credit Cards) from model responses.
- **Secret Detection**: Blocks requests containing API keys or private tokens.
- **Policy as Code**: Define rules in `YAML` files that live with your code or centrally.

### 👁️ Observability & Cost
- **Zero-Latency Logging**: Telemetry is offloaded asynchronously to a local queue (BullMQ).
- **Distributed Tracing**: OpenTelemetry integration for full request visibility.
- **Cost Attribution**: Real-time cost calculation per provider, model, and prompt.
- **Resilient Persistence**: Dedicated Worker service handles database writes; your app stays up even if the DB is down.

### 🏗️ Architecture

The SDK follows a "Producer-Consumer" model to ensure high performance and reliability:

```mermaid
graph LR
    subgraph "Your Application"
        Code[User Code] --> SDK[LLM Governance SDK]
        SDK -->|Intercept| Guardrails[Guardrails Engine]
        SDK -->|Async Log| Queue["Local Queue (Redis)"]
    end

    subgraph "Background Infrastructure"
        Queue --> Worker[Worker Service]
        Worker --> DB[("Postgres")]
        Worker --> Metrics[Prometheus]
    end
    
    SDK -.->|LLM Call| OpenAI[LLM Provider]
```

## 🛠️ Getting Started

### Prerequisites
- **Node.js 20+**
- **Docker & Docker Compose** (for Redis/Postgres)

### 1. Installation

```bash
# Clone the repo (Monorepo setup)
git clone https://github.com/your-org/llm-governance.git
cd llm-governance
npm install
```

### 2. Start Infrastructure
Start Redis (for the queue) and Postgres (for logs).

```bash
docker-compose up -d
npx prisma db push --schema=libs/common/prisma/schema.prisma
```

### 3. Start the Worker Service
The worker consumes logs from the queue and persists them to the database.

```bash
npm start -w apps/worker
```

### 4. Use the SDK in Your App

Initialize the SDK and wrap your LLM calls.

```javascript
import llm from '@llm-governance/sdk';

// 1. Initialize with your policy
llm.init({
    policyPath: './path/to/guardrails.yml'
});

// 2. Wrap your LLM calls
const response = await llm.observe({
    input: "User prompt",
    model: "gpt-4",
    provider: "openai",
    metadata: { user_id: "123" }
}, async () => {
    // Your existing code (e.g., OpenAI SDK)
    return await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "User prompt" }]
    });
});
```

### 5. Run the Demo

See the SDK in action with a simulated LLM provider:

```bash
node examples/sdk-demo.js
```

## ⚙️ Configuration

### Guardrails Policy
Define your security rules in a YAML file (e.g., `policies/default.yml`):

```yaml
input:
  secrets_detection:
    enabled: true
    action: reject

output:
  pii_detection:
    enabled: true
    categories: [email, phone]
    action: mask
    mask_token: "[REDACTED]"
```

## 📊 Comparison

| Feature | Gateway Approach (Old) | SDK Approach (New) |
| :--- | :--- | :--- |
| **Integration** | Requires changing API endpoints | Import library, wrap code |
| **Latency** | Network hop added | Microseconds (In-process) |
| **Failure Mode** | Gateway down = App down | DB down = App keeps working (Async queue) |
| **Complexity** | High (Separate service to manage) | Low (Part of your app) |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
