import Link from 'next/link';

const navigation = [['Dashboard', '/dashboard'], ['Markets', '/markets'], ['AI Scanner', '/ai-scanner'], ['News', '/news'], ['Portfolio', '/portfolio'], ['Paper Trading', '/paper-trading'], ['Strategy Lab', '/strategy-lab'], ['Backtesting', '/backtesting'], ['AI Analyst', '/ai-analyst'], ['Trade Journal', '/trade-journal'], ['Alerts', '/alerts'], ['Settings', '/settings']];

export function Sidebar() {
  return <><aside className="sidebar"><div className="brand"><span className="brand-mark">M</span><span>MarketPilot <em>AI</em></span></div><p className="eyebrow">Research terminal</p><nav>{navigation.map(([label, href], index) => <Link className={index === 0 ? 'nav-item active' : 'nav-item'} href={href} key={label}>{label}</Link>)}</nav><div className="sidebar-footer"><span className="status-dot" /> Paper environment<br /><small>No live orders connected</small></div></aside><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(([label, href], index) => <Link className={index === 0 ? 'mobile-nav-item active' : 'mobile-nav-item'} href={href} key={label}>{label}</Link>)}</nav></>;
}
