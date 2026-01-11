import { test, describe, it, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { GatewayService } from '../../../libs/gateway/src/service.js';
import { metricsService, persistenceService } from '../../../libs/observability/index.js';
import { prisma } from '@llm-governance/common';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Observability Integration', () => {
  let gateway;
  let mockProvider;

  before(async () => {
    // Ensure persistence service is initialized/connected if needed
    // In our case, it initializes on import, but worker needs config.enabled=true and !isTest (or TEST_INTEGRATION=true)
  });

  beforeEach(async () => {
    // Clear DB to ensure clean state for each test
    await prisma.requestLog.deleteMany({});
    
    mockProvider = {
      generate: mock.fn(async (messages) => {
        return {
          content: 'test response',
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        };
      })
    };

    gateway = new GatewayService();
    gateway.registerProvider('mock', mockProvider);
  });

  after(async () => {
    mock.restoreAll();
    await persistenceService.close(); // Close queue/worker
    await prisma.$disconnect();
  });

  it('should record metrics and logs on successful request', async () => {
    const request = {
      input: { text: 'test input' },
      config: { provider: 'mock', model: 'gpt-4' },
      env: 'prod'
    };

    await gateway.execute(request);

    // Check Metrics
    const metrics = await metricsService.getMetrics();
    assert.ok(metrics.includes('llm_requests_total'), 'Should have requests counter');
    assert.ok(metrics.includes('llm_tokens_total'), 'Should have tokens counter');
    assert.ok(metrics.includes('llm_cost_usd_total'), 'Should have cost counter');
    
    // Check Persistence (DB)
    // Wait for worker to process async queue
    await sleep(2000); 

    const logs = await prisma.requestLog.findMany();
    assert.strictEqual(logs.length, 1, 'Should have 1 request log in DB');
    const logData = logs[0];
    
    assert.strictEqual(logData.provider, 'mock');
    assert.strictEqual(logData.model, 'gpt-4');
    assert.strictEqual(logData.tokensIn, 10);
    assert.strictEqual(logData.tokensOut, 5);
    assert.ok(logData.costUsd > 0, 'Cost should be calculated');
    assert.strictEqual(logData.status, 'success');
  });

  it('should record error metrics on failed request', async () => {
    const failingProvider = {
      generate: mock.fn(async () => {
        throw new Error('Provider failed');
      })
    };
    gateway.registerProvider('fail', failingProvider);

    const request = {
      input: { text: 'test input' },
      config: { provider: 'fail' },
      env: 'prod'
    };

    await assert.rejects(async () => {
      await gateway.execute(request);
    });

    // Wait for persistence
    await sleep(2000);

    // Check Persistence for error
    const logs = await prisma.requestLog.findMany({
        where: { status: 'error' }
    });
    
    assert.strictEqual(logs.length, 1, 'Should have 1 error log in DB'); 
    const logData = logs[0];
    
    assert.strictEqual(logData.status, 'error');
    assert.strictEqual(logData.errorMessage, 'Provider failed');
  });
});
