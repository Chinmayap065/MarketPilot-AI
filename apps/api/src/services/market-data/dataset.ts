import type { MarketFeatureRow } from './features.js';
import type { PredictionTargetRow } from './target.js';

export interface TrainingDatasetRow {
  timestamp: string;
  features: Omit<MarketFeatureRow, 'timestamp'>;
  target: 0 | 1;
  futureTimestamp: string;
}

export function buildTrainingDataset(
  features: MarketFeatureRow[],
  targets: PredictionTargetRow[],
): TrainingDatasetRow[] {
  if (features.length === 0 || targets.length === 0) {
    return [];
  }

  const targetByTimestamp = new Map(
    targets.map((target) => [target.timestamp, target]),
  );

  const dataset: TrainingDatasetRow[] = [];

  for (const feature of features) {
    const target = targetByTimestamp.get(feature.timestamp);

    if (!target) {
      continue;
    }

    const featureValues = [
      feature.return_1,
      feature.log_return_1,
      feature.sma_10,
      feature.sma_20,
      feature.price_to_sma_10,
      feature.price_to_sma_20,
      feature.volatility_10,
      feature.volume_change_1,
      feature.rsi_14,
    ];

    if (featureValues.some((value) => value === null)) {
      continue;
    }

    dataset.push({
      timestamp: feature.timestamp,
      features: {
        close: feature.close,
        volume: feature.volume,
        return_1: feature.return_1,
        log_return_1: feature.log_return_1,
        sma_10: feature.sma_10,
        sma_20: feature.sma_20,
        price_to_sma_10: feature.price_to_sma_10,
        price_to_sma_20: feature.price_to_sma_20,
        volatility_10: feature.volatility_10,
        volume_change_1: feature.volume_change_1,
        rsi_14: feature.rsi_14,
      },
      target: target.target,
      futureTimestamp: target.futureTimestamp,
    });
  }

  return dataset.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  );
}