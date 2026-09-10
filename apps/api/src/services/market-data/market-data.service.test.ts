import { describe, expect, it } from 'vitest';

import type {
  Asset,
  MarketCandle,
  MarketQuote,
} from '@marketpilot/types';

import {
  ProviderUnavailableError,
  type MarketDataProvider,
} from './provider.js';

import { MarketDataService } from './market-data.service.js';

import {
  normalizeCandles,
  validateCandle,
  validateDateRange,
} from './validation.js';

const asset: Asset = {
  id: 'test',
  symbol: 'TEST',
  name: 'Test',
  assetClass: 'EQUITY',
  currency: 'USD',
};

const noCache = {
  async getQuote(): Promise<MarketQuote | null> {
    return null;
  },

  async setQuote(): Promise<void> {
    return;
  },
};

function createQuote(source: string): MarketQuote {
  return {
    assetId: asset.id,
    symbol: 'AAPL',
    price: 100,
    currency: 'USD',
    source,
    timestamp: new Date().toISOString(),
    dataStatus: 'LIVE',
  };
}

function createProvider(
  source: string,
  getQuote: MarketDataProvider['getQuote'],
  getHistoricalData: MarketDataProvider['getHistoricalData'] =
    async () => [],
): MarketDataProvider {
  return {
    capabilities: {
      provider: source,
      assetClasses: ['EQUITY'],
      supportsHistorical: true,
      supportsIntraday: true,
      supportsStreaming: false,
      supportedTimeframes: ['1d'],
    },

    getQuote,

    getHistoricalData,

    async searchAssets() {
      return [];
    },

    async getMarketStatus() {
      return {
        session: 'UNKNOWN',
        dataStatus: 'LIVE',
        timestamp: new Date().toISOString(),
        source,
      };
    },
  };
}

describe('market data foundation', () => {
  it('returns canonical assets without fabricating quotes', () => {
    const service = new MarketDataService();

    expect(service.searchAssets('BTC/USD')[0]?.assetClass).toBe(
      'CRYPTO',
    );
  });

  it('reports provider absence explicitly', async () => {
    const result = await new MarketDataService().getQuote('BTC/USD');

    expect(result.data).toBeNull();
    expect(result.meta.dataStatus).toBe('UNAVAILABLE');
  });

  it('validates candle invariants', () => {
    const candle: MarketCandle = {
      assetId: 'a',
      timestamp: new Date().toISOString(),
      timeframe: '1d',
      open: 10,
      high: 8,
      low: 9,
      close: 10,
      source: 'test',
    };

    expect(validateCandle(candle)).toContain(
      'invalid_high',
    );
  });

  it('bounds historical date ranges', () => {
    expect(() =>
      validateDateRange(
        '2020-01-01',
        '2022-01-01',
      ),
    ).toThrow('date_range_too_large');
  });

  it('uses the primary provider when it succeeds', async () => {
    let primaryCalls = 0;
    let secondaryCalls = 0;

    const primary = createProvider(
      'twelve-data',
      async () => {
        primaryCalls += 1;
        return createQuote('twelve-data');
      },
    );

    const secondary = createProvider(
      'alpha-vantage',
      async () => {
        secondaryCalls += 1;
        return createQuote('alpha-vantage');
      },
    );

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    const result = await service.getQuote('AAPL');

    expect(result.data?.source).toBe('twelve-data');
    expect(primaryCalls).toBe(1);
    expect(secondaryCalls).toBe(0);
  });

  it('falls back to the secondary provider when the primary fails', async () => {
    let primaryCalls = 0;
    let secondaryCalls = 0;

    const primary = createProvider(
      'twelve-data',
      async () => {
        primaryCalls += 1;

        throw new ProviderUnavailableError(
          'twelve-data',
          'UNAVAILABLE',
        );
      },
    );

    const secondary = createProvider(
      'alpha-vantage',
      async () => {
        secondaryCalls += 1;
        return createQuote('alpha-vantage');
      },
    );

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    const result = await service.getQuote('AAPL');

    expect(result.data?.source).toBe('alpha-vantage');
    expect(result.meta.dataStatus).toBe('LIVE');
    expect(primaryCalls).toBe(1);
    expect(secondaryCalls).toBe(1);
  });

  it('returns unavailable when both providers fail', async () => {
    const primary = createProvider(
      'twelve-data',
      async () => {
        throw new ProviderUnavailableError(
          'twelve-data',
          'UNAVAILABLE',
        );
      },
    );

    const secondary = createProvider(
      'alpha-vantage',
      async () => {
        throw new ProviderUnavailableError(
          'alpha-vantage',
          'UNAVAILABLE',
        );
      },
    );

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    const result = await service.getQuote('AAPL');

    expect(result.data).toBeNull();
    expect(result.meta.dataStatus).toBe(
      'UNAVAILABLE',
    );
  });

  it('propagates unexpected provider errors', async () => {
    const unexpectedError = new Error(
      'unexpected provider failure',
    );

    const primary = createProvider(
      'twelve-data',
      async () => {
        throw unexpectedError;
      },
    );

    const secondary = createProvider(
      'alpha-vantage',
      async () => {
        return createQuote('alpha-vantage');
      },
    );

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    await expect(
      service.getQuote('AAPL'),
    ).rejects.toThrow(
      'unexpected provider failure',
    );
  });

  it('removes invalid candles and reports the rejection count', () => {
    const validCandle: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-08T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'test',
    };

    const invalidCandle: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-09T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 90,
      low: 95,
      close: 105,
      source: 'test',
    };

    const result = normalizeCandles(
      [validCandle, invalidCandle],
      new Date('2026-09-10T00:00:00.000Z'),
    );

    expect(result.candles).toHaveLength(1);
    expect(result.rejected).toBe(1);
    expect(result.duplicates).toBe(0);
  });

  it('normalizes timestamps to ISO UTC format', () => {
    const candle: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-08T05:30:00+05:30',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'test',
    };

    const result = normalizeCandles(
      [candle],
      new Date('2026-09-10T00:00:00.000Z'),
    );

    expect(result.candles[0]?.timestamp).toBe(
      '2026-09-08T00:00:00.000Z',
    );
  });

  it('sorts valid candles chronologically', () => {
    const newer: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-10T00:00:00.000Z',
      timeframe: '1d',
      open: 110,
      high: 120,
      low: 105,
      close: 115,
      source: 'test',
    };

    const older: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-08T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'test',
    };

    const middle: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-09T00:00:00.000Z',
      timeframe: '1d',
      open: 105,
      high: 115,
      low: 100,
      close: 110,
      source: 'test',
    };

    const result = normalizeCandles(
      [newer, older, middle],
      new Date('2026-09-11T00:00:00.000Z'),
    );

    expect(
      result.candles.map(
        (candle) => candle.timestamp,
      ),
    ).toEqual([
      '2026-09-08T00:00:00.000Z',
      '2026-09-09T00:00:00.000Z',
      '2026-09-10T00:00:00.000Z',
    ]);
  });

  it('removes duplicate candles', () => {
    const candle: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-08T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'test',
    };

    const duplicate = { ...candle };

    const result = normalizeCandles(
      [candle, duplicate],
      new Date('2026-09-10T00:00:00.000Z'),
    );

    expect(result.candles).toHaveLength(1);
    expect(result.rejected).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('preserves distinct candles with the same timestamp from different sources', () => {
    const first: MarketCandle = {
      assetId: 'a',
      timestamp: '2026-09-08T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'twelve-data',
    };

    const second: MarketCandle = {
      ...first,
      close: 106,
      source: 'alpha-vantage',
    };

    const result = normalizeCandles(
      [first, second],
      new Date('2026-09-10T00:00:00.000Z'),
    );

    expect(result.candles).toHaveLength(2);
    expect(result.rejected).toBe(0);
    expect(result.duplicates).toBe(0);
  });

  it('normalizes historical data through the service boundary', async () => {
    const newer: MarketCandle = {
      assetId: 'test',
      timestamp: '2026-09-09T00:00:00.000Z',
      timeframe: '1d',
      open: 110,
      high: 120,
      low: 105,
      close: 115,
      source: 'twelve-data',
    };

    const older: MarketCandle = {
      assetId: 'test',
      timestamp: '2026-09-08T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 110,
      low: 95,
      close: 105,
      source: 'twelve-data',
    };

    const duplicate: MarketCandle = {
      ...older,
    };

    const invalid: MarketCandle = {
      assetId: 'test',
      timestamp: '2026-09-10T00:00:00.000Z',
      timeframe: '1d',
      open: 100,
      high: 90,
      low: 95,
      close: 105,
      source: 'twelve-data',
    };

    const provider = createProvider(
      'twelve-data',
      async () => createQuote('twelve-data'),
      async () => [
        newer,
        duplicate,
        invalid,
        older,
      ],
    );

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', provider],
      ]),
      cache: noCache,
    });

    const result = await service.getHistory(
      'AAPL',
      '1d',
      new Date('2026-09-08T00:00:00.000Z'),
      new Date('2026-09-10T00:00:00.000Z'),
    );

    expect(result.data).toHaveLength(2);

    expect(
      result.data.map(
        (candle) => candle.timestamp,
      ),
    ).toEqual([
      '2026-09-08T00:00:00.000Z',
      '2026-09-09T00:00:00.000Z',
    ]);

    expect(result.meta.source).toBe(
      'twelve-data',
    );

    expect(result.meta.rejected).toBe(2);
  });
});