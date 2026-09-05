import { EmptyState } from './EmptyState';

export function AssetClassCard({ label }: { label: string }) {
  return <article className="asset-class-card"><div className="card-title-row"><h3>{label}</h3><span className="card-arrow" aria-hidden="true">↗</span></div><EmptyState title="Data connection not configured" description="Connect a provider to display current instruments." tone="unavailable" /></article>;
}
