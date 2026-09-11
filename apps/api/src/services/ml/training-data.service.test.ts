import type { MarketCandle } from '@marketpilot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as mlService from './ml-service';
import { buildAndValidateTrainingDataset } from './training-data.service';

const FEATURE_NAMES = [
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
];

const makeCandle = (
  index: number,
  close: number,
): MarketCandle => ({
  assetId: 'test-asset',
  timestamp: new Date(
    Date.UTC(2026, 0, 1, 9, index * 15),
  ).toISOString(),
  timeframe: '15m',
  open: close - 1,
  high: close + 1,
  low: close - 2,
  close,
  volume: 1000 + index * 10,
  source: 'test',
});

const makeCandles = (count: number): MarketCandle[] =>
  Array.from(
    { length: count },
    (_, index) => makeCandle(index, 100 + index),
  );

describe('buildAndValidateTrainingDataset', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the dataset from candles and validates it through the ML service', async () => {
    const candles = makeCandles(30);

    vi.spyOn(
      mlService,
      'validateTrainingDataset',
    ).mockResolvedValue({
      valid: true,
      rowCount: 10,
      featureCount: 11,
      featureNames: FEATURE_NAMES,
    });

    const result = await buildAndValidateTrainingDataset(
      candles,
    );

    expect(result.dataset).toHaveLength(10);
    expect(result.validation).toEqual({
      valid: true,
      rowCount: 10,
      featureCount: 11,
      featureNames: FEATURE_NAMES,
    });

    expect(
      mlService.validateTrainingDataset,
    ).toHaveBeenCalledTimes(1);

    expect(
      mlService.validateTrainingDataset,
    ).toHaveBeenCalledWith(result.dataset);
  });

  it('uses the requested prediction horizon', async () => {
    const candles = makeCandles(30);

    vi.spyOn(
      mlService,
      'validateTrainingDataset',
    ).mockResolvedValue({
      valid: true,
      rowCount: 9,
      featureCount: 11,
      featureNames: FEATURE_NAMES,
    });

    const result = await buildAndValidateTrainingDataset(
      candles,
      2,
    );

    expect(result.dataset).toHaveLength(9);

    const firstRowIndex = candles.findIndex(
      (candle) =>
        candle.timestamp === result.dataset[0].timestamp,
    );

    expect(firstRowIndex).toBeGreaterThanOrEqual(0);

    expect(
      result.dataset[0].futureTimestamp,
    ).toBe(
      candles[firstRowIndex + 2].timestamp,
    );
  });

  it('rejects empty candles before calling the ML service', async () => {
    const validateSpy = vi.spyOn(
      mlService,
      'validateTrainingDataset',
    );

    await expect(
      buildAndValidateTrainingDataset([]),
    ).rejects.toThrow(
      'market candles cannot be empty',
    );

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('rejects an invalid horizon', async () => {
    const candles = makeCandles(30);

    const validateSpy = vi.spyOn(
      mlService,
      'validateTrainingDataset',
    );

    await expect(
      buildAndValidateTrainingDataset(candles, 0),
    ).rejects.toThrow(
      'horizon must be a positive integer',
    );

    await expect(
      buildAndValidateTrainingDataset(candles, 1.5),
    ).rejects.toThrow(
      'horizon must be a positive integer',
    );

    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('rejects when feature and target construction produces no training rows', async () => {
    const candles = makeCandles(20);

    const validateSpy = vi.spyOn(
      mlService,
      'validateTrainingDataset',
    );

    await expect(
      buildAndValidateTrainingDataset(candles),
    ).rejects.toThrow(
      'training dataset is empty after feature and target construction',
    );

    expect(validateSpy).not.toHaveBeenCalled();
  });
});