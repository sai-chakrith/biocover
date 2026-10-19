'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import IUCNBadge from '@/components/IUCNBadge';
import IUCNLegend from '@/components/IUCNLegend';

interface Status { speciesCount: number; cellCount: number; recordCount: number; minReserves: number; dataVersion: string }
interface Stats { richness: { cellId: string; speciesCount: number }[];
  threatBreakdown: { category: string; count: number }[];
  endemicSpecies: { name: string; cellCount: number; iucnCategory: string }[] }

export default function Dashboard() {
  const [data, setData] = useState<{ status: Status; stats: Stats } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const [a, b] = await Promise.all([fetch('/api/data/status'), fetch('/api/stats')]);
        const [status, stats] = await Promise.all([a.json(), b.json()]);
        if (!a.ok || !b.ok) throw new Error(status.error || stats.error);
        setData({ status, stats });
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not load project data'); }
    }
    void load();
  }, []);
  return <div className="page-transition">
    <h1>Western Ghats amphibian sites</h1>
    <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>Find a small set of locations that represents the most recorded species.</p>
    <Link href="/optimize" className="btn-primary" style={{ display: 'inline-block', marginBottom: '2rem' }}>Optimize conservation sites</Link>
    {error && <p role="alert" style={{ color: 'var(--accent-red)' }}>{error}</p>}
    {!data && !error && <p role="status">Loading project data…</p>}
    {data && <>
      <div className="grid grid-cols-4" style={{ marginBottom: '2rem' }}>
        <StatCard title="Species" value={data.status.speciesCount} />
        <StatCard title="Candidate cells" value={data.status.cellCount} />
        <StatCard title="Cleaned records" value={data.status.recordCount} />
        <StatCard title="Minimum cells for all species" value={data.status.minReserves} />
      </div>
      <div className="grid grid-cols-2">
        <section className="glass-card"><h2 style={{ fontSize: '1.25rem' }}>Richest recorded cells</h2>
          <table className="data-table"><thead><tr><th>Cell</th><th>Species</th></tr></thead><tbody>
            {data.stats.richness.slice(0, 10).map(r => <tr key={r.cellId}><td>{r.cellId}</td><td>{r.speciesCount}</td></tr>)}
          </tbody></table>
        </section>
        <section className="glass-card"><h2 style={{ fontSize: '1.25rem' }}>Saved IUCN categories</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '1rem 0' }}>These labels are from the supplied snapshot. Unknown lookups are kept separate from Least Concern.</p>
          <table className="data-table"><thead><tr><th>Category</th><th>Species</th></tr></thead><tbody>
            {data.stats.threatBreakdown.map(r => <tr key={r.category}><td><IUCNBadge category={r.category} /></td><td>{r.count}</td></tr>)}
          </tbody></table>
        </section>
      </div>
      <IUCNLegend />
      <section className="glass-card" style={{ marginTop: '2rem' }}><h2 style={{ fontSize: '1.25rem' }}>Species recorded in at most two cells</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>Limited observations do not by themselves establish endemism.</p>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}><table className="data-table"><thead><tr><th>Species</th><th>Observed cells</th><th>IUCN label</th></tr></thead><tbody>
          {data.stats.endemicSpecies.map(s => <tr key={s.name}><td><i>{s.name}</i></td><td>{s.cellCount}</td><td><IUCNBadge category={s.iucnCategory} /></td></tr>)}
        </tbody></table></div>
      </section>
      <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>Dataset {data.status.dataVersion}. Coverage means representation of recorded occurrences, including historical records; it does not establish habitat viability.</p>
    </>}
  </div>;
}
