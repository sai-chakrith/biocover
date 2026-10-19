'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CurvePoint } from '@/lib/types';
import BenchmarkPanel from '@/components/BenchmarkPanel';

interface SensitivityRow { threshold: number; minReserves: number; speciesCount: number; totalSpecies: number; excludedSpecies: string[] }
interface Comparison { budget: number; equal: number; iucn: number }

export default function SensitivityPage() {
  const [data, setData] = useState<SensitivityRow[]>([]);
  const [curve, setCurve] = useState<Comparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        const responses = await Promise.all([fetch('/api/sensitivity'),
          fetch('/api/coverage-curve?weighted=false&max_budget=60'), fetch('/api/coverage-curve?weighted=true&max_budget=60')]);
        const values = await Promise.all(responses.map(r => r.json()));
        const failed = responses.findIndex(r => !r.ok);
        if (failed !== -1) throw new Error(values[failed].error);
        setData(values[0]);
        const eq = values[1] as CurvePoint[], wt = values[2] as CurvePoint[];
        setCurve(eq.filter(e => wt.some(w => w.budget === e.budget)).map(e => ({ budget: e.budget,
          equal: e.coveragePercent, iucn: wt.find(w => w.budget === e.budget)!.coveragePercent })));
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not load analysis'); }
      finally { setLoading(false); }
    }
    void load();
  }, []);
  return <div className="page-transition">
    <h1>Sensitivity analysis</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Compare selection methods, understand compulsory cells, and check how record requirements and threat weights change the network.</p>
    <BenchmarkPanel />
    {loading && <p role="status">Computing coverage curves…</p>}
    {error && <p role="alert" style={{ color: 'var(--accent-red)' }}>{error}</p>}
    {data.length > 0 && <section className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem' }}>Minimum records per species per cell</h2>
      <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>The threshold filters evidence within each cell. Species without a qualifying cell are excluded; these networks cover only the supported subset.</p>
      <table className="data-table"><thead><tr><th>Records required</th><th>Supported species</th><th>Excluded species</th><th>Minimum cells</th></tr></thead>
        <tbody>{data.map(r => <tr key={r.threshold}><td>{r.threshold}</td><td>{r.speciesCount} / {r.totalSpecies}</td><td>{r.excludedSpecies.length}</td><td>{r.minReserves}</td></tr>)}</tbody></table>
    </section>}
    {curve.length > 0 && <section className="glass-card">
      <h2 style={{ fontSize: '1.25rem' }}>Species representation versus cell budget</h2>
      <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>Both lines show the percentage of species represented. IUCN weighting optimizes a threat score and may represent fewer species.</p>
      <div style={{ height: 340 }}><ResponsiveContainer width="100%" height="100%">
        <LineChart data={curve} margin={{ top: 20, right: 25, bottom: 25, left: 10 }}>
          <XAxis dataKey="budget" label={{ value: 'Budget (cells)', position: 'insideBottom', offset: -15 }} />
          <YAxis domain={[0, 100]} label={{ value: 'Species represented (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip /><Legend verticalAlign="top" />
          <Line dataKey="equal" name="Equal weights" stroke="var(--accent-primary)" dot={false} />
          <Line dataKey="iucn" name="IUCN weights" stroke="var(--accent-amber)" dot={false} />
        </LineChart>
      </ResponsiveContainer></div>
    </section>}
  </div>;
}
