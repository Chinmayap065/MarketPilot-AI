# Market Data Architecture

## Flow

Frontend -> Node API -> MarketDataService -> provider adapter -> external provider.

The frontend never knows provider symbols, provider JSON, credentials, or ML service details.

## Provider abstraction

`MarketDataProvider` owns quote, history, search, and market-status capabilities. Adapters normalize provider responses into shared `Asset`, `MarketQuote`, and `MarketCandle` contracts. `MarketDataService` selects the configured primary adapter and returns explicit unavailable states when no credential or compatible capability exists.

## Canonical symbols

The registry uses canonical symbols such as `RELIANCE`, `NIFTY50`, `AAPL`, `EUR/USD`, `USD/INR`, `BTC/USD`, `BTC/USDT`, `ETH/USD`, `XAU/USD`, `WTI`, and `BRENT`. Provider-specific symbols are stored only in `providerSymbol` mappings.

## Data model

Prices are TypeScript numbers at the API boundary and PostgreSQL `NUMERIC` in storage. This avoids binary floating-point storage for financial values while keeping the HTTP contract ergonomic. Historical candles retain source, provider, timeframe, timestamp, and ingestion timestamp.

## Timeframes

The canonical set is `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, and `1w`. Adapters advertise supported subsets; the service rejects unsupported timeframes rather than silently resampling.

## Validation and quality

Candle validation rejects missing or future timestamps, non-positive OHLC, invalid high/low relationships, and invalid volume. The data-quality service boundary is present for gap, duplicate, stale, and provider-consistency checks. Calendar-aware gap classification remains provider-specific and is not guessed.

## Market status and freshness

Session state (`OPEN`, `CLOSED`, `PRE_MARKET`, `AFTER_HOURS`, `UNKNOWN`) is separate from data state (`LIVE`, `DELAYED`, `STALE`, `UNAVAILABLE`). Unknown schedules remain `UNKNOWN`.

## Storage and cache

PostgreSQL/TimescaleDB stores assets and candles. Candle uniqueness is `(asset_id, timeframe, timestamp, source)`. Redis caches quote payloads with source and timestamp metadata; a cache response is never labeled `LIVE` merely because it came from Redis.

## Ingestion and reproducibility

The service contracts support bounded historical requests and ingestion statistics. CLI ingestion is intentionally deferred until provider credentials and persistence wiring are enabled; no data is fabricated locally.

## Corporate actions and currency

Adjusted versus unadjusted semantics remain provider metadata. Base and quote currencies are retained for FX and crypto pairs; equities and commodities preserve their source currency.

## Streaming

The adapter contract includes streaming capability metadata. No provider-specific WebSocket code is placed in React; the current implementation reports streaming capability and leaves runtime streaming for a later increment.
