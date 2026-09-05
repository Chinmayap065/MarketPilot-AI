import { Sidebar } from '../../../components/Sidebar';

interface AssetDetailPageProps { params: Promise<{ symbol: string }>; }

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);
  return <main className="shell"><Sidebar /><section className="content"><p className="eyebrow">Asset detail</p><h1>{decodedSymbol}</h1><div className="asset-detail-grid"><article className="feature-panel"><p className="eyebrow">Quote</p><h2>Market data unavailable</h2><p className="muted">No provider is configured for this workspace. The API will not substitute a price or timestamp.</p></article><article className="feature-panel"><p className="eyebrow">Historical data</p><h2>Awaiting source</h2><p className="muted">Candles will appear only after a supported provider and timeframe are available.</p></article><article className="feature-panel"><p className="eyebrow">Data status</p><h2>UNAVAILABLE</h2><p className="muted">Session status: UNKNOWN. Source: not configured.</p></article></div></section></main>;
}
