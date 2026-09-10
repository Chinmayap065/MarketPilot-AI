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
import { validateCandle, validateDateRange } from './validation.js';

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

    async getHistoricalData() {
      return [];
    },

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

    expect(service.searchAssets('BTC/USD')[0]?.assetClass).toBe('CRYPTO');
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

    expect(validateCandle(candle)).toContain('invalid_high');
  });

  it('bounds historical date ranges', () => {
    expect(() =>
      validateDateRange('2020-01-01', '2022-01-01'),
    ).toThrow('date_range_too_large');
  });

  it('uses the primary provider when it succeeds', async () => {
    let primaryCalls = 0;
    let secondaryCalls = 0;

    const primary = createProvider('twelve-data', async () => {
      primaryCalls += 1;
      return createQuote('twelve-data');
    });

    const secondary = createProvider('alpha-vantage', async () => {
      secondaryCalls += 1;
      return createQuote('alpha-vantage');
    });

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

    const primary = createProvider('twelve-data', async () => {
      primaryCalls += 1;

      throw new ProviderUnavailableError(
        'twelve-data',
        'UNAVAILABLE',
      );
    });

    const secondary = createProvider('alpha-vantage', async () => {
      secondaryCalls += 1;
      return createQuote('alpha-vantage');
    });

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
    const primary = createProvider('twelve-data', async () => {
      throw new ProviderUnavailableError(
        'twelve-data',
        'UNAVAILABLE',
      );
    });

    const secondary = createProvider('alpha-vantage', async () => {
      throw new ProviderUnavailableError(
        'alpha-vantage',
        'UNAVAILABLE',
      );
    });

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    const result = await service.getQuote('AAPL');

    expect(result.data).toBeNull();
    expect(result.meta.dataStatus).toBe('UNAVAILABLE');
  });

  it('propagates unexpected provider errors', async () => {
    const unexpectedError = new Error('unexpected provider failure');

    const primary = createProvider('twelve-data', async () => {
      throw unexpectedError;
    });

    const secondary = createProvider('alpha-vantage', async () => {
      return createQuote('alpha-vantage');
    });

    const service = new MarketDataService({
      providers: new Map([
        ['twelve-data', primary],
        ['alpha-vantage', secondary],
      ]),
      cache: noCache,
    });

    await expect(service.getQuote('AAPL')).rejects.toThrow(
      'unexpected provider failure',
    );
  });
});