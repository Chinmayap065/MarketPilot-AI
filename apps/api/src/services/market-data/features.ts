import type { MarketCandle } from '@marketpilot/types';

export interface MarketFeatureRow {
  timestamp: string;
  close: number;
  volume?: number;

  return_1: number | null;
  log_return_1: number | null;

  sma_10: number | null;
  sma_20: number | null;

  price_to_sma_10: number | null;
  price_to_sma_20: number | null;

  volatility_10: number | null;
  volume_change_1: number | null;

  rsi_14: number | null;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return NaN;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) {
    return NaN;
  }

  const mean = average(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum + (value - mean) ** 2,
      0,
    ) / values.length;

  return Math.sqrt(variance);
}

function calculateRsi(
  closes: number[],
  period: number,
): number | null {
  if (closes.length < period + 1) {
    return null;
  }

  const changes: number[] = [];

  for (let index = 1; index < closes.length; index += 1) {
    changes.push(
      closes[index] - closes[index - 1],
    );
  }

  const recentChanges = changes.slice(-period);

  const gains = recentChanges
    .filter((change) => change > 0);

  const losses = recentChanges
    .filter((change) => change < 0)
    .map((change) => Math.abs(change));

  const averageGain =
    average(gains.length > 0 ? gains : [0]);

  const averageLoss =
    average(losses.length > 0 ? losses : [0]);

  if (averageLoss === 0) {
    if (averageGain === 0) {
      return 50;
    }

    return 100;
  }

  const relativeStrength =
    averageGain / averageLoss;

  return (
    100 -
    100 / (1 + relativeStrength)
  );
}

function calculateSma(
  closes: number[],
  period: number,
): number | null {
  if (closes.length < period) {
    return null;
  }

  return average(closes.slice(-period));
}

function calculateVolatility(
  returns: number[],
  period: number,
): number | null {
  if (returns.length < period) {
    return null;
  }

  return standardDeviation(
    returns.slice(-period),
  );
}

function calculateVolumeChange(
  volumes: Array<number | undefined>,
): number | null {
  if (volumes.length < 2) {
    return null;
  }

  const current = volumes[volumes.length - 1];
  const previous = volumes[volumes.length - 2];

  if (
    current === undefined ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }

  return (current - previous) / previous;
}

export function buildMarketFeatures(
  candles: MarketCandle[],
): MarketFeatureRow[] {
  if (candles.length === 0) {
    return [];
  }

  const sortedCandles = [...candles].sort(
    (a, b) =>
      Date.parse(a.timestamp) -
      Date.parse(b.timestamp),
  );

  const closes: number[] = [];
  const returns: number[] = [];

  return sortedCandles.map((candle, index) => {
    const close = candle.close;

    closes.push(close);

    let return1: number | null = null;
    let logReturn1: number | null = null;

    if (index > 0) {
      const previousClose =
        sortedCandles[index - 1].close;

      return1 =
        (close - previousClose) /
        previousClose;

      logReturn1 = Math.log(
        close / previousClose,
      );

      returns.push(return1);
    }

    const sma10 = calculateSma(
      closes,
      10,
    );

    const sma20 = calculateSma(
      closes,
      20,
    );

    const priceToSma10 =
      sma10 === null
        ? null
        : close / sma10;

    const priceToSma20 =
      sma20 === null
        ? null
        : close / sma20;

    const volatility10 =
      calculateVolatility(
        returns,
        10,
      );

    const volumeChange =
      calculateVolumeChange(
        sortedCandles
          .slice(
            Math.max(0, index - 1),
            index + 1,
          )
          .map((item) => item.volume),
      );

    const rsi14 = calculateRsi(
      closes,
      14,
    );

    return {
      timestamp: candle.timestamp,
      close,
      volume: candle.volume,

      return_1: return1,
      log_return_1: logReturn1,

      sma_10: sma10,
      sma_20: sma20,

      price_to_sma_10: priceToSma10,
      price_to_sma_20: priceToSma20,

      volatility_10: volatility10,
      volume_change_1: volumeChange,

      rsi_14: rsi14,
    };
  });
}