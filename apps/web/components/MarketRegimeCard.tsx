import { EmptyState } from './EmptyState';
import { StatusBadge } from './StatusBadge';

export function MarketRegimeCard() {
  return <article className="feature-panel"><div className="card-title-row"><div><p className="eyebrow">AI market regime</p><h2>Awaiting market data</h2></div><StatusBadge>Not available</StatusBadge></div><EmptyState title="No regime classification" description="The regime engine will remain idle until it receives validated historical or real-time data." tone="awaiting" /></article>;
}
