'use client';
import { useState } from 'react';
import Link from 'next/link';
import ModelToggle from '@/components/ModelToggle';
import BudgetSlider from '@/components/BudgetSlider';
import type { OptResult } from '@/lib/types';
import { selectionQuery, LAST_SELECTION_KEY, type Selection } from '@/lib/selection';

export default function OptimizeForm({ initialSelection }: { initialSelection: Selection }) {
  const [model, setModel] = useState(initialSelection.model);
  const [budget, setBudget] = useState(initialSelection.budget);
  const [weighted, setWeighted] = useState(initialSelection.weighted);
  const [result, setResult] = useState<OptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch('/api/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, ...(model === 'mclp' ? { budget, weighted } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      try { sessionStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ model, budget, weighted: model === 'mclp' && weighted })); } catch { /* Direct map links still work without browser storage. */ }
    } catch (err) { setError(err instanceof Error ? err.message : 'Optimization failed'); }
    finally { setLoading(false); }
  }

  return <div className="page-transition">
    <h1>Optimize site selection</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Choose a model, run it, and review species coverage. Then open Map to inspect the selected locations.</p>
    <div className="grid grid-cols-2">
      <section className="glass-card">
        <fieldset disabled={loading} style={{ border: 0, padding: 0 }}>
          <ModelToggle value={model} onChange={value => { setModel(value); setResult(null); }} />
          {model === 'mclp' && <div style={{ marginTop: '1.5rem' }}>
            <BudgetSlider value={budget} onChange={value => { setBudget(value); setResult(null); }} />
            <label style={{ display: 'block', marginTop: '1rem' }}><input type="checkbox" checked={weighted}
              onChange={e => { setWeighted(e.target.checked); setResult(null); }} /> Use IUCN weighting</label>
          </div>}
          <button id="run-optimization-btn" className="btn-primary" onClick={run} style={{ marginTop: '1.5rem' }}>{loading ? 'Solving…' : 'Run optimization'}</button>
        </fieldset>
        {error && <p role="alert" style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>{error}</p>}
      </section>
      {result && <section className="glass-card" aria-live="polite">
        <h2>{result.totalSelected} cells selected</h2>
        <p>{result.coveredSpecies.length} species represented ({result.coveragePercent}%)</p>
        {model === 'mclp' && weighted && <p>Weighted score: {result.weightedScore}; weighted coverage: {result.weightedCoveragePercent}%</p>}
        <p style={{ color: 'var(--text-muted)' }}>Status: {result.status}</p>
        <Link href={`/map?${selectionQuery({ model, budget, weighted })}`} className="btn-primary" style={{ display: 'inline-block', margin: '1rem 0' }}>View selected sites on map</Link>
        <details><summary>Unrepresented species ({result.uncoveredSpecies.length})</summary>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>{result.uncoveredSpecies.map(s => <p key={s}><i>{s}</i></p>)}</div>
        </details>
      </section>}
    </div>
  </div>;
}
