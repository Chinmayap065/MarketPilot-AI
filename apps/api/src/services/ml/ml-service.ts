import type { TrainingDatasetRow } from '../market-data/dataset';
import { z } from 'zod';

import { env } from '../../config/env';

const datasetValidationResponseSchema = z.object({
  valid: z.literal(true),
  rowCount: z.number().int().nonnegative(),
  featureCount: z.number().int().positive(),
  featureNames: z.array(z.string()).min(1),
});

export interface DatasetValidationResult {
  valid: true;
  rowCount: number;
  featureCount: number;
  featureNames: string[];
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

  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const detail =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'detail' in responseBody &&
      typeof responseBody.detail === 'string'
        ? responseBody.detail
        : `ML service returned HTTP ${response.status}`;

    throw new Error(detail);
  }

  const parsedResponse =
    datasetValidationResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    throw new Error('ML service returned an invalid validation response');
  }

  return parsedResponse.data;
}