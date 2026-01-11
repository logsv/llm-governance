import { Queue, Worker } from 'bullmq';
import { prisma } from '@llm-governance/common';
import { gatewayService } from '@llm-governance/gateway';
import { judgeService } from './judge.js';
import { metricsService } from '@llm-governance/observability';
import { configLoader } from './config.js';

const EVAL_QUEUE_NAME = 'evaluation-jobs';
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export class EvaluationRunner {
  constructor() {
    this.queue = new Queue(EVAL_QUEUE_NAME, { connection });
    this.worker = null;
  }

  async startWorker() {
    // Prevent starting multiple workers in same process
    if (this.worker) return;

    this.worker = new Worker(EVAL_QUEUE_NAME, async (job) => {
      await this.processJob(job);
    }, { connection });
    
    console.log('Evaluation worker started');
    
    this.worker.on('failed', (job, err) => {
        console.error(`Evaluation job ${job.id} failed:`, err);
    });
  }

  async triggerEvaluation(runId) {
    // We assume the Run is already created in DB with 'pending' status
    await this.queue.add('evaluate', { runId });
  }

  async processJob(job) {
    const { runId } = job.data;
    
    const run = await prisma.evaluationRun.findUnique({
      where: { id: runId },
      include: { dataset: { include: { testCases: true } } }
    });

    if (!run) throw new Error(`Run ${runId} not found`);

    await prisma.evaluationRun.update({
      where: { id: runId },
      data: { status: 'running' }
    });

    const results = [];
    
    // Config for candidate
    const candidateConfig = run.config || {}; 
    const scoringConfig = configLoader.getScoringConfig();

    try {
      let totalDisagreements = 0;

      for (const testCase of run.dataset.testCases) {
        // 1. Run Candidate
        const request = {
          request_id: `eval-${runId}-${testCase.id}`,
          input: testCase.input, // { text: "..." } or { messages: ... }
          config: candidateConfig,
          env: 'test', // We use 'test' env for evaluations
          prompt_id: run.promptId, // Pass promptId if available
        };

        let candidateOutput = '';
        let error = null;

        try {
            const response = await gatewayService.execute(request);
            candidateOutput = response.content;
        } catch (err) {
            console.error(`Candidate failed for test case ${testCase.id}`, err);
            candidateOutput = `ERROR: ${err.message}`;
            error = err.message;
        }

        // 2. Run Judges
        let score = 0;
        let judgeOutput = {};
        
        if (!error) {
            try {
                // Support both evaluation_criteria (from user input) and expected_traits (legacy)
                const traits = testCase.metadata?.evaluation_criteria || testCase.metadata?.expected_traits || {};
                
                judgeOutput = await judgeService.evaluateWithJudges(
                    testCase.input,
                    candidateOutput,
                    traits
                );
                
                score = judgeOutput.overall_score;
                if (judgeOutput.disagreement) totalDisagreements++;

            } catch (err) {
                console.error(`Judge failed for test case ${testCase.id}`, err);
                judgeOutput = { error: err.message };
                score = 0; // Fail
            }
        } else {
            judgeOutput = { error: 'Candidate generation failed' };
        }

        // 3. Save Result
        const result = await prisma.evaluationResult.create({
            data: {
                runId: run.id,
                testCaseId: testCase.id,
                output: candidateOutput,
                score: score,
                reasoning: judgeOutput.primary?.reasoning || judgeOutput.error,
                metrics: judgeOutput, // Store full breakdown including secondary judges
            }
        });
        results.push(result);
      }

      // 4. Aggregate
      const avgScore = results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
      
      // Regression Check
      let regressionInfo = null;
      try {
          const previousRun = await prisma.evaluationRun.findFirst({
              where: {
                  datasetId: run.datasetId,
                  status: 'completed',
                  id: { not: runId }
              },
              orderBy: { createdAt: 'desc' }
          });

          if (previousRun && previousRun.score !== null) {
              const delta = avgScore - previousRun.score;
              // Use configured threshold
              const thresholdPercent = run.dataset.regressionPolicy?.overall_score_drop_percentage || scoringConfig.thresholds?.regression_percentage || 5;
              const maxDrop = (thresholdPercent / 100) * 5; // e.g. 5% of 5 = 0.25
              
              const isRegression = delta < -maxDrop; 
              
              regressionInfo = {
                  baseline_run_id: previousRun.id,
                  baseline_score: previousRun.score,
                  delta: delta,
                  is_regression: isRegression,
                  threshold_used: maxDrop
              };
          }
      } catch (err) {
          console.warn('Failed to check regression:', err);
      }

      await prisma.evaluationRun.update({
          where: { id: runId },
          data: {
              status: 'completed',
              completedAt: new Date(),
              score: avgScore,
              summary: {
                  total: results.length,
                  avg_score: avgScore,
                  regression: regressionInfo,
                  disagreements: totalDisagreements
              }
          }
      });

      // Metrics
      metricsService.recordEvaluation({
          dataset: run.dataset.name,
          status: 'completed',
          isRegression: regressionInfo?.is_regression || false,
          disagreementCount: totalDisagreements
      });

    } catch (err) {
      console.error(`Evaluation Run ${runId} failed`, err);
      await prisma.evaluationRun.update({
          where: { id: runId },
          data: { status: 'failed' }
      });
      
      // Metrics (failed)
      try {
        metricsService.recordEvaluation({
            dataset: run.dataset?.name || 'unknown',
            status: 'failed',
            isRegression: false
        });
      } catch (e) { /* ignore */ }
      
      throw err;
    }
  }
  
  async close() {
      await this.queue.close();
  }
}

export const evaluationRunner = new EvaluationRunner();
