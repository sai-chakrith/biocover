'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { CurvePoint } from '@/lib/types';
import BenchmarkPanel from '@/components/BenchmarkPanel';

interface SensitivityRow { threshold: number; minReserves: number; speciesCount: number; totalSpecies: number; excludedSpecies: string[] }
interface Comparison { budget: number; equal: number; iucn: number }

export default function SensitivityPage() {
    const [data, setData] = useState<SensitivityRow[]>([]);
    const [curve, setCurve] = useState<Comparison[]>([]);
    const [thresholdError, setThresholdError] = useState<string | null>(null);
    const [curveError, setCurveError] = useState<string | null>(null);
    const [thresholdLoading, setThresholdLoading] = useState(true);
    const [curveLoading, setCurveLoading] = useState(true);
    useEffect(() => {
        const controller = new AbortController();
        async function loadThresholds() {
            try {
                const response = await fetch('/api/sensitivity', { signal: controller.signal });
                const value = await response.json();
                if (!response.ok) throw new Error(value.error || 'Could not load record thresholds');
                setData(value);
            } catch (err) {
                if (!controller.signal.aborted) setThresholdError(err instanceof Error ? err.message : 'Could not load record thresholds');
            } finally {
                if (!controller.signal.aborted) setThresholdLoading(false);
            }
        }
        async function loadCurves() {
            try {
                const responses = await Promise.all([
                    fetch('/api/coverage-curve?weighted=false&max_budget=60', { signal: controller.signal }),
                    fetch('/api/coverage-curve?weighted=true&max_budget=60', { signal: controller.signal }),
                ]);
                const values = await Promise.all(responses.map(response => response.json()));
                const failed = responses.findIndex(response => !response.ok);
                if (failed !== -1) throw new Error(values[failed].error || 'Could not load coverage curves');
                const equal = values[0] as CurvePoint[];
                const weighted = new Map((values[1] as CurvePoint[]).map(point => [point.budget, point]));
                setCurve(equal.filter(point => weighted.has(point.budget)).map(point => ({
                    budget: point.budget, equal: point.coveragePercent, iucn: weighted.get(point.budget)!.coveragePercent,
                })));
            } catch (err) {
                if (!controller.signal.aborted) setCurveError(err instanceof Error ? err.message : 'Could not load coverage curves');
            } finally {
                if (!controller.signal.aborted) setCurveLoading(false);
            }
        }
        void loadThresholds();
        void loadCurves();
        return () => controller.abort();
    }, []);
    return <div className="page-transition">
        <h1>Sensitivity analysis</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Check how record requirements and threat weights change the selected network.</p>
        <BenchmarkPanel />
        {thresholdLoading && <p role="status">Computing record thresholds.</p>}
        {thresholdError && <p role="alert" style={{ color: 'var(--accent-red)' }}>{thresholdError}</p>}
        {data.length > 0 && <section className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Minimum records per species per cell</h2>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>The threshold filters evidence within each cell. Species without a qualifying cell are excluded; these networks cover only the supported subset.</p>
            <div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Records required</th><th>Supported species</th><th>Excluded species</th><th>Minimum cells</th></tr></thead>
                <tbody>{data.map(row => <tr key={row.threshold}><td>{row.threshold}</td><td>{row.speciesCount} / {row.totalSpecies}</td><td>{row.excludedSpecies.length}</td><td>{row.minReserves}</td></tr>)}</tbody>
            </table></div>
        </section>}
        {curveLoading && <p role="status">Computing coverage curves. The first run can take a few moments.</p>}
        {curveError && <p role="alert" style={{ color: 'var(--accent-red)' }}>{curveError}</p>}
        {curve.length > 0 && <section className="glass-card">
            <h2 style={{ fontSize: '1.25rem' }}>Species representation versus cell budget</h2>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>Both lines show the percentage of species represented. IUCN weighting optimizes a threat score and may represent fewer species.</p>
            <div style={{ height: 340 }}><ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 20, right: 25, bottom: 25, left: 10 }}>
                    <CartesianGrid stroke="var(--border-glass)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="budget" type="number" domain={['dataMin', 'dataMax']} tickCount={7} allowDecimals={false}
                        stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }}
                        label={{ value: 'Budget (cells)', position: 'insideBottom', offset: -15, fill: 'var(--text-secondary)' }} />
                    <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }}
                        label={{ value: 'Species represented (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', borderRadius: 8 }}
                        labelFormatter={value => `Budget: ${value} cells`}
                        formatter={value => value === undefined ? '' : `${Number(value).toFixed(1)}%`} />
                    <Legend verticalAlign="top" />
                    <Line dataKey="equal" name="Equal weights" stroke="var(--accent-primary)" strokeWidth={2} dot={false} />
                    <Line dataKey="iucn" name="IUCN weights" stroke="var(--accent-amber)" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer></div>
        </section>}
    </div>;
}
