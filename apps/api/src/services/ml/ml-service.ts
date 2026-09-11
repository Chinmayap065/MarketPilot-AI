import { z } from 'zod';

import type { TrainingDatasetRow } from '../market-data/dataset';
import { env } from '../../config/env';

const datasetValidationResponseSchema = z.object({
  valid: z.literal(true),
  rowCount: z.number().int().nonnegative(),
  featureCount: z.number().int().positive(),
  featureNames: z.array(z.string()).min(1),
});

const modelMetricsSchema = z.object({
  accuracy: z.number().finite(),
  precision: z.number().finite(),
  recall: z.number().finite(),
  f1: z.number().finite(),
  logLoss: z.number().finite(),
});

const baselineResultSchema = z.object({
  metrics: modelMetricsSchema,
  predictedClass: z.number().int(),
  predictedClassProbability: z.number().finite(),
});

const walkForwardWindowSchema = z.object({
  trainStart: z.number().int().nonnegative(),
  trainEnd: z.number().int().nonnegative(),
  testStart: z.number().int().nonnegative(),
  testEnd: z.number().int().nonnegative(),
});

const walkForwardResultSchema = z.object({
  metrics: modelMetricsSchema,
  baseline: baselineResultSchema,
  windowCount: z.number().int().nonnegative(),
  windows: z.array(walkForwardWindowSchema),
  predictionCount: z.number().int().nonnegative(),
});

const modelTrainingResponseSchema = z.object({
  trained: z.boolean(),
  model: z.object({
    name: z.string().min(1),
  }),
  horizon: z.number().int().positive(),
  split: z.object({
    trainRows: z.number().int().nonnegative(),
    validationRows: z.number().int().nonnegative(),
    testRows: z.number().int().nonnegative(),
  }),
  validation: modelMetricsSchema,
  test: modelMetricsSchema,
  baseline: z.object({
    validation: baselineResultSchema,
    test: baselineResultSchema,
  }),
  walkForward: walkForwardResultSchema.optional(),
  trainedAt: z.string().datetime(),
});

export interface DatasetValidationResult {
  valid: true;
  rowCount: number;
  featureCount: number;
  featureNames: string[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  logLoss: number;
}

export interface BaselineTrainingResult {
  metrics: ModelMetrics;
  predictedClass: number;
  predictedClassProbability: number;
}

export interface WalkForwardWindow {
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
}

export interface WalkForwardTrainingResult {
  metrics: ModelMetrics;
  baseline: BaselineTrainingResult;
  windowCount: number;
  windows: WalkForwardWindow[];
  predictionCount: number;
}

export interface ModelTrainingResult {
  trained: boolean;
  model: {
    name: string;
  };
  horizon: number;
  split: {
    trainRows: number;
    validationRows: number;
    testRows: number;
  };
  validation: ModelMetrics;
  test: ModelMetrics;
  baseline: {
    validation: BaselineTrainingResult;
    test: BaselineTrainingResult;
  };
  walkForward?: WalkForwardTrainingResult;
  trainedAt: string;
}

export interface ModelTrainingOptions {
  horizon?: number;
  trainRatio?: number;
  validationRatio?: number;
  runWalkForward?: boolean;
  walkForwardInitialTrainSize?: number;
  walkForwardTestSize?: number;
  walkForwardStepSize?: number;
}

function getErrorDetail(
  responseBody: unknown,
  status: number,
): string {
  if (
    typeof responseBody === 'object' &&
    responseBody !== null &&
    'detail' in responseBody &&
    typeof responseBody.detail === 'string'
  ) {
    return responseBody.detail;
  }

  return `ML service returned HTTP ${status}`;
}

async function readResponseBody(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function validateTrainingDataset(
  rows: TrainingDatasetRow[],
): Promise<DatasetValidationResult> {
  if (rows.length === 0) {
    throw new Error('training dataset cannot be empty');
  }

  const response = await fetch(
    `${env.mlServiceUrl}/api/v1/datasets/validate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows }),
    },
  );

  const responseBody =
    await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getErrorDetail(
        responseBody,
        response.status,
      ),
    );
  }

  const parsedResponse =
    datasetValidationResponseSchema.safeParse(
      responseBody,
    );

  if (!parsedResponse.success) {
    throw new Error(
      'ML service returned an invalid validation response',
    );
  }

  return parsedResponse.data;
}

export async function trainModel(
  rows: TrainingDatasetRow[],
  options: ModelTrainingOptions = {},
): Promise<ModelTrainingResult> {
  if (rows.length === 0) {
    throw new Error('training dataset cannot be empty');
  }

  const horizon = options.horizon ?? 1;
  const trainRatio =
    options.trainRatio ?? 0.70;
  const validationRatio =
    options.validationRatio ?? 0.15;
  const runWalkForward =
    options.runWalkForward ?? false;
  const walkForwardInitialTrainSize =
    options.walkForwardInitialTrainSize ?? 20;
  const walkForwardTestSize =
    options.walkForwardTestSize ?? 5;
  const walkForwardStepSize =
    options.walkForwardStepSize ?? 5;

  const response = await fetch(
    `${env.mlServiceUrl}/api/v1/models/train`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows,
        horizon,
        trainRatio,
        validationRatio,
        runWalkForward,
        walkForwardInitialTrainSize,
        walkForwardTestSize,
        walkForwardStepSize,
      }),
    },
  );

  const responseBody =
    await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getErrorDetail(
        responseBody,
        response.status,
      ),
    );
  }

  const parsedResponse =
    modelTrainingResponseSchema.safeParse(
      responseBody,
    );

  if (!parsedResponse.success) {
    throw new Error(
      'ML service returned an invalid training response',
    );
  }

  return parsedResponse.data;
}