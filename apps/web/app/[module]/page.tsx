import { Sidebar } from '../../components/Sidebar';

interface ModulePageProps { params: Promise<{ module: string }>; }

export default async function ModulePage({ params }: ModulePageProps) {
  const { module } = await params;
  const title = module.replaceAll('-', ' ');
  return <main className="shell"><Sidebar /><section className="content placeholder-page"><p className="eyebrow">Module</p><h1>{title}</h1><div className="feature-panel"><h2>This module is under development.</h2><p className="muted">Only the dashboard foundation is functional in Stage 1. No simulated market data or trading actions are available.</p></div></section></main>;
}
