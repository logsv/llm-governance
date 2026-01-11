import { Queue, Worker } from 'bullmq';
import { prisma } from '@llm-governance/common';
import { configLoader } from './config.js';

const config = configLoader.getPersistenceConfig();

const QUEUE_NAME = 'request-logs';
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const isTest = process.env.NODE_ENV === 'test' && !process.env.TEST_INTEGRATION;

// Queue for producers
export const logQueue = (config.enabled && !isTest) ? new Queue(QUEUE_NAME, { connection }) : { add: async () => {}, close: async () => {} };

// Worker for consumers
// In a real microservice, this might run in a separate process
let worker = null;

if (config.enabled && !isTest) {
  worker = new Worker(QUEUE_NAME, async (job) => {
    const data = job.data;
    try {
      await prisma.requestLog.create({
        data: {
          requestId: data.requestId,
          timestamp: new Date(data.timestamp),
          env: data.env,
          provider: data.provider,
          model: data.model,
          promptId: data.promptId,
          promptVersion: data.promptVersion,
          latencyMs: data.latencyMs,
          tokensIn: data.tokensIn,
          tokensOut: data.tokensOut,
          costUsd: data.costUsd,
          status: data.status,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
          metadata: data.metadata || {},
        },
      });
    } catch (err) {
      if (configLoader.load().failure_handling?.on_persistence_error !== 'ignore') {
          console.error('Failed to persist request log:', err);
      }
      throw err;
    }
  }, { connection });
}

export const persistenceService = {
  async logRequest(data) {
    if (!config.enabled) return;
    
    try {
      await logQueue.add('log', data, {
        removeOnComplete: true,
        removeOnFail: 5000, // Keep failed jobs for 5s
      });
    } catch (err) {
      const failureMode = configLoader.load().failure_handling?.on_persistence_error || 'log_only';
      if (failureMode !== 'ignore') {
          console.error('Failed to queue request log:', err);
          // Fallback: log to console so we don't lose data completely
          console.log('FALLBACK_LOG:', JSON.stringify(data));
      }
    }
  },
  
  async close() {
    if (logQueue.close) await logQueue.close();
    if (worker) await worker.close();
  }
};
