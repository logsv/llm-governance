# LLM Governance Platform

> **Enterprise-grade Gateway for managing, securing, and observing LLM applications.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![Status](https://img.shields.io/badge/status-beta-orange.svg)

This platform provides a centralized control plane for Large Language Model (LLM) adoption in the enterprise. It solves the "Day 2" problems of LLM integration: **Cost, Security, Quality, and Observability**.

## 🚀 Features

### 🛡️ Guardrails & Security
- **PII Detection**: Automatically redact or block requests containing sensitive data.
- **Prompt Injection**: Detect and prevent jailbreak attempts.
- **Policy Enforcement**: Configurable rules for input/output size, profanity, and secrets.

### 📝 Prompt Management
- **Versioning**: Git-like versioning for prompts.
- **Environment Promotion**: Move prompts from `dev` -> `stage` -> `prod`.
- **Templating**: Dynamic variable substitution using Mustache syntax.

### 👁️ Observability & Cost
- **Distributed Tracing**: OpenTelemetry integration for full request visibility.
- **Metrics**: Prometheus endpoints for latency, throughput, and error rates.
- **Cost Attribution**: Real-time cost calculation per provider, model, and prompt.
- **Audit Logs**: Persistent logs of every request and response in PostgreSQL.

### ⚖️ Evaluation & Regression Testing
- **Golden Datasets**: Manage versioned test sets.
- **LLM-as-Judge**: Automated quality scoring (Relevance, Accuracy, Hallucination).
- **Regression Detection**: Catch quality drops before production rollout.

---

## 🏗️ Architecture

The platform follows a modular Monorepo architecture:

```mermaid
graph TD
    Client[Client App] --> Gateway[LLM Gateway API]
    
    subgraph "Core Services"
        Gateway --> Guardrails[Guardrails Engine]
        Gateway --> Prompts[Prompt Registry]
        Gateway --> Router[Model Router]
    end
    
    subgraph "Observability"
        Gateway --> Metrics[Prometheus Metrics]
        Gateway --> Tracing[OpenTelemetry]
        Gateway --> Queue[Async Log Queue]
    end
    
    subgraph "Evaluation"
        EvalWorker[Eval Worker] --> Judge[LLM Judge]
        EvalWorker --> DB[(Postgres)]
    end
    
    Queue --> DB
    Router --> Providers["LLM Providers (OpenAI, Gemini, etc.)"]
```

### Request Lifecycle
1. **Auth & Context**: Request arrives, authenticated, and tagged with metadata.
2. **Prompt Resolution**: Template is fetched from Registry (if `prompt_id` provided).
3. **Guardrails (Input)**: Input is scanned for PII, injections, etc.
4. **Routing**: Request is dispatched to the configured Provider (OpenAI, etc.).
5. **Guardrails (Output)**: Response is scanned before returning to client.
6. **Async Observability**: Metrics recorded; Logs pushed to Redis queue -> Postgres.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js 20+**
- **Docker & Docker Compose** (for Redis/Postgres)

### Quick Start

1. **Clone & Install**
   ```bash
   git clone https://github.com/your-org/llm-governance.git
   cd llm-governance
   npm install
   ```

2. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```

3. **Initialize Database**
   ```bash
   npx prisma db push --schema=libs/common/prisma/schema.prisma
   ```

4. **Start the Gateway**
   ```bash
   npm start
   ```
   *Server runs on http://localhost:3000*

5. **Run Demo Client**
   ```bash
   node examples/client-demo.js
   ```

---

## ⚙️ Configuration

The platform is configured via `observability.yaml` and environment variables.

### Environment Variables (.env)
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/llm_governance"
REDIS_HOST="localhost"
OPENAI_API_KEY="sk-..."
```

### Observability Config (observability.yaml)
Control metrics, tracing sampling, and cost rates without code changes.
```yaml
metrics:
  enabled: true
cost_tracking:
  providers:
    openai:
      models:
        gpt-4:
          input_cost_per_1k_tokens: 0.03
```

---

## 📊 Trade-offs & Comparisons

| Feature | LLM Governance (This Repo) | LangChain | Helicone / LangSmith |
| :--- | :--- | :--- | :--- |
| **Focus** | Enterprise Gateway & Control Plane | Application Framework | Observability SaaS |
| **Deployment** | Self-hosted / Private Cloud | Library (Client-side) | SaaS (mostly) |
| **Guardrails** | First-class, Proxy-level | Library-level | Post-hoc analysis |
| **Latency** | Low (Async logging) | N/A | Variable |
| **Cost** | Free (OSS) | Free (OSS) | Paid SaaS |

**Why use this?**
- You need **strict compliance** (PII, audit logs) within your VPC.
- You want to **decouple** prompts from application code.
- You want a **unified API** for swapping providers without redeploying apps.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on setting up your dev environment and submitting PRs.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
