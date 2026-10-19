'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CellDetail, OptResult } from '@/lib/types';
import { LAST_SELECTION_KEY, parseSelection, selectionQuery, type Selection } from '@/lib/selection';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <p>Loading map…</p> });

export default function MapExplorer({ initialSelection }: { initialSelection: Selection | null }) {
  const [selection, setSelection] = useState(initialSelection);
  const [cells, setCells] = useState<CellDetail[]>([]);
  const [result, setResult] = useState<OptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/cells', { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCells(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load cells'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSelection() {
      let chosen = initialSelection;
      if (!chosen) {
        try { chosen = parseSelection(JSON.parse(sessionStorage.getItem(LAST_SELECTION_KEY) || 'null') || {}); }
        catch { /* With no saved selection, show candidate cells and a link to Optimize. */ }
      }
      setSelection(chosen);
      if (!chosen) { setLoading(false); return; }
      try {
        const response = await fetch('/api/optimize', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ model: chosen.model, ...(chosen.model === 'mclp' ? { budget: chosen.budget, weighted: chosen.weighted } : {}) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setResult(data);
          try { sessionStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(chosen)); } catch { /* Storage is optional. */ }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load selection');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadSelection();
    return () => controller.abort();
  }, [initialSelection]);

  function downloadSites() {
    if (!result || !selection) return;
    const rows = ['cell_id,latitude,longitude,species_count', ...result.cellDetails.map(c =>
      `${c.cellId},${c.centroidLat},${c.centroidLon},${c.speciesCount}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `biocover-${selection.model}-${result.dataVersion}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const mapCells = cells.map(c => ({ id: c.cellId,
    bounds: [[c.cellLat, c.cellLon], [c.cellLat + 0.1, c.cellLon + 0.1]] as [[number, number], [number, number]],
    speciesCount: c.speciesCount, selected: false, species: c.species.map(s => s.name) }));
  const settingsLink = selection ? `/optimize?${selectionQuery(selection)}` : '/optimize';

  return <div className="page-transition">
    <h1>Explore selected sites</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Inspect where the selected cells are, click them for species, and download their coordinates. Change model settings in Optimize.</p>
    <section className="glass-card" style={{ marginBottom: '1.5rem' }}>
      {loading && <p role="status">Loading selected sites…</p>}
      {error && <p role="alert" style={{ color: 'var(--accent-red)' }}>{error}</p>}
      {result && selection && <div aria-live="polite">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '.5rem' }}>{result.totalSelected} selected cells · {result.coveragePercent}% species represented</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{selection.model === 'set_covering' ? 'Set Covering · minimum cells for full representation' : `MCLP · budget ${selection.budget} cells · ${selection.weighted ? 'IUCN weights' : 'Equal weights'}`} · {result.coveredSpecies.length} species</p>
        <button className="btn-primary" onClick={downloadSites} style={{ marginRight: '1rem', marginBottom: '.5rem' }}>Download site coordinates</button>
      </div>}
      {!loading && !selection && <p>No selection yet. The map shows candidate cells. Run a model in Optimize to highlight the chosen sites.</p>}
      <Link href={settingsLink} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>{selection ? 'Change settings in Optimize →' : 'Go to Optimize →'}</Link>
    </section>
    <div style={{ height: 600, width: '100%', minWidth: 0 }}><MapView cells={mapCells} selectedCellIds={result?.selectedCells || []}/></div>
    <p style={{ marginTop: '1rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}><span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#16a34a', border: '2px solid white', marginRight: 6 }}/>Green dots and orange cells: selected sites. Click a cell for species. {cells.length} candidate cells.</p>
    {result && <details><summary>Selected coordinates ({result.totalSelected})</summary><div style={{ maxHeight: 240, overflowY: 'auto', fontSize: '.85rem' }}>{result.cellDetails.map(c => <p key={c.cellId}>{c.cellId}: {c.centroidLat.toFixed(2)}°N, {c.centroidLon.toFixed(2)}°E</p>)}</div></details>}
    <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>These sites represent recorded occurrences in 0.1° cells. K counts cells, not money. Occurrences and saved IUCN labels may be historical.</p>
  </div>;
}
