"""CSV-backed API for the dashboard; no database required."""
import hashlib
from functools import lru_cache
from pathlib import Path
from typing import Literal
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field
import optimize
import benchmark

app = FastAPI(title='BioCover Solver')
DATA = Path(optimize.DATA_DIR)
cells, species, a, weights_equal = optimize.load_data()
try:
    _, _, _, weights_iucn = optimize.load_data('weights.csv')
    weights_loaded = True
except ValueError:
    weights_iucn = weights_equal
    weights_loaded = False
weight_rows = pd.read_csv(DATA / 'weights.csv').set_index('species') if weights_loaded else None
categories = {s: str(weight_rows.loc[s, 'iucn_category']) if weight_rows is not None else 'NE' for s in species}
occ = pd.read_csv(DATA / 'cleaned_occurrences.csv')
grids = pd.read_csv(DATA / 'grid_cells.csv')
version = hashlib.sha256(b''.join((DATA / f).read_bytes() for f in
    ['coverage_matrix.csv', 'grid_cells.csv', 'cleaned_occurrences.csv', 'weights.csv']
    if (DATA / f).exists())).hexdigest()[:16]
cell_details = []
for row in grids.to_dict('records'):
    names = [s for s in species if a.get(row['cell_id'], {}).get(s, 0)]
    cell_details.append({'cellId': row['cell_id'], 'cellLat': row['cell_lat'], 'cellLon': row['cell_lon'],
        'centroidLat': row['centroid_lat'], 'centroidLon': row['centroid_lon'], 'speciesCount': len(names),
        'species': [{'name': s, 'iucnCategory': categories[s]} for s in names]})

class SolveRequest(BaseModel):
    model: Literal['set_covering', 'mclp']
    budget: int | None = Field(default=None, ge=0, le=len(cells), strict=True)
    weighted: bool = False

@lru_cache(maxsize=128)
def cached_solve(model, budget, weighted):
    if weighted and not weights_loaded:
        raise ValueError('IUCN weights unavailable; use equal weighting')
    w = weights_iucn if weighted else weights_equal
    result = optimize.solve_set_covering(cells, species, a) if model == 'set_covering' else optimize.solve_mclp(cells, species, a, w, budget)
    selected = set(result['selectedCells'])
    return {**result, 'cellDetails': [c for c in cell_details if c['cellId'] in selected],
            'weighted': weighted, 'dataVersion': version}

@app.get('/health')
def health():
    return {'status': 'ok', 'cells': len(cells), 'species': len(species), 'dataVersion': version}

@app.post('/solve')
def solve(req: SolveRequest):
    if req.model == 'mclp' and req.budget is None:
        raise HTTPException(400, 'Budget required for MCLP')
    try:
        return cached_solve(req.model, req.budget if req.model == 'mclp' else None, req.weighted if req.model == 'mclp' else False)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

@lru_cache(maxsize=8)
def cached_curve(weighted, max_budget):
    if weighted and not weights_loaded:
        raise ValueError('IUCN weights unavailable')
    return optimize.generate_coverage_curve(cells, species, a, weights_iucn if weighted else weights_equal, max_budget)

@app.get('/coverage-curve')
def coverage_curve(weighted: bool = False, max_budget: int = Query(60, ge=1, le=min(100, len(cells)))):
    try:
        return cached_curve(weighted, max_budget)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

@app.get('/cells')
def get_cells():
    return cell_details

@app.get('/data/status')
def data_status():
    return {'speciesCount': len(species), 'cellCount': len(cells), 'recordCount': len(occ),
            'coverageCount': sum(sum(row.values()) for row in a.values()), 'weightsLoaded': weights_loaded,
            'minReserves': cached_solve('set_covering', None, False)['totalSelected'], 'dataVersion': version}

@app.get('/stats')
def stats():
    richness = sorted([{'cellId': c['cellId'], 'speciesCount': c['speciesCount']} for c in cell_details], key=lambda c: c['speciesCount'], reverse=True)
    distribution = pd.Series(categories).value_counts()
    restricted = [{'name': s, 'cellCount': sum(a[c][s] for c in cells), 'iucnCategory': categories[s]}
                  for s in species if sum(a[c][s] for c in cells) <= 2]
    return {'richness': richness[:30], 'threatBreakdown': [{'category': k, 'count': int(v)} for k, v in distribution.items()],
            'endemicSpecies': restricted, 'totalSpecies': len(species), 'totalCells': len(cells)}

@lru_cache(maxsize=1)
def sensitivity_results():
    results = []
    counts = occ.groupby(['cell_id', 'species']).size().reset_index(name='n')
    for threshold in [1, 2, 3, 5]:
        supported = counts[counts.n >= threshold]
        cov = (supported.pivot_table(index='cell_id', columns='species', values='n', fill_value=0) > 0).astype(int)
        excluded = sorted(set(species) - set(cov.columns))
        result = optimize.solve_set_covering(list(cov.index), list(cov.columns), cov.T.to_dict()) if not cov.empty else {'totalSelected': 0}
        results.append({'threshold': threshold, 'minReserves': result['totalSelected'], 'speciesCount': len(cov.columns),
                        'totalSpecies': len(species), 'excludedSpecies': excluded, 'cellCount': len(cov.index)})
    return results

@app.get('/sensitivity')
def sensitivity():
    try:
        return sensitivity_results()
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

@lru_cache(maxsize=1)
def benchmark_results():
    return {**benchmark.compare(cells, species, a), 'dataVersion': version}


@app.get('/benchmark')
def get_benchmark():
    try:
        return benchmark_results()
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
