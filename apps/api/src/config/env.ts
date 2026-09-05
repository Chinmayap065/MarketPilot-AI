import 'dotenv/config';

export const env = {
  apiPort: Number(process.env.API_PORT ?? 4000),
  mlServiceUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8000',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  marketDataPrimaryProvider: process.env.MARKET_DATA_PRIMARY_PROVIDER ?? 'twelve-data',
  marketDataSecondaryProvider: process.env.MARKET_DATA_SECONDARY_PROVIDER ?? 'alpha-vantage',
  marketDataApiKey: process.env.MARKET_DATA_API_KEY,
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? process.env.MARKET_DATA_API_KEY,
  marketDataBaseUrl: process.env.MARKET_DATA_BASE_URL ?? 'https://api.twelvedata.com',
};
