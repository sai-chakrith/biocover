import type { CellDetail } from '@/lib/types';

export interface SiteExplanation {
    cell: CellDetail;
    threatenedSpecies: CellDetail['species'];
    uniqueSpecies: CellDetail['species'];
}

export function explainSelectedSites(cells: CellDetail[]): SiteExplanation[] {
    const representation = new Map<string, number>();
    for (const cell of cells) {
        for (const name of new Set(cell.species.map(species => species.name))) {
            representation.set(name, (representation.get(name) || 0) + 1);
        }
    }
    return cells.map(cell => ({
        cell,
        threatenedSpecies: cell.species.filter(species => ['CR', 'EN', 'VU'].includes(species.iucnCategory.toUpperCase())),
        uniqueSpecies: cell.species.filter(species => representation.get(species.name) === 1),
    }));
}
