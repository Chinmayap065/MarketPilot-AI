import { describe, expect, it } from 'vitest';
import type { MarketCandle } from '@marketpilot/types';
import { buildPredictionTargets } from './target.js';

function createCandle(
  timestamp: string,
  close: number,
): MarketCandle {
  return {
    assetId: 'asset-1',
    timestamp,
    timeframe: '1d',
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
    source: 'test',
  };
}

describe('buildPredictionTargets', () => {
  it('returns an empty array for empty input', () => {
    expect(buildPredictionTargets([])).toEqual([]);
  });

  it('creates a next-candle UP target when the future close is higher', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 105),
    ];

    const result = buildPredictionTargets(candles);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      timestamp: '2026-01-01T00:00:00.000Z',
      futureTimestamp: '2026-01-02T00:00:00.000Z',
      currentClose: 100,
      futureClose: 105,
      target: 1,
    });
  });

  it('creates a DOWN target when the future close is lower', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 95),
    ];

    const result = buildPredictionTargets(candles);

    expect(result[0].target).toBe(0);
  });

  it('treats an unchanged future close as not UP', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 100),
    ];

    const result = buildPredictionTargets(candles);

    expect(result[0].target).toBe(0);
  });

  it('does not create a target for the final candle', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 105),
      createCandle('2026-01-03T00:00:00.000Z', 110),
    ];

    const result = buildPredictionTargets(candles);

    expect(result).toHaveLength(2);
    expect(result[1].timestamp).toBe(
      '2026-01-02T00:00:00.000Z',
    );
  });

  it('supports a multi-candle prediction horizon', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 103),
      createCandle('2026-01-03T00:00:00.000Z', 98),
      createCandle('2026-01-04T00:00:00.000Z', 110),
    ];

    const result = buildPredictionTargets(candles, 2);

    expect(result).toHaveLength(2);

    expect(result[0]).toMatchObject({
      timestamp: '2026-01-01T00:00:00.000Z',
      futureTimestamp: '2026-01-03T00:00:00.000Z',
      currentClose: 100,
      futureClose: 98,
      target: 0,
    });

    expect(result[1]).toMatchObject({
      timestamp: '2026-01-02T00:00:00.000Z',
      futureTimestamp: '2026-01-04T00:00:00.000Z',
      currentClose: 103,
      futureClose: 110,
      target: 1,
    });
  });

  it('returns no targets when the horizon is larger than the available data', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 105),
    ];

    expect(buildPredictionTargets(candles, 2)).toEqual([]);
  });

  it('does not mutate the input candle order', () => {
    const candles = [
      createCandle('2026-01-02T00:00:00.000Z', 105),
      createCandle('2026-01-01T00:00:00.000Z', 100),
    ];

    const originalTimestamps = candles.map(
      (candle) => candle.timestamp,
    );

    buildPredictionTargets(candles);

    expect(candles.map((candle) => candle.timestamp)).toEqual(
      originalTimestamps,
    );
  });

  it('uses only the future close to determine the target', () => {
    const candles = [
      createCandle('2026-01-01T00:00:00.000Z', 100),
      createCandle('2026-01-02T00:00:00.000Z', 101),
      createCandle('2026-01-03T00:00:00.000Z', 99),
    ];

    const result = buildPredictionTargets(candles);

    expect(result.map((row) => row.target)).toEqual([1, 0]);
  });
});