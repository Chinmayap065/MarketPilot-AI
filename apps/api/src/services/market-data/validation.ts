import type { MarketCandle, Timeframe } from '@marketpilot/types';

export const supportedTimeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

export function validateCandle(candle: MarketCandle, now = new Date()): string[] {
  const errors: string[] = [];
  if (!candle.timestamp || Number.isNaN(Date.parse(candle.timestamp))) errors.push('invalid_timestamp');
  if (Date.parse(candle.timestamp) > now.getTime()) errors.push('future_timestamp');
  if (![candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0)) errors.push('invalid_ohlc');
  if (candle.high < candle.open || candle.high < candle.close || candle.high < candle.low) errors.push('invalid_high');
  if (candle.low > candle.open || candle.low > candle.close || candle.low > candle.high) errors.push('invalid_low');
  if (candle.volume !== undefined && (!Number.isFinite(candle.volume) || candle.volume < 0)) errors.push('invalid_volume');
  return errors;
}

export function validateDateRange(start: string, end: string, maxDays = 366): { start: Date; end: Date } {
  const parsedStart = new Date(start);
  const parsedEnd = new Date(end);
  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) throw new Error('invalid_date_range');
  if (parsedStart > parsedEnd) throw new Error('date_order');
  const days = (parsedEnd.getTime() - parsedStart.getTime()) / 86_400_000;
  if (days > maxDays) throw new Error('date_range_too_large');
  if (parsedEnd > new Date()) throw new Error('future_date_range');
  return { start: parsedStart, end: parsedEnd };
}
