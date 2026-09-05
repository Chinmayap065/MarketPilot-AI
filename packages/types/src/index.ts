export type AssetClass = 'EQUITY' | 'INDEX' | 'FOREX' | 'CRYPTO' | 'COMMODITY' | 'ETF';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
export type MarketSessionStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS' | 'UNKNOWN';
export type DataStatus = 'LIVE' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange?: string;
  currency: string;
  country?: string;
  timezone?: string;
  dataProvider?: string;
  providerSymbol?: string;
  baseAsset?: string;
  quoteAsset?: string;
  metadata?: Record<string, string>;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MarketCandle {
  assetId: string;
  timestamp: string;
  timeframe: Timeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number;
  volume?: number;
  source: string;
}

export interface ServiceHealth {
  service: string;
  status: 'ok';
  timestamp: string;
  version: string;
}

export interface MarketQuote {
  assetId: string;
  symbol?: string;
  timestamp: string;
  price: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  change?: number | null;
  changePercent?: number | null;
  bid?: number | null;
  ask?: number | null;
  currency: string;
  source: string;
  dataStatus: DataStatus;
}

export type OHLCV = MarketCandle;

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  affectedAssetIds: string[];
}

export interface AISignal {
  assetId: string;
  label: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'HOLD' | 'AVOID' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  timestamp: string;
  modelVersion: string;
}

export interface Portfolio {
  id: string;
  name: string;
  baseCurrency: string;
}

export interface Position {
  assetId: string;
  quantity: number;
  averagePrice: number;
}

export interface ModelPrediction {
  modelName: string;
  modelVersion: string;
  horizon: string;
  prediction: number;
  confidence: number;
  timestamp: string;
}

export interface RiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  rationale: string;
}

export interface ProviderCapabilities {
  provider: string;
  assetClasses: AssetClass[];
  supportsHistorical: boolean;
  supportsIntraday: boolean;
  supportsStreaming: boolean;
  supportedTimeframes: Timeframe[];
}

export interface MarketStatus {
  session: MarketSessionStatus;
  dataStatus: DataStatus;
  timestamp: string | null;
  source: string | null;
}
