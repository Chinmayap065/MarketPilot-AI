import { DashboardHeader } from '../../components/DashboardHeader';
import { Sidebar } from '../../components/Sidebar';
import { MarketExplorer } from '../../components/MarketExplorer';

export default function MarketsPage() {
  return <main className="shell"><Sidebar /><section className="content"><DashboardHeader /><div className="notice"><span>●</span> Market data engine <strong>Quotes and candles remain unavailable until a provider is configured.</strong></div><section className="dashboard-section"><p className="eyebrow">Markets</p><h1>Canonical market universe</h1><p className="muted page-lead">Search normalized assets across Indian markets, global markets, forex, crypto, commodities, and ETFs. Provider-specific symbols stay behind the API.</p><MarketExplorer /></section></section></main>;
}
