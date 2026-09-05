import { AssetClassCard } from './AssetClassCard';

const assetClasses = ['Indian Markets', 'US Markets', 'Forex', 'Crypto', 'Commodities'];

export function MarketOverview() {
  return <section className="dashboard-section"><div className="section-heading"><div><p className="eyebrow">Market overview</p><h2>Across your universe</h2></div><span className="section-meta">Provider status: unavailable</span></div><div className="asset-class-grid">{assetClasses.map((label) => <AssetClassCard label={label} key={label} />)}</div></section>;
}
