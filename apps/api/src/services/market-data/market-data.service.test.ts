import { describe, expect, it } from 'vitest';
import type { Asset, MarketCandle } from '@marketpilot/types';
import { MarketDataService } from './market-data.service.js';
import { validateCandle, validateDateRange } from './validation.js';

const asset: Asset = { id: 'test', symbol: 'TEST', name: 'Test', assetClass: 'EQUITY', currency: 'USD' };

class TestProvider {
  capabilities = { provider: 'test', assetClasses: ['EQUITY'] as const, supportsHistorical: true, supportsIntraday: true, supportsStreaming: false, supportedTimeframes: ['1d'] as const };
  async getQuote() { return { assetId: asset.id, symbol: asset.symbol, price: 10, currency: 'USD', source: 'test', timestamp: new Date().toISOString(), dataStatus: 'LIVE' as const }; }
  async getHistoricalData() { return []; }
  async searchAssets() { return []; }
  async getMarketStatus() { return { session: 'UNKNOWN' as const, dataStatus: 'LIVE' as const, timestamp: new Date().toISOString(), source: 'test' }; }
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
    const candle: MarketCandle = { assetId: 'a', timestamp: new Date().toISOString(), timeframe: '1d', open: 10, high: 8, low: 9, close: 10, source: 'test' };
    expect(validateCandle(candle)).toContain('invalid_high');
  });

  it('bounds historical date ranges', () => {
    expect(() => validateDateRange('2020-01-01', '2022-01-01')).toThrow('date_range_too_large');
  });

  it('can normalize a configured provider through the service boundary', async () => {
    const service = new MarketDataService(new TestProvider() as never);
    const result = await service.getQuote('AAPL');
    expect(result.data?.source).toBe('test');
  });
});
