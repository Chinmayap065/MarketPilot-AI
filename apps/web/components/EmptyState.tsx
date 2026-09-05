interface EmptyStateProps {
  title: string;
  description: string;
  tone?: 'empty' | 'unavailable' | 'awaiting';
}

export function EmptyState({ title, description, tone = 'empty' }: EmptyStateProps) {
  return <div className={`empty-state ${tone}`}><span className="empty-state-icon" aria-hidden="true">○</span><h3>{title}</h3><p>{description}</p></div>;
}
