import type { Asset, MarketCandle, MarketQuote, MarketStatus, ProviderCapabilities, Timeframe } from '@marketpilot/types';
import { env } from '../../config/env.js';
import { ProviderUnavailableError, type HistoricalQuery, type MarketDataProvider } from './provider.js';

const intervals: Record<Timeframe, string> = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week' };

export class TwelveDataProvider implements MarketDataProvider {
  readonly capabilities: ProviderCapabilities = {
    provider: 'twelve-data', assetClasses: ['EQUITY', 'INDEX', 'FOREX', 'CRYPTO', 'COMMODITY', 'ETF'], supportsHistorical: true, supportsIntraday: true, supportsStreaming: true, supportedTimeframes: Object.keys(intervals) as Timeframe[],
  };

  private async request(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    if (!env.marketDataApiKey) throw new ProviderUnavailableError('twelve-data', 'NOT_CONFIGURED');
    const url = new URL(path, env.marketDataBaseUrl);
    Object.entries({ ...params, apikey: env.marketDataApiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new ProviderUnavailableError('twelve-data', 'UNAVAILABLE');
    const body = await response.json() as Record<string, unknown>;
    if (body.status === 'error') throw new ProviderUnavailableError('twelve-data', 'UNAVAILABLE');
    return body;
  }

  async getQuote(asset: Asset): Promise<MarketQuote> {
    const body = await this.request('/quote', { symbol: asset.providerSymbol ?? asset.symbol });
    const numeric = (key: string): number | null => body[key] === undefined || body[key] === null ? null : Number(body[key]);
    const timestamp = body.timestamp ? new Date(Number(body.timestamp) * 1000).toISOString() : new Date().toISOString();
    return { assetId: asset.id, symbol: asset.symbol, price: numeric('close'), open: numeric('open'), high: numeric('high'), low: numeric('low'), previousClose: numeric('previous_close'), volume: numeric('volume'), change: numeric('change'), changePercent: numeric('percent_change'), bid: numeric('bid'), ask: numeric('ask'), timestamp, currency: asset.currency, source: 'twelve-data', dataStatus: body.is_market_open === false ? 'DELAYED' : 'LIVE' };
  }

  async getHistoricalData(query: HistoricalQuery): Promise<MarketCandle[]> {
    const body = await this.request('/time_series', { symbol: query.asset.providerSymbol ?? query.asset.symbol, interval: intervals[query.timeframe], start_date: query.start.toISOString(), end_date: query.end.toISOString(), outputsize: '5000' });
    const values = Array.isArray(body.values) ? body.values : [];
    return values.map((row) => { const item = row as Record<string, string>; return { assetId: query.asset.id, symbol: query.asset.symbol, timeframe: query.timeframe, timestamp: new Date(item.datetime).toISOString(), open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: item.volume === undefined ? undefined : Number(item.volume), source: 'twelve-data', ingestedAt: new Date().toISOString() }; });
  }

  async searchAssets(query: string): Promise<Asset[]> {
    const body = await this.request('/symbol_search', { symbol: query });
    void body;
    return [];
  }

  async getMarketStatus(asset: Asset): Promise<MarketStatus> {
    const body = await this.request('/market_state', { exchange: asset.exchange ?? '' });
    const state = String(body.market_state ?? '').toUpperCase();
    return { session: state === 'OPEN' ? 'OPEN' : state === 'CLOSED' ? 'CLOSED' : 'UNKNOWN', dataStatus: 'LIVE', timestamp: new Date().toISOString(), source: 'twelve-data' };
  }
}
