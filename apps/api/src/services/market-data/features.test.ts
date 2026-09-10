import { describe, expect, it } from 'vitest';

import type { MarketCandle } from '@marketpilot/types';

import {
  buildMarketFeatures,
} from './features.js';

function createCandle(
  index: number,
  close: number,
  volume = 1_000,
): MarketCandle {
  const timestamp = new Date(
    Date.UTC(
      2026,
      0,
      1 + index,
    ),
  ).toISOString();

  return {
    assetId: 'test-asset',
    timestamp,
    timeframe: '1d',
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume,
    source: 'test',
  };
}

describe('market feature engineering', () => {
  it('returns an empty array for empty candles', () => {
    expect(buildMarketFeatures([])).toEqual([]);
  });

  it('preserves candle order chronologically', () => {
    const candles = [
      createCandle(2, 102),
      createCandle(0, 100),
      createCandle(1, 101),
    ];

    const features =
      buildMarketFeatures(candles);

    expect(
      features.map(
        (feature) => feature.timestamp,
      ),
    ).toEqual([
      candles[1].timestamp,
      candles[2].timestamp,
      candles[0].timestamp,
    ]);
  });

  it('does not mutate the input candles', () => {
    const candles = [
      createCandle(2, 102),
      createCandle(0, 100),
      createCandle(1, 101),
    ];

    const originalOrder = candles.map(
      (candle) => candle.timestamp,
    );

    buildMarketFeatures(candles);

    expect(
      candles.map(
        (candle) => candle.timestamp,
      ),
    ).toEqual(originalOrder);
  });

  it('calculates one-period returns', () => {
    const candles = [
      createCandle(0, 100),
      createCandle(1, 110),
    ];

    const features =
      buildMarketFeatures(candles);

    expect(features[0].return_1).toBeNull();
    expect(features[1].return_1).toBeCloseTo(
      0.1,
    );
  });

  it('calculates log returns', () => {
    const candles = [
      createCandle(0, 100),
      createCandle(1, 110),
    ];

    const features =
      buildMarketFeatures(candles);

    expect(
      features[1].log_return_1,
    ).toBeCloseTo(
      Math.log(1.1),
    );
  });

  it('waits for enough candles before calculating SMA', () => {
    const candles = Array.from(
      { length: 20 },
      (_, index) =>
        createCandle(index, 100 + index),
    );

    const features =
      buildMarketFeatures(candles);

    expect(features[18].sma_20).toBeNull();

    expect(features[19].sma_20).toBeCloseTo(
      109.5,
    );
  });

  it('calculates price to SMA ratios', () => {
    const candles = Array.from(
      { length: 20 },
      () => createCandle(0, 100),
    ).map((candle, index) => ({
      ...candle,
      timestamp: new Date(
        Date.UTC(
          2026,
          0,
          1 + index,
        ),
      ).toISOString(),
    }));

    const features =
      buildMarketFeatures(candles);

    expect(
      features[19].price_to_sma_20,
    ).toBeCloseTo(1);
  });

  it('calculates volume change', () => {
    const candles = [
      createCandle(0, 100, 1_000),
      createCandle(1, 101, 1_500),
    ];

    const features =
      buildMarketFeatures(candles);

    expect(
      features[0].volume_change_1,
    ).toBeNull();

    expect(
      features[1].volume_change_1,
    ).toBeCloseTo(0.5);
  });

  it('calculates RSI after enough observations', () => {
    const candles = Array.from(
      { length: 15 },
      (_, index) =>
        createCandle(
          index,
          100 + index,
        ),
    );

    const features =
      buildMarketFeatures(candles);

    expect(
      features[13].rsi_14,
    ).toBeNull();

    expect(
      features[14].rsi_14,
    ).toBe(100);
  });

  it('calculates rolling volatility after enough returns', () => {
    const candles = Array.from(
      { length: 12 },
      (_, index) =>
        createCandle(
          index,
          index % 2 === 0
            ? 100
            : 101,
        ),
    );

    const features =
      buildMarketFeatures(candles);

    expect(
      features[9].volatility_10,
    ).toBeNull();

    expect(
      features[10].volatility_10,
    ).not.toBeNull();
  });
});