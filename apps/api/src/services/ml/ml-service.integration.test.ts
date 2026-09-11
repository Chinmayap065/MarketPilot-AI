import type { TrainingDatasetRow } from '../market-data/dataset';
import { describe, expect, it } from 'vitest';

import { validateTrainingDataset } from './ml-service';

const makeTrainingRow = (
  timestamp: string,
  futureTimestamp: string,
  target: 0 | 1,
): TrainingDatasetRow => ({
  timestamp,
  futureTimestamp,
  features: {
    close: 100,
    volume: 1000,
    return_1: 0.01,
    log_return_1: 0.00995,
    sma_10: 99,
    sma_20: 98,
    price_to_sma_10: 1.0101,
    price_to_sma_20: 1.0204,
    volatility_10: 0.02,
    volume_change_1: 0.05,
    rsi_14: 55,
  },
  target,
});

describe('ML service integration', () => {
  it('validates a real training dataset through the running Python ML service', async () => {
    const rows = [
      makeTrainingRow(
        '2026-01-01T09:15:00+00:00',
        '2026-01-01T09:30:00+00:00',
        1,
      ),
      makeTrainingRow(
        '2026-01-01T09:30:00+00:00',
        '2026-01-01T09:45:00+00:00',
        0,
      ),
    ];

    const result = await validateTrainingDataset(rows);

    expect(result).toEqual({
      valid: true,
      rowCount: 2,
      featureCount: 11,
      featureNames: [
        'close',
        'volume',
        'return_1',
        'log_return_1',
        'sma_10',
        'sma_20',
        'price_to_sma_10',
        'price_to_sma_20',
        'volatility_10',
        'volume_change_1',
        'rsi_14',
      ],
    });
  });

  it('receives validation errors from the real Python ML service', async () => {
    const rows = [
      makeTrainingRow(
        '2026-01-01T09:30:00+00:00',
        '2026-01-01T09:45:00+00:00',
        1,
      ),
      makeTrainingRow(
        '2026-01-01T09:15:00+00:00',
        '2026-01-01T09:30:00+00:00',
        0,
      ),
    ];

    await expect(validateTrainingDataset(rows)).rejects.toThrow(
      'dataset timestamps must be strictly chronological with no duplicates',
    );
  });
});