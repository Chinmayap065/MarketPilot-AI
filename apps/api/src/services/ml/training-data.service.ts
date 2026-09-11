import type { MarketCandle } from '@marketpilot/types';

import { buildTrainingDataset } from '../market-data/dataset';
import { buildMarketFeatures } from '../market-data/features';
import { buildPredictionTargets } from '../market-data/target';
import {
  validateTrainingDataset,
  type DatasetValidationResult,
} from './ml-service';

export interface TrainingDataBuildResult {
  dataset: ReturnType<typeof buildTrainingDataset>;
  validation: DatasetValidationResult;
}

export async function buildAndValidateTrainingDataset(
  candles: MarketCandle[],
  horizon = 1,
): Promise<TrainingDataBuildResult> {
  if (candles.length === 0) {
    throw new Error('market candles cannot be empty');
  }

  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new Error('horizon must be a positive integer');
  }

  const features = buildMarketFeatures(candles);

  const targets = buildPredictionTargets(
    candles,
    horizon,
  );

  const dataset = buildTrainingDataset(
    features,
    targets,
  );

  if (dataset.length === 0) {
    throw new Error(
      'training dataset is empty after feature and target construction',
    );
  }

  const validation =
    await validateTrainingDataset(dataset);

  return {
    dataset,
    validation,
  };
}