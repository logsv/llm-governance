# Contributing to LLM Governance Platform

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Workflow

We use **GitHub Flow**, so all code changes happen through pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Local Development Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Postgres Client (optional, for inspecting DB)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/llm-governance.git
   cd llm-governance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start Infrastructure (Redis, Postgres)**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push --schema=libs/common/prisma/schema.prisma
   ```

5. **Run the API**
   ```bash
   npm start
   ```

## Testing

We use Node.js native test runner.

- Run all tests:
  ```bash
  npm test
  ```

- Run specific test file:
  ```bash
  node --test apps/api/test/observability_integration.test.js
  ```

## Project Structure

This is a Monorepo managed by NPM Workspaces.

- **apps/api**: The main Gateway API.
- **libs/**:
  - `gateway`: Core routing logic.
  - `guardrails`: Security and policy checks.
  - `evaluation`: Regression testing and LLM-as-Judge.
  - `observability`: Metrics (Prometheus), Tracing (OpenTelemetry), and Cost.
  - `prompts`: Prompt Management Service.
  - `common`: Shared utilities and Prisma schema.

## Pull Request Process

1. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
2. Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent.
3. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
