import type { MarketCandle, Timeframe } from '@marketpilot/types';

export interface CandleGap {
  previousTimestamp: string;
  nextTimestamp: string;
  expectedIntervalMs: number;
  actualIntervalMs: number;
  missingIntervals: number;
}

export interface CandleGapAnalysis {
  timeframe: Timeframe;
  expectedIntervalMs: number;
  candlesAnalyzed: number;
  potentialGaps: CandleGap[];
}

const timeframeIntervals: Record<Timeframe, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

export function getTimeframeIntervalMs(
  timeframe: Timeframe,
): number {
  return timeframeIntervals[timeframe];
}

export function analyzeCandleGaps(
  candles: MarketCandle[],
): CandleGapAnalysis {
  if (candles.length === 0) {
    return {
      timeframe: '1d',
      expectedIntervalMs: timeframeIntervals['1d'],
      candlesAnalyzed: 0,
      potentialGaps: [],
    };
  }

  const timeframe = candles[0].timeframe;
  const expectedIntervalMs =
    getTimeframeIntervalMs(timeframe);

  const sortedCandles = [...candles].sort(
    (a, b) =>
      Date.parse(a.timestamp) -
      Date.parse(b.timestamp),
  );

  const potentialGaps: CandleGap[] = [];

  for (let index = 1; index < sortedCandles.length; index += 1) {
    const previous = sortedCandles[index - 1];
    const current = sortedCandles[index];

    const previousTimestamp = Date.parse(
      previous.timestamp,
    );
    const currentTimestamp = Date.parse(
      current.timestamp,
    );

    const actualIntervalMs =
      currentTimestamp - previousTimestamp;

    if (actualIntervalMs <= expectedIntervalMs) {
      continue;
    }

    const missingIntervals =
      Math.max(
        0,
        Math.round(
          actualIntervalMs / expectedIntervalMs,
        ) - 1,
      );

    potentialGaps.push({
      previousTimestamp: previous.timestamp,
      nextTimestamp: current.timestamp,
      expectedIntervalMs,
      actualIntervalMs,
      missingIntervals,
    });
  }

  return {
    timeframe,
    expectedIntervalMs,
    candlesAnalyzed: sortedCandles.length,
    potentialGaps,
  };
}