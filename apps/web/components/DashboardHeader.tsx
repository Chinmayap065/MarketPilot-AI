import { MarketSearch } from './MarketSearch';

export function DashboardHeader() {
  return <header className="topbar"><div><p className="eyebrow">Research workspace</p><h1>AI market intelligence terminal</h1><p className="header-copy">Evidence first. Uncertainty visible. Paper research only.</p></div><div className="topbar-actions"><MarketSearch /><button className="avatar" aria-label="Profile">C</button></div></header>;
}
