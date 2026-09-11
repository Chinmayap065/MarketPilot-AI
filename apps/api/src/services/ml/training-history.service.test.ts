import type {
  MarketCandle,
  MarketQuote,
} from '@marketpilot/types';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  buildTrainingDatasetFromMarketData,
} from './training-history.service.js';

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

function makeCandle(
  index: number,
  close: number,
): MarketCandle {
  return {
    assetId: 'test-asset',
    timestamp: new Date(
      Date.UTC(
        2026,
        0,
        1,
        9,
        index * 15,
      ),
    ).toISOString(),
    timeframe: '15m',
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: 1000 + index * 10,
    source: 'test',
  };
}

function makeCandles(
  count: number,
): MarketCandle[] {
  return Array.from(
    { length: count },
    (_, index) =>
      makeCandle(index, 100 + index),
  );
}

function createMarketDataMock(
  candles: MarketCandle[],
) {
  return {
    getHistory: vi
      .fn()
      .mockResolvedValue({
        data: candles,
        meta: {
          source: 'test-provider',
          dataStatus: 'LIVE',
          rejected: 0,
          duplicates: 0,
          gapAnalysis: {
            timeframe: '15m',
            expectedIntervalMs: 15 * 60 * 1000,
            candlesAnalyzed: candles.length,
            potentialGaps: [],
          },
        },
      }),
  };
}

describe(
  'buildTrainingDatasetFromMarketData',
  () => {
    it(
      'fetches lookback and future target history and returns only requested training rows',
      async () => {
        const candles = makeCandles(60);
        const marketData =
          createMarketDataMock(candles);

        const start = new Date(
          candles[20].timestamp,
        );

        const end = new Date(
          candles[40].timestamp,
        );

        const result =
          await buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start,
              end,
              horizon: 2,
            },
            marketData,
          );

        expect(
          marketData.getHistory,
        ).toHaveBeenCalledTimes(1);

        const call =
          marketData.getHistory.mock.calls[0];

        expect(call[0]).toBe('AAPL');
        expect(call[1]).toBe('15m');

        const historyStart =
          call[2] as Date;

        const historyEnd =
          call[3] as Date;

        expect(
          historyStart.getTime(),
        ).toBe(
          start.getTime() -
            40 * 15 * 60 * 1000,
        );

        expect(
          historyEnd.getTime(),
        ).toBe(
          end.getTime() +
            2 * 15 * 60 * 1000,
        );

        expect(
          result.requestedStart,
        ).toBe(start.toISOString());

        expect(
          result.requestedEnd,
        ).toBe(end.toISOString());

        expect(
          result.historyStart,
        ).toBe(
          historyStart.toISOString(),
        );

        expect(
          result.historyEnd,
        ).toBe(
          historyEnd.toISOString(),
        );

        expect(
          result.dataset.every((row) => {
            const timestamp =
              new Date(
                row.timestamp,
              ).getTime();

            return (
              timestamp >=
                start.getTime() &&
              timestamp <=
                end.getTime()
            );
          }),
        ).toBe(true);

        expect(
          result.dataset.length,
        ).toBeGreaterThan(0);

        expect(
          result.validation.featureCount,
        ).toBe(11);

        expect(
          result.validation.featureNames,
        ).toEqual(FEATURE_NAMES);
      },
    );

    it(
      'uses the requested prediction horizon',
      async () => {
        const candles = makeCandles(60);
        const marketData =
          createMarketDataMock(candles);

        const start = new Date(
          candles[20].timestamp,
        );

        const end = new Date(
          candles[40].timestamp,
        );

        const result =
          await buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start,
              end,
              horizon: 2,
            },
            marketData,
          );

        const firstRow =
          result.dataset[0];

        expect(firstRow).toBeDefined();

        const firstRowIndex =
          candles.findIndex(
            (candle) =>
              candle.timestamp ===
              firstRow?.timestamp,
          );

        expect(
          firstRowIndex,
        ).toBeGreaterThanOrEqual(0);

        expect(
          firstRow?.futureTimestamp,
        ).toBe(
          candles[
            firstRowIndex + 2
          ]?.timestamp,
        );
      },
    );

    it(
      'rejects when market data is unavailable',
      async () => {
        const marketData = {
          getHistory: vi
            .fn()
            .mockResolvedValue({
              data: [],
              meta: {
                source: null,
                dataStatus: 'UNAVAILABLE',
                rejected: 0,
                duplicates: 0,
                gapAnalysis: {
                  timeframe: '15m',
                  expectedIntervalMs:
                    15 * 60 * 1000,
                  candlesAnalyzed: 0,
                  potentialGaps: [],
                },
              },
            }),
        };

        await expect(
          buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start: new Date(
                '2026-01-01T09:30:00.000Z',
              ),
              end: new Date(
                '2026-01-02T09:30:00.000Z',
              ),
            },
            marketData,
          ),
        ).rejects.toThrow(
          'market data unavailable for AAPL',
        );
      },
    );

    it(
      'rejects insufficient historical lookback',
      async () => {
        const candles = makeCandles(30);
        const marketData =
          createMarketDataMock(candles);

        const start = new Date(
          candles[10].timestamp,
        );

        const end = new Date(
          candles[20].timestamp,
        );

        await expect(
          buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start,
              end,
            },
            marketData,
          ),
        ).rejects.toThrow(
          'insufficient historical lookback',
        );
      },
    );

    it(
      'rejects an invalid prediction horizon',
      async () => {
        const marketData =
          createMarketDataMock(
            makeCandles(60),
          );

        await expect(
          buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start: new Date(
                '2026-01-01T09:30:00.000Z',
              ),
              end: new Date(
                '2026-01-02T09:30:00.000Z',
              ),
              horizon: 0,
            },
            marketData,
          ),
        ).rejects.toThrow(
          'horizon must be a positive integer',
        );

        expect(
          marketData.getHistory,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'preserves market data metadata',
      async () => {
        const candles = makeCandles(60);
        const marketData =
          createMarketDataMock(candles);

        const result =
          await buildTrainingDatasetFromMarketData(
            {
              symbol: 'AAPL',
              timeframe: '15m',
              start: new Date(
                candles[20].timestamp,
              ),
              end: new Date(
                candles[40].timestamp,
              ),
            },
            marketData,
          );

        expect(
          result.marketDataMeta.source,
        ).toBe('test-provider');

        expect(
          result.marketDataMeta.dataStatus,
        ).toBe('LIVE');

        expect(
          result.marketDataMeta.rejected,
        ).toBe(0);

        expect(
          result.marketDataMeta.duplicates,
        ).toBe(0);
      },
    );
  },
);