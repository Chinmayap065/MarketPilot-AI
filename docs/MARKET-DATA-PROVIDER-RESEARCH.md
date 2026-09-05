# Market Data Provider Research

Research date: 2026-09-05.

## Comparison

| Provider | India | US/global equities | Forex | Crypto | Commodities | Historical | Intraday | Streaming | Limits / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Twelve Data | Exchange coverage includes XNSE in catalog; entitlement varies | Broad global exchange catalog | Yes | Yes | Yes, including commodity coverage on paid tiers | Yes | Plan-dependent | WebSocket credits/plans | Basic plan is limited; pricing page lists 8 API credits/minute and 800/day, with broader markets and internal display rights on paid tiers |
| Alpha Vantage | Global equities examples include `RELIANCE.BSE`; NSE entitlement must be verified per symbol | Yes, 100,000+ symbols claimed in docs | Yes | Yes | Gold/silver, WTI, Brent, and other macro commodity series | Daily/weekly/monthly and 25+ years for equities | Intraday is premium; 1m/5m/15m/30m/60m documented | Not selected for streaming | Free key is limited to 25 requests/day; many intraday, index, and real-time endpoints are premium |
| CoinGecko | No | No | No | Strong crypto coverage | No | Up to 12 years of crypto chart history; OHLC/OHLCV endpoints | Yes, plan-dependent | WebSocket available on current docs | Crypto-only; API key and plan/rate-limit semantics apply |
| Exchange/broker APIs | India exchange/broker-specific | Usually venue-specific | Usually venue-specific | Usually venue-specific | Usually venue-specific | Depends on agreement | Depends on agreement | Often available | Licensing, authentication, and redistribution must be reviewed per vendor |

Sources: [Twelve Data pricing](https://twelvedata.com/pricing), [Alpha Vantage documentation](https://www.alphavantage.co/documentation/), [Alpha Vantage premium](https://www.alphavantage.co/premium/), [CoinGecko API](https://www.coingecko.com/en/api), [CoinGecko docs](https://docs.coingecko.com/).

## Selection

**Primary provider: Twelve Data.** It has the broadest single-provider shape for the requested asset classes, exchange metadata, normalized time-series endpoints, and WebSocket support. The adapter is implemented server-side and is `NOT_CONFIGURED` until `MARKET_DATA_API_KEY` is set.

**Secondary provider: Alpha Vantage.** It is retained as an explicit secondary adapter path for global equities, indices, FX/crypto, commodities, adjusted equity series, and corporate-action metadata. Its free tier is not sufficient for production ingestion, and real-time/index/intraday coverage may require paid entitlements.

**Crypto specialization: CoinGecko is a future optional adapter.** CoinGecko is a strong crypto-only source, but it is not wired as a third runtime provider in this slice. The provider interface permits adding it without changing the API or frontend.

## Important limitations

- No credentials are committed or required for local startup.
- A provider key does not imply redistribution rights. Commercial/display licensing must be reviewed before production use.
- Provider symbol formats remain inside adapters and registry mappings.
- The application returns `UNAVAILABLE` or `NOT_CONFIGURED`; it never substitutes fake quotes or candles.
- Real provider coverage is not claimed for an instrument until the provider adapter successfully resolves it.
