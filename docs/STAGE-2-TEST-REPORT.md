# MarketPilot AI - Stage 2 Test Report

## Provider Research

Research completed for Twelve Data, Alpha Vantage, CoinGecko, and venue/broker APIs. Details: [MARKET-DATA-PROVIDER-RESEARCH.md](MARKET-DATA-PROVIDER-RESEARCH.md).

## Selected Providers

Primary: Twelve Data. Secondary: Alpha Vantage. Both are server-side adapters and are `NOT_CONFIGURED` without credentials.

## Asset Coverage

Canonical registry covers Indian equity/index examples, US equity, global index examples, FX, crypto, commodities, and ETF-compatible asset class metadata. Provider support is capability-driven and never assumed.

## Historical Data Tests

PASS for validation and unavailable-state behavior. NOT_CONFIGURED for live provider ingestion because no API credential is configured.

## Quote Tests

PASS for normalized unavailable responses. NOT_CONFIGURED for live quotes.

## Database Tests

Stage 1 PostgreSQL/TimescaleDB tests remain PASS. Stage 2 candle persistence is schema-ready but live ingestion is NOT_CONFIGURED.

## Redis Tests

Stage 1 Redis tests remain PASS. Quote caching is capability-wired and preserves source/timestamp metadata.

## Data Validation Tests

PASS for candle invariants and bounded timeframe/date validation.

## Data Quality Tests

Foundation boundary implemented; provider-backed gap and freshness checks require real series and calendar data.

## Market Calendar Tests

UNKNOWN unless a provider/calendar capability is configured. No universal 24/7 assumption is made.

## Failure/Recovery Tests

Stage 1 dependency recovery remains PASS. Provider and cache failure paths return explicit unavailable/degraded states.

## Frontend Tests

Markets route and data-status UI are implemented without fabricated values.

## Security Tests

PASS baseline: credentials remain server-side and environment-driven.

## Performance Tests

Bounded history validation and Redis cache path are implemented. Provider latency/load tests are NOT_CONFIGURED.

## ML Readiness

PASS: canonical symbol, source, provider, timestamp, timeframe, OHLCV, and ingestion metadata are represented. No features, labels, models, or predictions were added.

## Bugs Found

- Stage 1 had no provider-independent market-data contract.
- Asset search returned a permanently typed empty result.
- Timeframe and data-status types were incomplete for Stage 2.

## Bugs Fixed

- Added provider interfaces, canonical registry, normalized market models, validation boundary, capability metadata, and explicit unavailable states.
- Added provider research and architecture documentation.

## Known Limitations

No external provider credentials are configured, so live quotes, live candles, and real provider integration are `NOT_CONFIGURED`. No market-data persistence migration or ingestion CLI is enabled in this increment.

## Provider Limitations

Twelve Data and Alpha Vantage coverage, rate limits, entitlements, and redistribution rights vary by plan and instrument. The system does not claim support until a provider response is validated.

## Final Status

NOT READY FOR STAGE 3

Stage 2 architecture and no-fabrication foundation are implemented, but provider-backed quote/history ingestion, database candle writes, cache integration tests, and market pages require the configured provider credentials and the next implementation increment.
