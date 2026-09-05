import type { Asset, MarketCandle, MarketQuote, MarketStatus, ProviderCapabilities, Timeframe } from '@marketpilot/types';

export interface HistoricalQuery {
  asset: Asset;
  timeframe: Timeframe;
  start: Date;
  end: Date;
}

export interface MarketDataProvider {
  readonly capabilities: ProviderCapabilities;
  getQuote(asset: Asset): Promise<MarketQuote>;
  getHistoricalData(query: HistoricalQuery): Promise<MarketCandle[]>;
  searchAssets(query: string): Promise<Asset[]>;
  getMarketStatus(asset: Asset): Promise<MarketStatus>;
}

export class ProviderUnavailableError extends Error {
  constructor(public readonly provider: string, public readonly reason: 'NOT_CONFIGURED' | 'UNSUPPORTED' | 'UNAVAILABLE') {
    super(`${provider}:${reason}`);
    this.name = 'ProviderUnavailableError';
  }
}
