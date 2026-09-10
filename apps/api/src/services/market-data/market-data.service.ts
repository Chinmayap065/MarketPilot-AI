import type {
  Asset,
  DataStatus,
  MarketCandle,
  MarketQuote,
  MarketStatus,
  Timeframe,
} from '@marketpilot/types';

import { env } from '../../config/env.js';

import {
  ProviderUnavailableError,
  type MarketDataProvider,
} from './provider.js';

import { AssetRegistry } from './registry.js';
import { UnavailableMarketDataProvider } from './unavailable.provider.js';
import { TwelveDataProvider } from './twelve-data.provider.js';
import { AlphaVantageProvider } from './alpha-vantage.provider.js';

import {
  normalizeCandles,
} from './validation.js';

import { MarketDataCache } from './cache.service.js';

type MarketDataCachePort = Pick<
  MarketDataCache,
  'getQuote' | 'setQuote'
>;

interface MarketDataServiceDependencies {
  providers?: Map<string, MarketDataProvider>;
  cache?: MarketDataCachePort;
}

export class MarketDataService {
  private readonly registry = new AssetRegistry();
  private readonly cache: MarketDataCachePort;
  private readonly providers: Map<
    string,
    MarketDataProvider
  >;

  constructor(
    dependencies: MarketDataServiceDependencies = {},
  ) {
    this.cache =
      dependencies.cache ?? new MarketDataCache();

    this.providers =
      dependencies.providers ??
      new Map<string, MarketDataProvider>([
        [
          'twelve-data',
          new TwelveDataProvider(),
        ],
        [
          'alpha-vantage',
          new AlphaVantageProvider(),
        ],
      ]);
  }

  private providerCandidates(
    asset: Asset,
  ): MarketDataProvider[] {
    const providerNames = [
      asset.dataProvider,
      env.marketDataPrimaryProvider,
      env.marketDataSecondaryProvider,
    ].filter(
      (name): name is string => Boolean(name),
    );

    const uniqueNames = [...new Set(providerNames)];

    return uniqueNames
      .map((name) => this.providers.get(name))
      .filter(
        (
          provider,
        ): provider is MarketDataProvider =>
          provider !== undefined,
      );
  }

  private supportsAsset(
    provider: MarketDataProvider,
    asset: Asset,
  ): boolean {
    return provider.capabilities.assetClasses.includes(
      asset.assetClass,
    );
  }

  findAsset(
    symbol: string,
  ): Asset | undefined {
    return this.registry.find(symbol);
  }

  searchAssets(
    query: string,
  ): Asset[] {
    return this.registry.search(query);
  }

  async getQuote(
    symbol: string,
  ): Promise<{
    data: MarketQuote | null;
    meta: {
      source: string | null;
      cached: boolean;
      dataStatus: DataStatus;
    };
  }> {
    const asset = this.registry.find(symbol);

    if (!asset) {
      return {
        data: null,
        meta: {
          source: null,
          cached: false,
          dataStatus: 'UNAVAILABLE',
        },
      };
    }

    const cached =
      await this.cache.getQuote(
        asset.symbol,
      );

    if (cached) {
      return {
        data:
          cached.dataStatus === 'LIVE'
            ? {
                ...cached,
                dataStatus: 'STALE',
              }
            : cached,
        meta: {
          source: cached.source,
          cached: true,
          dataStatus:
            cached.dataStatus === 'LIVE'
              ? 'STALE'
              : cached.dataStatus,
        },
      };
    }

    const providers =
      this.providerCandidates(asset);

    for (const provider of providers) {
      if (
        !this.supportsAsset(
          provider,
          asset,
        )
      ) {
        continue;
      }

      try {
        const quote =
          await provider.getQuote(
            asset,
          );

        await this.cache.setQuote(
          asset.symbol,
          quote,
        );

        return {
          data: quote,
          meta: {
            source: quote.source,
            cached: false,
            dataStatus:
              quote.dataStatus,
          },
        };
      } catch (error) {
        if (
          error instanceof
          ProviderUnavailableError
        ) {
          continue;
        }

        throw error;
      }
    }

    return {
      data: null,
      meta: {
        source: null,
        cached: false,
        dataStatus: 'UNAVAILABLE',
      },
    };
  }

  async getHistory(
    symbol: string,
    timeframe: Timeframe,
    start: Date,
    end: Date,
  ): Promise<{
    data: MarketCandle[];
    meta: {
      source: string | null;
      dataStatus: DataStatus;
      rejected: number;
    };
  }> {
    const asset =
      this.registry.find(symbol);

    if (!asset) {
      return {
        data: [],
        meta: {
          source: null,
          dataStatus: 'UNAVAILABLE',
          rejected: 0,
        },
      };
    }

    const providers =
      this.providerCandidates(asset);

    for (const provider of providers) {
      if (
        !this.supportsAsset(
          provider,
          asset,
        )
      ) {
        continue;
      }

      try {
        const candles =
          await provider.getHistoricalData({
            asset,
            timeframe,
            start,
            end,
          });

        const normalized =
          normalizeCandles(candles);

        return {
          data: normalized.candles,
          meta: {
            source:
              provider.capabilities.provider,
            dataStatus: 'LIVE',
            rejected:
              normalized.rejected +
              normalized.duplicates,
          },
        };
      } catch (error) {
        if (
          error instanceof
          ProviderUnavailableError
        ) {
          continue;
        }

        throw error;
      }
    }

    return {
      data: [],
      meta: {
        source: null,
        dataStatus: 'UNAVAILABLE',
        rejected: 0,
      },
    };
  }

  async getMarketStatus(
    symbol: string,
  ): Promise<MarketStatus> {
    const asset =
      this.registry.find(symbol);

    if (!asset) {
      return {
        session: 'UNKNOWN',
        dataStatus: 'UNAVAILABLE',
        timestamp: null,
        source: null,
      };
    }

    const providers =
      this.providerCandidates(asset);

    for (const provider of providers) {
      if (
        !this.supportsAsset(
          provider,
          asset,
        )
      ) {
        continue;
      }

      try {
        return await provider.getMarketStatus(
          asset,
        );
      } catch (error) {
        if (
          error instanceof
          ProviderUnavailableError
        ) {
          continue;
        }

        throw error;
      }
    }

    return {
      session: 'UNKNOWN',
      dataStatus: 'UNAVAILABLE',
      timestamp: null,
      source: null,
    };
  }
}