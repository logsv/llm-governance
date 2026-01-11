import OpenAI from 'openai';
import { ProviderError } from '@llm-governance/common';
import { BaseLLMProvider } from './base.js';

export class LiteLLMProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    // LiteLLM Proxy provides an OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.LITELLM_API_KEY || 'sk-1234', // LiteLLM often requires a dummy key or a configured one
      baseURL: config.baseURL || process.env.LITELLM_BASE_URL || 'http://localhost:4000',
    });
  }

  async generate(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo', // LiteLLM proxy maps this to actual models
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
        provider: 'litellm',
        model: response.model,
        metadata: {
          id: response.id,
          finish_reason: choice.finish_reason,
          system_fingerprint: response.system_fingerprint,
        },
      };
    } catch (error) {
      throw new ProviderError(`LiteLLM Error: ${error.message}`, {
        originalError: error,
        provider: 'litellm',
      });
    }
  }
}
