'use client';
import { useEffect, useState } from 'react';

interface Benchmark {
  methods: { method: string; cellCount: number; speciesCovered: number; elapsedMs: number; status: string }[];
  targetSpecies: number;
  candidateCells: number;
  cellsSaved: number;
  compulsoryCells: { cellId: string; species: string[] }[];
  singleCellSpecies: number;
  dataVersion: string;
}

export default function BenchmarkPanel() {
  const [data, setData] = useState<Benchmark | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/benchmark', { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load comparison'); });
    return () => controller.abort();
  }, []);

  return <section className="glass-card" style={{ marginBottom: '1.5rem' }}>
    <h2 style={{ fontSize: '1.25rem' }}>What does optimization add?</h2>
    {error && <p role="alert" style={{ color: 'var(--accent-red)' }}>{error}</p>}
    {!data && !error && <p role="status">Comparing greedy selection with Set Covering…</p>}
    {data && <>
      <p style={{ color: 'var(--text-secondary)' }}>Both methods aim to represent all {data.targetSpecies} species using the same {data.candidateCells} candidate cells and equal cell costs.</p>
      <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Method</th><th>Cells</th><th>Species</th></tr></thead>
        <tbody>{data.methods.map(row => <tr key={row.method}><td>{row.method}<small style={{ display: 'block', color: 'var(--text-muted)' }}>{row.status === 'Proven optimal' ? 'Proven optimal' : 'Heuristic'}</small></td><td>{row.cellCount}</td><td style={{ whiteSpace: 'nowrap' }}>{row.speciesCovered} / {data.targetSpecies}</td></tr>)}</tbody>
      </table></div>
      <p style={{ marginTop: '1rem' }}>{data.cellsSaved === 0 ? 'Both methods use the same number of cells on this dataset.' : `Set Covering uses ${data.cellsSaved} fewer cell${data.cellsSaved === 1 ? '' : 's'} than this greedy rule while representing the same species.`}</p>
      <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>Greedy selects the cell covering the most species not yet represented, then repeats. Ties use sorted cell IDs. It is a simple comparison rule, not a guarantee of the smallest network.</p>
      <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>Measured runtime: {data.methods.map(row => `${row.method}: ${row.elapsedMs.toFixed(2)} ms`).join(' · ')}.</p>
      <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Runtimes measure one computation per method, including setup and solver startup where applicable. Results are cached until the solver restarts; timings vary with machine load and are not an average benchmark.</p>
      <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Why are some cells compulsory?</h3>
      <p><strong>{data.singleCellSpecies} species</strong> are recorded in only one candidate cell each. They make <strong>{data.compulsoryCells.length} distinct cells</strong> compulsory for full representation: leave one out and at least one of those species is lost.</p>
      <details><summary>See the {data.compulsoryCells.length} cells and the species that require them</summary>
        <div style={{ maxHeight: 280, overflow: 'auto', marginTop: '.75rem' }}><table className="data-table"><thead><tr><th>Compulsory cell</th><th>Species recorded only in this cell</th></tr></thead><tbody>{data.compulsoryCells.map(row => <tr key={row.cellId}><td>{row.cellId}</td><td>{row.species.map(s => <div key={s}><i>{s}</i></div>)}</td></tr>)}</tbody></table></div>
      </details>
      <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>This explanation applies to full baseline representation. Budgeted MCLP may omit these cells and leave their species unrepresented. A species recorded in one cell is not necessarily biologically restricted to that location.</p>
      <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: 0 }}>Source: supplied occurrence matrix · dataset {data.dataVersion}. The baseline model and data are unchanged.</p>
    </>}
  </section>;
}
