import type { MarketCandle, Timeframe } from '@marketpilot/types';

export const supportedTimeframes: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
];

export interface CandleNormalizationResult {
  candles: MarketCandle[];
  rejected: number;
  duplicates: number;
}

export function validateCandle(
  candle: MarketCandle,
  now = new Date(),
): string[] {
  const errors: string[] = [];

  const timestamp = Date.parse(candle.timestamp);

  if (!candle.timestamp || Number.isNaN(timestamp)) {
    errors.push('invalid_timestamp');
  }

  if (!Number.isNaN(timestamp) && timestamp > now.getTime()) {
    errors.push('future_timestamp');
  }

  if (
    ![
      candle.open,
      candle.high,
      candle.low,
      candle.close,
    ].every(
      (value) =>
        Number.isFinite(value) && value > 0,
    )
  ) {
    errors.push('invalid_ohlc');
  }

  if (
    candle.high < candle.open ||
    candle.high < candle.close ||
    candle.high < candle.low
  ) {
    errors.push('invalid_high');
  }

  if (
    candle.low > candle.open ||
    candle.low > candle.close ||
    candle.low > candle.high
  ) {
    errors.push('invalid_low');
  }

  if (
    candle.volume !== undefined &&
    (!Number.isFinite(candle.volume) ||
      candle.volume < 0)
  ) {
    errors.push('invalid_volume');
  }

  return errors;
}

export function normalizeCandles(
  candles: MarketCandle[],
  now = new Date(),
): CandleNormalizationResult {
  const validCandles: MarketCandle[] = [];
  let rejected = 0;

  for (const candle of candles) {
    const errors = validateCandle(candle, now);

    if (errors.length > 0) {
      rejected += 1;
      continue;
    }

    const timestamp = new Date(
      candle.timestamp,
    ).toISOString();

    validCandles.push({
      ...candle,
      timestamp,
    });
  }

  validCandles.sort(
    (a, b) =>
      Date.parse(a.timestamp) -
      Date.parse(b.timestamp),
  );

  const uniqueCandles: MarketCandle[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const candle of validCandles) {
    const key = [
      candle.assetId,
      candle.timeframe,
      candle.timestamp,
      candle.source,
    ].join('|');

    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }

    seen.add(key);
    uniqueCandles.push(candle);
  }

  return {
    candles: uniqueCandles,
    rejected,
    duplicates,
  };
}

export function validateDateRange(
  start: string,
  end: string,
  maxDays = 366,
): { start: Date; end: Date } {
  const parsedStart = new Date(start);
  const parsedEnd = new Date(end);

  if (
    Number.isNaN(parsedStart.getTime()) ||
    Number.isNaN(parsedEnd.getTime())
  ) {
    throw new Error('invalid_date_range');
  }

  if (parsedStart > parsedEnd) {
    throw new Error('date_order');
  }

  const days =
    (parsedEnd.getTime() -
      parsedStart.getTime()) /
    86_400_000;

  if (days > maxDays) {
    throw new Error('date_range_too_large');
  }

  if (parsedEnd > new Date()) {
    throw new Error('future_date_range');
  }

  return {
    start: parsedStart,
    end: parsedEnd,
  };
}