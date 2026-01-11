import opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { configLoader } from './config.js';

// Only initialize if not in test environment to avoid conflicts
const isTest = process.env.NODE_ENV === 'test';

let sdk = null;

if (!isTest) {
  const config = configLoader.getTracingConfig();

  if (config.enabled) {
    const exporter = new PrometheusExporter({ port: 9464 }); // Default port
    
    // Sampling
    // TODO: Implement advanced sampling based on config.sampling
    // For now we use default TraceIdRatioBasedSampler if rate < 1.0 but NodeSDK configuration for sampling is needed
    // The current setup is basic.
    
    const resource = resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: 'llm-governance-api',
      ...config.attributes?.include?.reduce((acc, key) => ({ ...acc, [key]: 'unknown' }), {}) // Placeholder
    });

    sdk = new NodeSDK({
      resource: resource,
      metricReader: exporter,
      // traceExporter: new ConsoleSpanExporter(), // Enable for debug
    });

    try {
      sdk.start();
      console.log('OpenTelemetry SDK started');
    } catch (err) {
      console.error('Error starting OpenTelemetry SDK:', err);
    }
  }
}

export const tracer = opentelemetry.trace.getTracer('llm-governance-gateway');

export const startSpan = (name, options, contextOrFn) => {
  if (typeof contextOrFn === 'function') {
    return tracer.startActiveSpan(name, options, contextOrFn);
  }
  return tracer.startSpan(name, options, contextOrFn);
};

export default {
  tracer,
  startSpan,
};
