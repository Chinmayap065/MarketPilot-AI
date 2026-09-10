import { describe, expect, it } from 'vitest';

import type { MarketCandle } from '@marketpilot/types';

import {
  analyzeCandleGaps,
  getTimeframeIntervalMs,
} from './gap-analysis.js';

function createCandle(
  timestamp: string,
  timeframe: MarketCandle['timeframe'] = '1d',
): MarketCandle {
  return {
    assetId: 'test-asset',
    timestamp,
    timeframe,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    source: 'test',
  };
}

describe('candle gap analysis', () => {
  it('returns the correct interval for each timeframe', () => {
    expect(getTimeframeIntervalMs('1m')).toBe(
      60_000,
    );

    expect(getTimeframeIntervalMs('5m')).toBe(
      5 * 60_000,
    );

    expect(getTimeframeIntervalMs('1h')).toBe(
      60 * 60_000,
    );

    expect(getTimeframeIntervalMs('1d')).toBe(
      24 * 60 * 60_000,
    );

    expect(getTimeframeIntervalMs('1w')).toBe(
      7 * 24 * 60 * 60_000,
    );
  });

  it('returns no gaps for continuous candles', () => {
    const candles = [
      createCandle('2026-09-07T00:00:00.000Z'),
      createCandle('2026-09-08T00:00:00.000Z'),
      createCandle('2026-09-09T00:00:00.000Z'),
      createCandle('2026-09-10T00:00:00.000Z'),
    ];

    const result = analyzeCandleGaps(candles);

    expect(result.candlesAnalyzed).toBe(4);
    expect(result.potentialGaps).toHaveLength(0);
  });

  it('detects a missing daily candle', () => {
    const candles = [
      createCandle('2026-09-07T00:00:00.000Z'),
      createCandle('2026-09-08T00:00:00.000Z'),
      createCandle('2026-09-10T00:00:00.000Z'),
    ];

    const result = analyzeCandleGaps(candles);

    expect(result.potentialGaps).toHaveLength(1);

    expect(
      result.potentialGaps[0],
    ).toMatchObject({
      previousTimestamp:
        '2026-09-08T00:00:00.000Z',
      nextTimestamp:
        '2026-09-10T00:00:00.000Z',
      missingIntervals: 1,
    });
  });

  it('detects multiple missing intervals', () => {
    const candles = [
      createCandle('2026-09-01T00:00:00.000Z'),
      createCandle('2026-09-05T00:00:00.000Z'),
    ];

    const result = analyzeCandleGaps(candles);

    expect(result.potentialGaps).toHaveLength(1);
    expect(
      result.potentialGaps[0]?.missingIntervals,
    ).toBe(3);
  });

  it('works with intraday timeframes', () => {
    const candles = [
      createCandle(
        '2026-09-10T09:15:00.000Z',
        '15m',
      ),
      createCandle(
        '2026-09-10T09:30:00.000Z',
        '15m',
      ),
      createCandle(
        '2026-09-10T10:00:00.000Z',
        '15m',
      ),
    ];

    const result = analyzeCandleGaps(candles);

    expect(result.timeframe).toBe('15m');
    expect(result.potentialGaps).toHaveLength(1);
    expect(
      result.potentialGaps[0]?.missingIntervals,
    ).toBe(1);
  });

  it('does not modify the original candle order', () => {
    const candles = [
      createCandle('2026-09-10T00:00:00.000Z'),
      createCandle('2026-09-08T00:00:00.000Z'),
      createCandle('2026-09-09T00:00:00.000Z'),
    ];

    analyzeCandleGaps(candles);

    expect(
      candles.map((candle) => candle.timestamp),
    ).toEqual([
      '2026-09-10T00:00:00.000Z',
      '2026-09-08T00:00:00.000Z',
      '2026-09-09T00:00:00.000Z',
    ]);
  });

  it('returns an empty analysis for no candles', () => {
    const result = analyzeCandleGaps([]);

    expect(result.candlesAnalyzed).toBe(0);
    expect(result.potentialGaps).toHaveLength(0);
  });
});