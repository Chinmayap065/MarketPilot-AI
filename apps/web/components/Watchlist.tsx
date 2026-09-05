import { EmptyState } from './EmptyState';

export function Watchlist() {
  return <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">Watchlist</p><h2>Track selected assets</h2></div><button className="outline-button">Add asset <span>+</span></button></div><div className="table-shell"><div className="table-header"><span>Symbol</span><span>Asset</span><span>Price</span><span>Change</span><span>Signal</span></div><EmptyState title="No assets in your watchlist yet" description="Search for an asset above to begin building your research universe." /></div></section>;
}
