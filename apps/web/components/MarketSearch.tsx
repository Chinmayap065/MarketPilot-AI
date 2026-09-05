'use client';

import { useState } from 'react';

interface AssetSearchResult { data: Array<{ id: string; symbol: string; name: string }>; count: number; }
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function MarketSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AssetSearchResult | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState('loading');
    try { const response = await fetch(`${apiUrl}/api/v1/assets/search?q=${encodeURIComponent(query)}`); if (!response.ok) throw new Error('Search unavailable'); setResult(await response.json() as AssetSearchResult); setState('idle'); }
    catch { setResult(null); setState('error'); }
  }
  return <div className="search-wrap"><form onSubmit={search} className="search-form"><label htmlFor="market-search">Search markets</label><input id="market-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an asset or symbol" /><button type="submit" aria-label="Search markets">⌕</button></form>{state === 'loading' && <p className="search-message">Searching provider...</p>}{state === 'error' && <p className="search-message error-text">Market search unavailable.</p>}{result && result.count === 0 && <p className="search-message">No provider configured. No results returned.</p>}</div>;
}
