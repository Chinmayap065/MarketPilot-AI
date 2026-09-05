interface StatusBadgeProps {
  children: string;
  tone?: 'configured' | 'unavailable' | 'awaiting';
}

export function StatusBadge({ children, tone = 'awaiting' }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}><span aria-hidden="true">●</span>{children}</span>;
}
