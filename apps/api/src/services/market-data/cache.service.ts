import Redis from 'ioredis';
import type { MarketQuote } from '@marketpilot/types';
import { env } from '../../config/env.js';

export class MarketDataCache {
  private readonly redis = env.redisUrl ? new Redis(env.redisUrl, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0 }) : null;

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    if (!this.redis) return null;
    try { await this.redis.connect().catch(() => undefined); const raw = await this.redis.get(`market:quote:${symbol}`); return raw ? JSON.parse(raw) as MarketQuote : null; } catch { return null; }
  }

  async setQuote(symbol: string, quote: MarketQuote, ttlSeconds = 30): Promise<void> {
    if (!this.redis) return;
    try { await this.redis.connect().catch(() => undefined); await this.redis.set(`market:quote:${symbol}`, JSON.stringify(quote), 'EX', ttlSeconds); } catch { /* cache failure must not fabricate or fail market data */ }
  }
}
