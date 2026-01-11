import OpenAI from 'openai';
import { ProviderError } from '@llm-governance/common';
import { BaseLLMProvider } from './base.js';

export class OllamaProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    // Ollama provides an OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.apiKey || 'ollama', // Ollama doesn't require an API key, but SDK might need a non-empty string
      baseURL: config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
    });
  }

  async generate(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'llama3', // Default to a common model
        messages,
        ...options.params,
      });

      const choice = response.choices[0];

      return {
        content: choice.message.content,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
        provider: 'ollama',
        model: response.model,
        metadata: {
          id: response.id,
          finish_reason: choice.finish_reason,
        },
      };
    } catch (error) {
      throw new ProviderError(`Ollama Error: ${error.message}`, {
        originalError: error,
        provider: 'ollama',
      });
    }
  }
}
