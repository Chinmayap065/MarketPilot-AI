'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Asset } from '@marketpilot/types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function MarketExplorer() {
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/assets/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('search failed');
        const body = await response.json() as { data: Asset[] };
        setAssets(body.data);
        setState('ready');
      } catch {
        setAssets([]);
        setState('error');
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return <div className="market-explorer"><div className="market-toolbar"><label htmlFor="market-universe-search">Search the canonical asset registry</label><input id="market-universe-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="BTC, EUR/USD, Reliance, NIFTY" /></div><div className="market-filter-row">{['All assets', 'EQUITY', 'INDEX', 'FOREX', 'CRYPTO', 'COMMODITY', 'ETF'].map((filter) => <button className="filter-chip" key={filter}>{filter}</button>)}</div>{state === 'loading' && <p className="market-state">Loading registry...</p>}{state === 'error' && <p className="market-state error-text">Unable to connect to MarketPilot API.</p>}{state === 'ready' && assets.length === 0 && <p className="market-state">No canonical assets match this search.</p>}<div className="asset-results">{assets.map((asset) => <Link className="asset-result" href={`/markets/${encodeURIComponent(asset.symbol)}`} key={asset.id}><div><strong>{asset.symbol}</strong><span>{asset.name}</span></div><div className="asset-result-meta"><span>{asset.assetClass}</span><span>{asset.exchange ?? 'Global'}</span><span>{asset.currency}</span></div></Link>)}</div></div>;
}
