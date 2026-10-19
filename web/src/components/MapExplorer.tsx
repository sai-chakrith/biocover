'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ModelToggle from '@/components/ModelToggle';
import BudgetSlider from '@/components/BudgetSlider';
import SiteExplanations from '@/components/SiteExplanations';
import SpeciesStatusList from '@/components/SpeciesStatusList';
import { explainSelectedSites } from '@/lib/site-explanations';
import type { CellDetail, OptResult } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <p>Loading map…</p> });

export default function MapExplorer({ initialModel, initialBudget, initialWeighted }: {
  initialModel: 'set_covering' | 'mclp'; initialBudget: number; initialWeighted: boolean;
}) {
  const [model, setModel] = useState(initialModel);
  const [budget, setBudget] = useState(initialBudget);
  const [weighted, setWeighted] = useState(initialWeighted);
  const [cells, setCells] = useState<CellDetail[]>([]);
  const [result, setResult] = useState<OptResult | null>(null);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cells').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCells(data);
    }).catch(err => setError(err instanceof Error ? err.message : 'Could not load cells'));
  }, []);

  function clearResult() { setResult(null); setActiveCellId(null); setError(null); }

  async function runOptimization() {
    setLoading(true); setError(null); setResult(null); setActiveCellId(null);
    try {
      const response = await fetch('/api/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, ...(model === 'mclp' ? { budget, weighted } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
      setActiveCellId(data.cellDetails[0]?.cellId || null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Optimization failed'); }
    finally { setLoading(false); }
  }

  function downloadSites() {
    if (!result) return;
    const rows = ['cell_id,latitude,longitude,species_count', ...result.cellDetails.map(c =>
      `${c.cellId},${c.centroidLat},${c.centroidLon},${c.speciesCount}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `biocover-${model}-${result.dataVersion}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const explanations = useMemo(() => explainSelectedSites(result?.cellDetails || []), [result]);
  const speciesCategories = useMemo(() => Object.fromEntries(cells.flatMap(cell =>
    cell.species.map(species => [species.name, species.iucnCategory]))), [cells]);
  const siteSummaries = useMemo(() => Object.fromEntries(explanations.map(site => [site.cell.cellId, {
    threatenedCount: site.threatenedSpecies.length, uniqueCount: site.uniqueSpecies.length,
  }])), [explanations]);
  const mapCells = useMemo(() => cells.map(c => ({ id: c.cellId,
    bounds: [[c.cellLat, c.cellLon], [c.cellLat + 0.1, c.cellLon + 0.1]] as [[number, number], [number, number]],
    speciesCount: c.speciesCount, selected: false, species: c.species })), [cells]);

  function explainSite(cellId: string) {
    setActiveCellId(cellId);
    document.getElementById('site-explanations')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return <div className="page-transition">
    <h1>Optimize conservation sites</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Choose the smallest network or set a cell budget, then inspect the highlighted locations.</p>
    <div className="map-layout">
      <section className="glass-card" style={{ width: 320, flexShrink: 0 }}>
        <fieldset disabled={loading} style={{ border: 0, padding: 0, margin: 0 }}>
          <ModelToggle value={model} onChange={value => { setModel(value); clearResult(); }} />
          {model === 'mclp' && <div style={{ marginTop: '1.5rem' }}>
            <BudgetSlider value={budget} onChange={value => { setBudget(value); clearResult(); }} />
            <label style={{ display: 'block', margin: '1rem 0' }}><input type="checkbox" checked={weighted}
              onChange={e => { setWeighted(e.target.checked); clearResult(); }} /> Prioritize IUCN threat weights</label>
          </div>}
          <button id="map-run-btn" className="btn-primary" onClick={runOptimization} disabled={!cells.length}
            style={{ width: '100%', marginTop: '1.5rem' }}>{loading ? 'Selecting sites…' : 'Locate sites'}</button>
        </fieldset>
        {error && <p role="alert" style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>{error}</p>}
        {result && <div aria-live="polite" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem' }}>{result.totalSelected} selected cells</h2>
          <p>{result.coveredSpecies.length} species represented ({result.coveragePercent}%)</p>
          {model === 'mclp' && weighted && <p>Weighted coverage: {result.weightedCoveragePercent}%</p>}
          <button className="btn-primary" onClick={downloadSites} style={{ marginTop: '1rem' }}>Download site coordinates</button>
          <details open style={{ marginTop: '1rem' }}><summary>Represented species ({result.coveredSpecies.length})</summary>
            <SpeciesStatusList species={result.coveredSpecies} categories={speciesCategories} label="Represented species and IUCN categories" />
          </details>
          <details style={{ marginTop: '1rem' }}><summary>Selected coordinates</summary>
            <div style={{ maxHeight: 240, overflowY: 'auto', fontSize: '.85rem' }}>{result.cellDetails.map(c =>
              <p key={c.cellId}>{c.cellId}: {c.centroidLat.toFixed(2)}°N, {c.centroidLon.toFixed(2)}°E</p>)}</div>
          </details>
          <details style={{ marginTop: '1rem' }}><summary>Unrepresented species ({result.uncoveredSpecies.length})</summary>
            <SpeciesStatusList species={result.uncoveredSpecies} categories={speciesCategories} label="Unrepresented species and IUCN categories" />
          </details>
        </div>}
        <p style={{ marginTop: '1.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>Orange cells with white-ringed dots are selected reserves. Click a cell for species. {cells.length} candidate cells.</p>
      </section>
      <div style={{ flex: 1, minWidth: 0, minHeight: 600 }}><MapView cells={mapCells} selectedCellIds={result?.selectedCells || []}
        siteSummaries={siteSummaries} onExplainSite={explainSite} /></div>
    </div>
    {result && <SiteExplanations key={`${result.model}-${result.dataVersion}-${result.budget ?? ''}`} sites={explanations}
      activeCellId={activeCellId} onSelect={setActiveCellId} representedSpecies={result.coveredSpecies.length} />}
    <p style={{ marginTop: '1rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>These sites represent recorded occurrences in 0.1° cells. K counts cells, not money. Occurrences and saved IUCN labels may be historical.</p>
  </div>;
}
