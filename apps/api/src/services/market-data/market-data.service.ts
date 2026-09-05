import type { Asset, DataStatus, MarketCandle, MarketQuote, MarketStatus, Timeframe } from '@marketpilot/types';
import { ProviderUnavailableError, type MarketDataProvider } from './provider.js';
import { AssetRegistry } from './registry.js';
import { UnavailableMarketDataProvider } from './unavailable.provider.js';
import { TwelveDataProvider } from './twelve-data.provider.js';
import { AlphaVantageProvider } from './alpha-vantage.provider.js';
import { validateCandle } from './validation.js';
import { MarketDataCache } from './cache.service.js';

export class MarketDataService {
  private readonly registry = new AssetRegistry();
  private readonly cache = new MarketDataCache();
  private readonly provider: MarketDataProvider;
  private readonly providers: Map<string, MarketDataProvider>;
  private readonly injectedProvider: boolean;

  constructor(provider?: MarketDataProvider) { this.injectedProvider = Boolean(provider); this.provider = provider ?? new UnavailableMarketDataProvider(); this.providers = new Map<string, MarketDataProvider>([['twelve-data', new TwelveDataProvider()], ['alpha-vantage', new AlphaVantageProvider()]]); }

  private providerFor(asset: Asset): MarketDataProvider { return this.injectedProvider ? this.provider : this.providers.get(asset.dataProvider ?? '') ?? this.provider; }

  findAsset(symbol: string): Asset | undefined { return this.registry.find(symbol); }
  searchAssets(query: string): Asset[] { return this.registry.search(query); }

  async getQuote(symbol: string): Promise<{ data: MarketQuote | null; meta: { source: string | null; cached: boolean; dataStatus: DataStatus } }> {
    const asset = this.registry.find(symbol);
    if (!asset) return { data: null, meta: { source: null, cached: false, dataStatus: 'UNAVAILABLE' } };
    const cached = await this.cache.getQuote(asset.symbol);
    if (cached) return { data: cached.dataStatus === 'LIVE' ? { ...cached, dataStatus: 'STALE' } : cached, meta: { source: cached.source, cached: true, dataStatus: cached.dataStatus === 'LIVE' ? 'STALE' : cached.dataStatus } };
    try { const quote = await this.providerFor(asset).getQuote(asset); await this.cache.setQuote(asset.symbol, quote); return { data: quote, meta: { source: quote.source, cached: false, dataStatus: quote.dataStatus } }; }
    catch (error) { if (error instanceof ProviderUnavailableError) return { data: null, meta: { source: error.provider, cached: false, dataStatus: error.reason === 'NOT_CONFIGURED' ? 'UNAVAILABLE' : 'STALE' } }; throw error; }
  }

  async getHistory(symbol: string, timeframe: Timeframe, start: Date, end: Date): Promise<{ data: MarketCandle[]; meta: { source: string | null; dataStatus: DataStatus; rejected: number } }> {
    const asset = this.registry.find(symbol);
    if (!asset) return { data: [], meta: { source: null, dataStatus: 'UNAVAILABLE', rejected: 0 } };
    try { const candles = await this.providerFor(asset).getHistoricalData({ asset, timeframe, start, end }); const accepted = candles.filter((candle) => validateCandle(candle).length === 0); return { data: accepted, meta: { source: asset.dataProvider ?? null, dataStatus: 'LIVE', rejected: candles.length - accepted.length } }; }
    catch (error) { if (error instanceof ProviderUnavailableError) return { data: [], meta: { source: error.provider, dataStatus: 'UNAVAILABLE', rejected: 0 } }; throw error; }
  }

  async getMarketStatus(symbol: string): Promise<MarketStatus> { const asset = this.registry.find(symbol); if (!asset) return { session: 'UNKNOWN', dataStatus: 'UNAVAILABLE', timestamp: null, source: null }; try { return await this.providerFor(asset).getMarketStatus(asset); } catch { return { session: 'UNKNOWN', dataStatus: 'UNAVAILABLE', timestamp: null, source: null }; } }
}
