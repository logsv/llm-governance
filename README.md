# LLM Governance Platform

A production-grade, open-source LLM Governance Platform built with Node.js.

## Features

- **Centralized LLM Gateway**: Unified interface for multiple LLM providers.
- **Prompt Versioning**: Manage and rollback prompt templates.
- **Guardrails**: Policy enforcement for inputs and outputs.
- **Evaluation**: Regression detection and quality monitoring.
- **Observability**: Tracing and cost tracking.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express
- **DB**: PostgreSQL
- **Cache**: Redis
- **Queue**: BullMQ
- **Metrics**: Prometheus

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start infrastructure:
   ```bash
   docker-compose up -d
   ```

3. Start the API:
   ```bash
   npm start
   ```

## Repository Structure

- `apps/api`: Main Express API application
- `libs/`: Shared libraries
  - `gateway`: LLM routing and processing
  - `prompts`: Prompt management
  - `guardrails`: Validation logic
  - `evaluation`: Scoring and testing
  - `observability`: Logging and tracing
  - `common`: Shared utilities
