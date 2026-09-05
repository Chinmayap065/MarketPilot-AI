CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  exchange TEXT,
  currency TEXT NOT NULL,
  country TEXT,
  timezone TEXT,
  data_provider TEXT,
  provider_symbol TEXT,
  base_asset TEXT,
  quote_asset TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS assets_symbol_idx ON assets (symbol);
CREATE INDEX IF NOT EXISTS assets_asset_class_idx ON assets (asset_class);
CREATE INDEX IF NOT EXISTS assets_provider_symbol_idx ON assets (data_provider, provider_symbol);

CREATE TABLE IF NOT EXISTS market_candles (
  asset_id UUID NOT NULL REFERENCES assets(id),
  timestamp TIMESTAMPTZ NOT NULL,
  timeframe TEXT NOT NULL,
  open NUMERIC(30, 12) NOT NULL,
  high NUMERIC(30, 12) NOT NULL,
  low NUMERIC(30, 12) NOT NULL,
  close NUMERIC(30, 12) NOT NULL,
  volume NUMERIC(30, 12),
  source TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  adjustment_status TEXT,
  PRIMARY KEY (asset_id, timestamp, timeframe, source)
);

SELECT create_hypertable('market_candles', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS market_candles_asset_time_idx ON market_candles (asset_id, timeframe, timestamp DESC);
