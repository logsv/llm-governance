import { gatewayService } from '@llm-governance/gateway';
import { judgeService } from '@llm-governance/evaluation';

export const evaluation = {
  /**
   * Run an evaluation for a specific prompt version against a dataset
   * @param {Object} options
   * @param {String} options.promptId - The ID or Name of the prompt to evaluate
   * @param {String} [options.version] - Specific version to test (optional)
   * @param {Array} options.dataset - Array of test cases: [{ input: "...", expected_traits: {...} }]
   * @param {Object} [options.config] - Runtime config for the candidate (model, provider)
   * @param {Object} [options.judgeConfig] - Configuration override for the judge (e.g. use mock provider)
   */
  run: async ({ promptId, version, dataset, config = {}, judgeConfig }) => {
    console.log(`Starting evaluation for prompt: ${promptId} (Version: ${version || 'latest'})`);
    
    const results = {
      total: dataset.length,
      passed: 0,
      failed: 0,
      scores: {
        relevance: 0,
        accuracy: 0,
        clarity: 0,
        hallucination_risk: 0,
        overall: 0
      },
      details: []
    };

    // Prepare Gateway Request Base
    const baseRequest = {
      env: 'test',
      config: {
        provider: config.provider || 'openai',
        model: config.model || 'gpt-3.5-turbo',
        ...config
      }
    };

    // If promptId is provided, let Gateway resolve it. 
    // If version is specific, we might need a way to force Gateway to use that version.
    // Currently Gateway resolves by ENV. So we might need to rely on 'test' env binding.
    // OR we pass the template directly if we have it.
    
    // For this implementation, we assume the user has bound the version to 'test' env
    // or we are just testing the promptId resolution.
    if (promptId) {
        baseRequest.prompt_id = promptId;
    }

    for (const testCase of dataset) {
      const caseResult = {
        input: testCase.input,
        expected: testCase.expected_traits || {},
        actual: null,
        score: null,
        error: null
      };

      try {
        // 1. Run Candidate
        let inputPayload;
        
        if (typeof testCase.input === 'string') {
            if (promptId) {
                // If using a managed prompt, assume the string maps to {{user_input}}
                inputPayload = { prompt_variables: { user_input: testCase.input } };
            } else {
                // If direct execution, wrap as a user message
                inputPayload = { messages: [{ role: 'user', content: testCase.input }] };
            }
        } else {
            // Already structured (e.g. { messages: ... } or { prompt_variables: ... })
            inputPayload = testCase.input;
        }

        const candidateResponse = await gatewayService.execute({
          ...baseRequest,
          request_id: `eval-${Date.now()}`,
          input: inputPayload
        });

        caseResult.actual = candidateResponse.content;

        // 2. Run Judge
        const judgeResult = await judgeService.evaluateWithJudges(
          testCase.input,
          caseResult.actual,
          caseResult.expected,
          { config: judgeConfig }
        );

        caseResult.score = judgeResult;
        
        // Aggregate Scores
        results.scores.relevance += judgeResult.primary.relevance;
        results.scores.accuracy += judgeResult.primary.accuracy;
        results.scores.clarity += judgeResult.primary.clarity;
        results.scores.hallucination_risk += judgeResult.primary.hallucination_risk;
        results.scores.overall += judgeResult.overall_score;

        // Simple Pass/Fail based on Overall Score > 3
        if (judgeResult.overall_score >= 3) {
            results.passed++;
        } else {
            results.failed++;
        }

      } catch (err) {
        console.error('Evaluation Case Failed:', err);
        caseResult.error = err.message;
        results.failed++;
      }

      results.details.push(caseResult);
    }

    // Average Scores
    if (results.total > 0) {
        results.scores.relevance /= results.total;
        results.scores.accuracy /= results.total;
        results.scores.clarity /= results.total;
        results.scores.hallucination_risk /= results.total;
        results.scores.overall /= results.total;
    }

    return results;
  }
};
