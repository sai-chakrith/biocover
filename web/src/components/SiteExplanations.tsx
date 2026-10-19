'use client';

import { useState } from 'react';
import IUCNBadge from '@/components/IUCNBadge';
import type { SiteExplanation } from '@/lib/site-explanations';

interface Props {
    sites: SiteExplanation[];
    activeCellId: string | null;
    onSelect: (cellId: string) => void;
    representedSpecies: number;
}

export default function SiteExplanations({ sites, activeCellId, onSelect, representedSpecies }: Props) {
    const [filter, setFilter] = useState<'all' | 'threatened' | 'unique'>('all');
    const site = sites.find(site => site.cell.cellId === activeCellId) || sites[0];
    if (!site) return null;
    const uniqueNames = new Set(site.uniqueSpecies.map(species => species.name));
    const species = filter === 'threatened' ? site.threatenedSpecies : filter === 'unique' ? site.uniqueSpecies : site.cell.species;

    return (
        <section id="site-explanations" className="glass-card site-explanations" aria-labelledby="site-explanations-title">
            <div className="site-explanations-heading">
                <div>
                    <h2 id="site-explanations-title">Why this site?</h2>
                    <p>Inspect each selected cell&apos;s contribution to this network.</p>
                </div>
                <div className="site-picker">
                    <label htmlFor="explanation-site">Selected site</label>
                    <select id="explanation-site" value={site.cell.cellId} onChange={event => onSelect(event.target.value)}>
                        {sites.map(item => <option key={item.cell.cellId} value={item.cell.cellId}>
                            {item.cell.cellId} · {item.cell.speciesCount} species · {item.uniqueSpecies.length} unique to this selection
                        </option>)}
                    </select>
                </div>
            </div>
            <div aria-live="polite" aria-atomic="true">
                <h3 className="site-cell-title">Cell {site.cell.cellId} <span>{site.cell.centroidLat.toFixed(2)}°N, {site.cell.centroidLon.toFixed(2)}°E</span></h3>
                <dl className="site-contribution-stats">
                    <div><dt>Species represented here</dt><dd>{site.cell.speciesCount}</dd></div>
                    <div><dt>Threatened species (CR / EN / VU)</dt><dd>{site.threatenedSpecies.length}</dd></div>
                    <div><dt>Unique within selected network</dt><dd>{site.uniqueSpecies.length}</dd></div>
                </dl>
                <p className="site-impact">
                    {site.uniqueSpecies.length > 0
                        ? <>Removing this cell while keeping the other selections fixed would leave <strong>{site.uniqueSpecies.length} species</strong> unrepresented, reducing network representation from <strong>{representedSpecies}</strong> to <strong>{representedSpecies - site.uniqueSpecies.length}</strong>.</>
                        : <>Every species in this cell is also represented by another selected cell. Removing it alone would leave the network&apos;s represented species count unchanged.</>}
                </p>
            </div>
            <div className="site-species-filters" role="group" aria-label="Filter site species">
                <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All species ({site.cell.species.length})</button>
                <button type="button" aria-pressed={filter === 'threatened'} onClick={() => setFilter('threatened')}>Threatened ({site.threatenedSpecies.length})</button>
                <button type="button" aria-pressed={filter === 'unique'} onClick={() => setFilter('unique')}>Unique to this selection ({site.uniqueSpecies.length})</button>
            </div>
            <ul className="site-species-list" aria-label="Species in the selected site">
                {species.map(item => <li key={item.name}>
                    <i>{item.name}</i>
                    <div><IUCNBadge category={item.iucnCategory} />{uniqueNames.has(item.name) && <span className="site-unique-label">Only here in selected network</span>}</div>
                </li>)}
            </ul>
            {species.length === 0 && <p className="site-empty">No species in this category for this site.</p>}
            <p className="site-explanation-note">“Unique” refers only to the selected cells, not to the species&apos; global range. These are coverage contributions, not a claim that the solver has one uniquely necessary choice. IUCN labels come from the saved dataset and may be historical.</p>
        </section>
    );
}
