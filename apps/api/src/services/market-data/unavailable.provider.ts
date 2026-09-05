import type { Asset, DataStatus, MarketCandle, MarketQuote, MarketStatus, ProviderCapabilities } from '@marketpilot/types';
import { ProviderUnavailableError, type HistoricalQuery, type MarketDataProvider } from './provider.js';

export class UnavailableMarketDataProvider implements MarketDataProvider {
  readonly capabilities: ProviderCapabilities = {
    provider: 'unconfigured',
    assetClasses: ['EQUITY', 'INDEX', 'FOREX', 'CRYPTO', 'COMMODITY', 'ETF'],
    supportsHistorical: false,
    supportsIntraday: false,
    supportsStreaming: false,
    supportedTimeframes: [],
  };

  async getQuote(_asset: Asset): Promise<MarketQuote> { throw new ProviderUnavailableError('unconfigured', 'NOT_CONFIGURED'); }
  async getHistoricalData(_query: HistoricalQuery): Promise<MarketCandle[]> { throw new ProviderUnavailableError('unconfigured', 'NOT_CONFIGURED'); }
  async searchAssets(_query: string): Promise<Asset[]> { return []; }
  async getMarketStatus(_asset: Asset): Promise<MarketStatus> { return { session: 'UNKNOWN', dataStatus: 'UNAVAILABLE' as DataStatus, timestamp: null, source: null }; }
}
