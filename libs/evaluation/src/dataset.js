import { z } from 'zod';
import { prisma } from '@llm-governance/common';

const TestCaseSchema = z.object({
  id: z.string().optional(),
  input: z.record(z.any()),
  expected_output: z.string().optional(),
  expected_traits: z.record(z.any()).optional(), // Legacy support
  evaluation_criteria: z.record(z.any()).optional(), // New standard
  critical_dimensions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const DatasetSchema = z.object({
  dataset_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  version: z.string(),
  owner: z.string().optional(),
  created_at: z.string().optional(),
  guidelines: z.record(z.any()).optional(),
  scoring_rubric: z.record(z.any()).optional(),
  regression_policy: z.record(z.any()).optional(),
  samples: z.array(TestCaseSchema),
});

export class DatasetService {
  async importDataset(jsonData) {
    const parsed = DatasetSchema.safeParse(jsonData);
    if (!parsed.success) {
      throw new Error(`Invalid dataset format: ${JSON.stringify(parsed.error.format())}`);
    }

    const { 
        dataset_id, 
        description, 
        domain,
        version,
        owner,
        guidelines,
        scoring_rubric,
        regression_policy,
        samples 
    } = parsed.data;

    // Transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // Upsert Dataset
      const dataset = await tx.dataset.upsert({
        where: { name: dataset_id },
        update: {
          description,
          domain,
          version,
          owner,
          guidelines: guidelines || undefined,
          scoringRubric: scoring_rubric || undefined,
          regressionPolicy: regression_policy || undefined,
        },
        create: {
          name: dataset_id,
          description,
          domain,
          version,
          owner,
          guidelines: guidelines || undefined,
          scoringRubric: scoring_rubric || undefined,
          regressionPolicy: regression_policy || undefined,
        },
      });

      // Delete existing test cases for this dataset version to ensure sync
      await tx.testCase.deleteMany({
          where: { datasetId: dataset.id }
      });

      // Insert new samples
      const results = [];
      for (const sample of samples) {
        // Construct metadata from traits + extra
        const metadata = {
            evaluation_criteria: sample.evaluation_criteria || sample.expected_traits,
            critical_dimensions: sample.critical_dimensions,
            external_id: sample.id, // Preserve original ID in metadata
            ...sample.metadata
        };

        // If sample.id is provided, we prefer it, but Prisma ID is UUID.
        // We will generate new UUIDs for Prisma and store original ID in metadata.
        
        const testCase = await tx.testCase.create({
            data: {
                datasetId: dataset.id,
                input: sample.input,
                expectedOutput: sample.expected_output,
                metadata: metadata,
            }
        });
        results.push(testCase);
      }
      
      return { dataset, testCases: results.length };
    });
  }
  
  async getDataset(id) {
      return await prisma.dataset.findUnique({
          where: { id },
          include: { testCases: true }
      });
  }
  
  async getDatasetByName(name) {
      return await prisma.dataset.findUnique({
          where: { name },
          include: { testCases: true }
      });
  }
}

export const datasetService = new DatasetService();
