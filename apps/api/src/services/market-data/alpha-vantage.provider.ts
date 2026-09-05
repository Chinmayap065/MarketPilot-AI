import type { Asset, MarketCandle, MarketQuote, MarketStatus, ProviderCapabilities, Timeframe } from '@marketpilot/types';
import { env } from '../../config/env.js';
import { ProviderUnavailableError, type HistoricalQuery, type MarketDataProvider } from './provider.js';

export class AlphaVantageProvider implements MarketDataProvider {
  readonly capabilities: ProviderCapabilities = { provider: 'alpha-vantage', assetClasses: ['EQUITY', 'INDEX', 'FOREX', 'CRYPTO', 'COMMODITY', 'ETF'], supportsHistorical: true, supportsIntraday: false, supportsStreaming: false, supportedTimeframes: ['1d', '1w'] };

  private async request(params: Record<string, string>): Promise<Record<string, unknown>> {
    if (!env.alphaVantageApiKey) throw new ProviderUnavailableError('alpha-vantage', 'NOT_CONFIGURED');
    const url = new URL('https://www.alphavantage.co/query');
    Object.entries({ ...params, apikey: env.alphaVantageApiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new ProviderUnavailableError('alpha-vantage', 'UNAVAILABLE');
    const body = await response.json() as Record<string, unknown>;
    if (body.Note || body.Information || body['Error Message']) throw new ProviderUnavailableError('alpha-vantage', 'UNAVAILABLE');
    return body;
  }

  async getQuote(asset: Asset): Promise<MarketQuote> {
    const body = await this.request({ function: 'GLOBAL_QUOTE', symbol: asset.providerSymbol ?? asset.symbol });
    const quote = (body['Global Quote'] ?? {}) as Record<string, string>;
    const number = (key: string): number | null => quote[key] === undefined ? null : Number(quote[key]);
    return { assetId: asset.id, symbol: asset.symbol, price: number('05. price'), open: number('02. open'), high: number('03. high'), low: number('04. low'), previousClose: number('08. previous close'), volume: number('06. volume'), change: number('09. change'), changePercent: quote['10. change percent'] ? Number(quote['10. change percent'].replace('%', '')) : null, timestamp: quote['07. latest trading day'] ? new Date(`${quote['07. latest trading day']}T00:00:00Z`).toISOString() : new Date().toISOString(), currency: asset.currency, source: 'alpha-vantage', dataStatus: 'DELAYED' };
  }

  async getHistoricalData(_query: HistoricalQuery): Promise<MarketCandle[]> { throw new ProviderUnavailableError('alpha-vantage', 'UNSUPPORTED'); }
  async searchAssets(_query: string): Promise<Asset[]> { return []; }
  async getMarketStatus(_asset: Asset): Promise<MarketStatus> { return { session: 'UNKNOWN', dataStatus: 'DELAYED', timestamp: null, source: 'alpha-vantage' }; }
}
