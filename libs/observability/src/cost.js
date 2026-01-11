import { configLoader } from './config.js';

const config = configLoader.getCostConfig();

export const calculateCost = (provider, model, tokensIn, tokensOut) => {
  if (!config.enabled) return 0;

  // Resolve provider config
  const providerConfig = config.providers?.[provider];
  
  let inputRate = config.default.input_cost_per_1k_tokens;
  let outputRate = config.default.output_cost_per_1k_tokens;

  if (providerConfig) {
    if (providerConfig.pricing_source === 'static') {
      const modelConfig = providerConfig.models?.[model];
      if (modelConfig) {
        inputRate = modelConfig.input_cost_per_1k_tokens;
        outputRate = modelConfig.output_cost_per_1k_tokens;
      }
    } else if (providerConfig.pricing_source === 'estimated') {
        // Use defaults for estimated if not specific
        if (providerConfig.defaults) {
            inputRate = providerConfig.defaults.input_cost_per_1k_tokens;
            outputRate = providerConfig.defaults.output_cost_per_1k_tokens;
        }
    }
  }

  const costIn = (tokensIn / 1000) * inputRate;
  const costOut = (tokensOut / 1000) * outputRate;

  let totalCost = costIn + costOut;

  // Rounding
  if (config.rounding) {
    const precision = config.rounding.precision || 6;
    totalCost = parseFloat(totalCost.toFixed(precision));
  }

  return totalCost;
};
