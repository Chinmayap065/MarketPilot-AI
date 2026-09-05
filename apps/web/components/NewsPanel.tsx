import { EmptyState } from './EmptyState';

export function NewsPanel() {
  return <article className="feature-panel"><p className="eyebrow">Latest news</p><h2>News intelligence</h2><EmptyState title="No news data available yet" description="News ingestion and NLP are planned for a later stage." tone="unavailable" /></article>;
}
