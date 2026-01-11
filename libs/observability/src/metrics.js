import prometheus from 'prom-client';
import { configLoader } from './config.js';

// Load config
const config = configLoader.getMetricsConfig();
const allowedLabels = config.labels?.allow || ['env', 'provider', 'model', 'status'];

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
if (config.enabled) {
  prometheus.collectDefaultMetrics({ register, prefix: 'llm_gov_' });
}

// Define Metrics
const requestCounter = new prometheus.Counter({
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: [...allowedLabels, 'error_code'],
  registers: [register],
});

const tokenCounter = new prometheus.Counter({
  name: 'llm_tokens_total',
  help: 'Total tokens processed',
  labelNames: [...allowedLabels, 'type'], // type: input, output
  registers: [register],
});

const costCounter = new prometheus.Counter({
  name: 'llm_cost_usd_total',
  help: 'Total estimated cost in USD',
  labelNames: allowedLabels,
  registers: [register],
});

const latencyHistogram = new prometheus.Histogram({
  name: 'llm_latency_seconds',
  help: 'Request latency in seconds',
  labelNames: allowedLabels,
  buckets: config.latency?.histogram_buckets_ms?.map(ms => ms / 1000) || [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const evalRunCounter = new prometheus.Counter({
  name: 'llm_evaluation_runs_total',
  help: 'Total evaluation runs',
  labelNames: ['dataset', 'status'],
  registers: [register],
});

const evalRegressionCounter = new prometheus.Counter({
  name: 'llm_evaluation_regressions_total',
  help: 'Total detected regressions',
  labelNames: ['dataset'],
  registers: [register],
});

const evalDisagreementCounter = new prometheus.Counter({
  name: 'llm_evaluation_disagreements_total',
  help: 'Total judge disagreements',
  labelNames: ['dataset'],
  registers: [register],
});

export class MetricsService {
  recordRequest({ env, provider, model, status, errorCode, latencyMs, tokensIn, tokensOut, cost }) {
    if (!config.enabled) return;

    const labels = { env, provider, model, status };
    // Filter labels based on config (simple implementation: we assume input keys match allowedLabels)
    
    // 1. Request Count
    requestCounter.inc({ ...labels, error_code: errorCode || 'none' });

    // 2. Tokens
    if (tokensIn) tokenCounter.inc({ ...labels, type: 'input' }, tokensIn);
    if (tokensOut) tokenCounter.inc({ ...labels, type: 'output' }, tokensOut);

    // 3. Cost
    if (cost) costCounter.inc(labels, cost);

    // 4. Latency
    if (latencyMs) latencyHistogram.observe(labels, latencyMs / 1000);
  }

  recordEvaluation({ dataset, status, isRegression, disagreementCount }) {
    if (!config.enabled) return;
    evalRunCounter.inc({ dataset, status });
    if (isRegression) {
        evalRegressionCounter.inc({ dataset });
    }
    if (disagreementCount && disagreementCount > 0) {
        evalDisagreementCounter.inc({ dataset }, disagreementCount);
    }
  }

  async getMetricsContentType() {
    return register.contentType;
  }

  async getMetrics() {
    return register.metrics();
  }
}

export const metricsService = new MetricsService();
