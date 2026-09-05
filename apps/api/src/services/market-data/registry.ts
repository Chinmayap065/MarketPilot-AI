import type { Asset, AssetClass } from '@marketpilot/types';

const registry: Asset[] = [
  { id: 'reliance', symbol: 'RELIANCE', name: 'Reliance Industries', assetClass: 'EQUITY', exchange: 'NSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata', active: true, dataProvider: 'twelve-data', providerSymbol: 'RELIANCE:NSE' },
  { id: 'nifty50', symbol: 'NIFTY50', name: 'NIFTY 50', assetClass: 'INDEX', exchange: 'NSE', country: 'IN', currency: 'INR', timezone: 'Asia/Kolkata', active: true, dataProvider: 'twelve-data', providerSymbol: 'NIFTY:NSE' },
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'EQUITY', exchange: 'NASDAQ', country: 'US', currency: 'USD', timezone: 'America/New_York', active: true, dataProvider: 'twelve-data', providerSymbol: 'AAPL' },
  { id: 'sp500', symbol: 'SPX', name: 'S&P 500', assetClass: 'INDEX', exchange: 'CBOE', country: 'US', currency: 'USD', timezone: 'America/New_York', active: true, dataProvider: 'alpha-vantage', providerSymbol: 'SPX' },
  { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', assetClass: 'FOREX', country: 'GLOBAL', currency: 'USD', timezone: 'UTC', active: true, dataProvider: 'twelve-data', providerSymbol: 'EUR/USD', baseAsset: 'EUR', quoteAsset: 'USD' },
  { id: 'usdinr', symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', assetClass: 'FOREX', country: 'GLOBAL', currency: 'INR', timezone: 'UTC', active: true, dataProvider: 'twelve-data', providerSymbol: 'USD/INR', baseAsset: 'USD', quoteAsset: 'INR' },
  { id: 'btcusd', symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', assetClass: 'CRYPTO', country: 'GLOBAL', currency: 'USD', timezone: 'UTC', active: true, dataProvider: 'twelve-data', providerSymbol: 'BTC/USD', baseAsset: 'BTC', quoteAsset: 'USD' },
  { id: 'btcusdt', symbol: 'BTC/USDT', name: 'Bitcoin / Tether', assetClass: 'CRYPTO', country: 'GLOBAL', currency: 'USDT', timezone: 'UTC', active: true, dataProvider: 'twelve-data', providerSymbol: 'BTC/USDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
  { id: 'ethusd', symbol: 'ETH/USD', name: 'Ether / US Dollar', assetClass: 'CRYPTO', country: 'GLOBAL', currency: 'USD', timezone: 'UTC', active: true, dataProvider: 'twelve-data', providerSymbol: 'ETH/USD', baseAsset: 'ETH', quoteAsset: 'USD' },
  { id: 'xauusd', symbol: 'XAU/USD', name: 'Gold / US Dollar', assetClass: 'COMMODITY', country: 'GLOBAL', currency: 'USD', timezone: 'UTC', active: true, dataProvider: 'alpha-vantage', providerSymbol: 'XAU/USD', baseAsset: 'XAU', quoteAsset: 'USD' },
  { id: 'wti', symbol: 'WTI', name: 'West Texas Intermediate', assetClass: 'COMMODITY', country: 'US', currency: 'USD', timezone: 'America/New_York', active: true, dataProvider: 'alpha-vantage', providerSymbol: 'WTI' },
  { id: 'qqq', symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'ETF', exchange: 'NASDAQ', country: 'US', currency: 'USD', timezone: 'America/New_York', active: true, dataProvider: 'twelve-data', providerSymbol: 'QQQ' },
];

export class AssetRegistry {
  find(symbol: string): Asset | undefined {
    const normalized = symbol.trim().toUpperCase();
    return registry.find((asset) => asset.symbol === normalized);
  }

  search(query: string): Asset[] {
    const normalized = query.trim().toUpperCase();
    if (!normalized) return registry;
    return registry.filter((asset) => [asset.symbol, asset.name, asset.exchange, asset.assetClass].some((value) => value?.toUpperCase().includes(normalized)));
  }

  byClass(assetClass: AssetClass): Asset[] {
    return registry.filter((asset) => asset.assetClass === assetClass);
  }
}
