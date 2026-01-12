import { z } from 'zod';
import { gatewayService } from '@llm-governance/gateway';
import { configLoader } from './config.js';

const JudgeResultSchema = z.object({
  relevance: z.number().min(1).max(5),
  accuracy: z.number().min(1).max(5),
  clarity: z.number().min(1).max(5),
  hallucination_risk: z.number().min(1).max(5),
  overall_score: z.number().min(1).max(5),
  reasoning: z.string().optional(),
});

const JUDGE_PROMPT_TEMPLATE = `
You are an impartial AI Judge. Evaluate the "Actual Output" against the "Input" and "Expected Traits".
Use the following rubric.

Input:
{{input}}

Actual Output:
{{output}}

Expected Traits:
{{traits}}

Rubric:
- Relevance (1-5): Does it directly answer the input?
- Accuracy (1-5): Is the information correct?
- Clarity (1-5): Is it easy to understand?
- Hallucination Risk (1-5): 1 = Low Risk (Grounded), 5 = High Risk (Made up info).

Provide a JSON response with the following structure:
{
  "relevance": <number>,
  "accuracy": <number>,
  "clarity": <number>,
  "hallucination_risk": <number>,
  "overall_score": <number>,
  "reasoning": "<short explanation>"
}
`;

export class JudgeService {
  constructor(gateway = gatewayService) {
    this.gateway = gateway;
  }

  getConfigs() {
    return configLoader.getJudgeConfig();
  }

  async runSingleJudge(input, output, traits, judgeConfig, type = 'primary') {
    const prompt = JUDGE_PROMPT_TEMPLATE
      .replace('{{input}}', JSON.stringify(input, null, 2))
      .replace('{{output}}', output)
      .replace('{{traits}}', JSON.stringify(traits, null, 2));

    try {
      const request = {
        request_id: `judge-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        input: { 
            messages: [{ role: 'user', content: prompt }] 
        },
        config: judgeConfig,
        env: 'prod', 
      };

      const response = await this.gateway.execute(request);
      
      const content = response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON found in judge response: ${content}`);
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return JudgeResultSchema.parse(parsed);
    } catch (err) {
      console.error(`Judge (${type}) evaluation failed:`, err);
      throw err;
    }
  }

  async evaluateWithJudges(input, output, traits, options = {}) {
    const configs = options.config || this.getConfigs();
    const scoringConfig = configLoader.getScoringConfig();
    const threshold = scoringConfig.thresholds?.disagreement_delta || 1.0;

    // 1. Run Primary Judge
    let primaryResult;
    try {
        primaryResult = await this.runSingleJudge(input, output, traits, configs.primary, 'primary');
    } catch (err) {
        // If primary fails, the whole evaluation fails (per rules)
        throw new Error(`Primary judge failed: ${err.message}`);
    }

    // 2. Run Secondary Judges (Optional)
    const secondaryResults = [];
    let disagreement = false;
    
    if (configs.secondary && Array.isArray(configs.secondary)) {
        for (const secConfig of configs.secondary) {
            try {
                const secResult = await this.runSingleJudge(input, output, traits, secConfig, 'secondary');
                secondaryResults.push({ config: secConfig, result: secResult });

                // Check Disagreement
                const delta = Math.abs(primaryResult.overall_score - secResult.overall_score);
                if (delta > threshold) {
                    disagreement = true;
                }
            } catch (err) {
                console.warn('Secondary judge failed, ignoring:', err);
            }
        }
    }

    return {
        primary: primaryResult,
        secondary: secondaryResults,
        disagreement: disagreement,
        overall_score: primaryResult.overall_score // Primary determines the score
    };
  }
}

export const judgeService = new JudgeService();
