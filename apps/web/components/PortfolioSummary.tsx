import { EmptyState } from './EmptyState';

export function PortfolioSummary() {
  return <article className="feature-panel"><p className="eyebrow">Portfolio</p><h2>Paper-trading workspace</h2><EmptyState title="No paper-trading portfolio created" description="Portfolio analytics will appear after a paper portfolio is created. Real-money trading is not supported." /></article>;
}
