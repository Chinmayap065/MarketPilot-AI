import type {
  MarketCandle,
  Timeframe,
} from '@marketpilot/types';

import { validateDateRange } from '../market-data/validation.js';
import {
  MarketDataService,
} from '../market-data/market-data.service.js';
import {
  buildAndValidateTrainingDataset,
  type TrainingDataBuildResult,
} from './training-data.service.js';

const FEATURE_LOOKBACK_CANDLES = 20;
const LOOKBACK_BUFFER_MULTIPLIER = 2;

const timeframeIntervalMs: Record<
  Timeframe,
  number
> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

type MarketDataHistoryPort = Pick<
  MarketDataService,
  'getHistory'
>;

export interface TrainingHistoryRequest {
  symbol: string;
  timeframe: Timeframe;
  start: Date;
  end: Date;
  horizon?: number;
}

export interface TrainingHistoryResult {
  symbol: string;
  timeframe: Timeframe;
  requestedStart: string;
  requestedEnd: string;
  historyStart: string;
  historyEnd: string;
  candles: MarketCandle[];
  marketDataMeta: Awaited<
    ReturnType<MarketDataService['getHistory']>
  >['meta'];
  dataset: TrainingDataBuildResult['dataset'];
  validation: TrainingDataBuildResult['validation'];
}

function calculateHistoryStart(
  start: Date,
  timeframe: Timeframe,
): Date {
  const intervalMs =
    timeframeIntervalMs[timeframe];

  const lookbackIntervals =
    FEATURE_LOOKBACK_CANDLES *
    LOOKBACK_BUFFER_MULTIPLIER;

  return new Date(
    start.getTime() -
      lookbackIntervals * intervalMs,
  );
}

function calculateHistoryEnd(
  end: Date,
  timeframe: Timeframe,
  horizon: number,
): Date {
  const intervalMs =
    timeframeIntervalMs[timeframe];

  return new Date(
    end.getTime() +
      horizon * intervalMs,
  );
}

function filterDatasetToRequestedRange(
  dataset: TrainingDataBuildResult['dataset'],
  start: Date,
  end: Date,
): TrainingDataBuildResult['dataset'] {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return dataset.filter((row) => {
    const timestamp =
      new Date(row.timestamp).getTime();

    return (
      timestamp >= startTime &&
      timestamp <= endTime
    );
  });
}

function assertSufficientHistory(
  candles: MarketCandle[],
  start: Date,
): void {
  const candlesBeforeStart =
    candles.filter(
      (candle) =>
        new Date(candle.timestamp).getTime() <
        start.getTime(),
    );

  if (
    candlesBeforeStart.length <
    FEATURE_LOOKBACK_CANDLES
  ) {
    throw new Error(
      `insufficient historical lookback: expected at least ${FEATURE_LOOKBACK_CANDLES} candles before training start, received ${candlesBeforeStart.length}`,
    );
  }
}

export async function buildTrainingDatasetFromMarketData(
  request: TrainingHistoryRequest,
  marketData: MarketDataHistoryPort =
    new MarketDataService(),
): Promise<TrainingHistoryResult> {
  const horizon = request.horizon ?? 1;

  if (
    !Number.isInteger(horizon) ||
    horizon < 1
  ) {
    throw new Error(
      'horizon must be a positive integer',
    );
  }

  const { start, end } =
    validateDateRange(
      request.start.toISOString(),
      request.end.toISOString(),
    );

  const historyStart =
    calculateHistoryStart(
      start,
      request.timeframe,
    );

  const historyEnd =
    calculateHistoryEnd(
      end,
      request.timeframe,
      horizon,
    );

  const history =
    await marketData.getHistory(
      request.symbol,
      request.timeframe,
      historyStart,
      historyEnd,
    );

  if (
    history.meta.dataStatus ===
      'UNAVAILABLE' ||
    history.data.length === 0
  ) {
    throw new Error(
      `market data unavailable for ${request.symbol}`,
    );
  }

  assertSufficientHistory(
    history.data,
    start,
  );

  const trainingData =
    await buildAndValidateTrainingDataset(
      history.data,
      horizon,
    );

  const dataset =
    filterDatasetToRequestedRange(
      trainingData.dataset,
      start,
      end,
    );

  if (dataset.length === 0) {
    throw new Error(
      'training dataset contains no rows inside the requested date range',
    );
  }

  return {
    symbol: request.symbol,
    timeframe: request.timeframe,
    requestedStart: start.toISOString(),
    requestedEnd: end.toISOString(),
    historyStart:
      historyStart.toISOString(),
    historyEnd: historyEnd.toISOString(),
    candles: history.data,
    marketDataMeta: history.meta,
    dataset,
    validation: trainingData.validation,
  };
}