"""A simple equal-cost greedy baseline and singleton-species explanations."""
from collections import defaultdict
from time import perf_counter

import optimize


def greedy_cover(cells, species, matrix):
    remaining = set(species)
    coverage = {c: {s for s in species if matrix[c][s]} for c in cells}
    selected = []
    ordered = sorted(cells)
    while remaining:
        if not ordered:
            raise ValueError('No cells are available to represent the target species.')
        best = max(ordered, key=lambda c: len(coverage[c] & remaining))
        gain = coverage[best] & remaining
        if not gain:
            raise ValueError('Some target species have no candidate cell.')
        selected.append(best)
        remaining.difference_update(gain)
    return selected


def compulsory_cells(cells, species, matrix):
    reasons = defaultdict(list)
    for s in sorted(species):
        supporting = [c for c in cells if matrix[c][s]]
        if len(supporting) == 1:
            reasons[supporting[0]].append(s)
    return [{'cellId': c, 'species': reasons[c]} for c in sorted(reasons)]


def compare(cells, species, matrix):
    start = perf_counter()
    greedy = greedy_cover(cells, species, matrix)
    greedy_ms = (perf_counter() - start) * 1000
    start = perf_counter()
    exact = optimize.solve_set_covering(cells, species, matrix)
    exact_ms = (perf_counter() - start) * 1000
    rows = []
    for name, selected, elapsed, status in [
        ('Greedy', greedy, greedy_ms, 'Heuristic; no optimality guarantee'),
        ('Set Covering (CBC)', exact['selectedCells'], exact_ms, 'Proven optimal'),
    ]:
        covered = [s for s in species if any(matrix[c][s] for c in selected)]
        if len(covered) != len(species):
            raise ValueError(f'{name} failed the full-representation check.')
        rows.append({'method': name, 'selectedCells': selected, 'cellCount': len(selected),
                     'speciesCovered': len(covered), 'elapsedMs': round(elapsed, 2), 'status': status})
    forced = compulsory_cells(cells, species, matrix)
    return {'methods': rows, 'targetSpecies': len(species), 'candidateCells': len(cells),
            'cellsSaved': len(greedy) - exact['totalSelected'], 'compulsoryCells': forced,
            'singleCellSpecies': sum(len(row['species']) for row in forced)}
