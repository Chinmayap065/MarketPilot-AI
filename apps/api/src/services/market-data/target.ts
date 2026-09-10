import type { MarketCandle } from '@marketpilot/types';

export interface PredictionTargetRow {
  timestamp: string;
  futureTimestamp: string;
  currentClose: number;
  futureClose: number;
  target: 0 | 1;
}

export function buildPredictionTargets(
  candles: MarketCandle[],
  horizon = 1,
): PredictionTargetRow[] {
  if (candles.length === 0 || horizon < 1) {
    return [];
  }

  const sortedCandles = [...candles].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime(),
  );

  const targets: PredictionTargetRow[] = [];

  for (let index = 0; index + horizon < sortedCandles.length; index += 1) {
    const current = sortedCandles[index];
    const future = sortedCandles[index + horizon];

    targets.push({
      timestamp: current.timestamp,
      futureTimestamp: future.timestamp,
      currentClose: current.close,
      futureClose: future.close,
      target: future.close > current.close ? 1 : 0,
    });
  }

  return targets;
}