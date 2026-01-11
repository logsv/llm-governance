import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = path.resolve(__dirname, '../observability.yaml');
  }

  load() {
    if (this.config) return this.config;

    try {
      const fileContents = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(fileContents);
      this.validate();
      return this.config;
    } catch (e) {
      console.error('Failed to load observability config:', e);
      throw e;
    }
  }

  validate() {
    // Basic validation
    if (!this.config) throw new Error('Config is empty');
    if (!this.config.metrics) throw new Error('Metrics config missing');
    if (!this.config.tracing) throw new Error('Tracing config missing');
    if (!this.config.cost_tracking) throw new Error('Cost tracking config missing');
    // Add more validation as needed per requirements
  }

  getMetricsConfig() {
    return this.load().metrics;
  }

  getTracingConfig() {
    return this.load().tracing;
  }

  getCostConfig() {
    return this.load().cost_tracking;
  }
  
  getPersistenceConfig() {
    return this.load().persistence;
  }
  
  getEnvironmentConfig(envName) {
    const config = this.load();
    if (config.environments && config.environments[envName]) {
      return config.environments[envName];
    }
    return {};
  }
}

export const configLoader = new ConfigLoader();
