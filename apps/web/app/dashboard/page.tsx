import { DashboardHeader } from '../../components/DashboardHeader';
import { MarketOverview } from '../../components/MarketOverview';
import { MarketRegimeCard } from '../../components/MarketRegimeCard';
import { NewsPanel } from '../../components/NewsPanel';
import { PortfolioSummary } from '../../components/PortfolioSummary';
import { Sidebar } from '../../components/Sidebar';
import { Watchlist } from '../../components/Watchlist';

export default function DashboardPage() {
  return <main className="shell"><Sidebar /><section className="content"><DashboardHeader /><div className="notice"><span>●</span> Foundation mode <strong>Data connections are not configured. No market values or signals are displayed.</strong></div><MarketOverview /><Watchlist /><section className="feature-grid"><MarketRegimeCard /><NewsPanel /><PortfolioSummary /></section></section></main>;
}
