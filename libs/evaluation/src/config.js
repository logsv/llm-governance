import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigLoader {
  constructor() {
    this.configPath = path.resolve(__dirname, '../evaluation.yaml');
    this.config = null;
  }

  load() {
    if (this.config) return this.config;

    try {
      if (fs.existsSync(this.configPath)) {
        const fileContents = fs.readFileSync(this.configPath, 'utf8');
        this.config = yaml.load(fileContents);
      } else {
        console.warn(`Evaluation config not found at ${this.configPath}, using defaults.`);
        this.config = {};
      }
    } catch (e) {
      console.error('Failed to load evaluation config:', e);
      this.config = {};
    }

    return this.config;
  }

  getJudgeConfig() {
    const config = this.load();
    return config.judges || {
      primary: { provider: 'openai', model: 'gpt-4', temperature: 0 }
    };
  }

  getScoringConfig() {
    const config = this.load();
    return config.scoring || {
      dimensions: ['relevance', 'accuracy', 'clarity', 'hallucination_risk'],
      thresholds: { regression_percentage: 5, hallucination_max: 2, disagreement_delta: 1.0 }
    };
  }
}

export const configLoader = new ConfigLoader();
