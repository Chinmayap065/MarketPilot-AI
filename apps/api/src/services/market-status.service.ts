import { env } from '../config/env.js';

export interface MarketStatus {
  configured: boolean;
  provider: string | null;
  status: 'configured' | 'not_configured';
}

export class MarketStatusService {
  getStatus(): MarketStatus {
    const configured = Boolean(process.env.MARKET_DATA_API_KEY);
    return {
      configured,
      provider: configured ? 'configured-provider' : null,
      status: configured ? 'configured' : 'not_configured',
    };
  }

  getConfiguration(): { databaseConfigured: boolean; redisConfigured: boolean; mlServiceUrl: string } {
    return { databaseConfigured: Boolean(env.databaseUrl), redisConfigured: Boolean(env.redisUrl), mlServiceUrl: env.mlServiceUrl };
  }
}
