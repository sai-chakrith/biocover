import pandas as pd
from pulp import *
import time
import os
import math

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def load_data(weights_file=None):
    """Load coverage matrix and optionally species weights."""
    coverage = pd.read_csv(os.path.join(DATA_DIR, 'coverage_matrix.csv'), index_col=0)
    if coverage.empty or not coverage.index.is_unique or not coverage.columns.is_unique:
        raise ValueError('Coverage matrix must have unique cells and species and cannot be empty')
    if not coverage.isin([0, 1]).all().all():
        raise ValueError('Coverage matrix must contain only 0 and 1')
    cells = list(coverage.index)
    species = list(coverage.columns)

    # Build a_ij dict: a_ij[cell][species] = 1 if species present in cell
    a = coverage.astype(int).T.to_dict()

    # Load weights
    weights = {sp: 1.0 for sp in species}  # default equal weights
    if weights_file and not os.path.exists(os.path.join(DATA_DIR, weights_file)):
        raise ValueError(f'Weights file not found: {weights_file}')
    if weights_file:
        w_df = pd.read_csv(os.path.join(DATA_DIR, weights_file))
        if not w_df['species'].is_unique or not set(species).issubset(set(w_df['species'])):
            raise ValueError('Weights must contain each species exactly once')
        for _, row in w_df.iterrows():
            if row['species'] in weights:
                weights[row['species']] = float(row['weight'])
    if any(not math.isfinite(w) or w <= 0 for w in weights.values()):
        raise ValueError('Species weights must be finite and positive')

    return cells, species, a, weights

def _tie_break_terms(cells, x):
    """
    Prefer lower-ranked cells among integer-objective ties.
    Rank sums can still tie; this does not guarantee a unique network.
    """
    sorted_cells = sorted(cells)
    rank = {cell: idx for idx, cell in enumerate(sorted_cells)}
    epsilon = 1e-6 / (len(cells) + 1)
    return epsilon * lpSum(rank[i] * x[i] for i in cells)

def _solve(prob):
    prob.solve(PULP_CBC_CMD(msg=0, timeLimit=60))
    if prob.status != LpStatusOptimal or prob.sol_status != LpSolutionOptimal:
        raise ValueError(f'No proven optimal solution: {LpStatus[prob.status]}')

def solve_set_covering(cells, species, a, weights=None):
    start = time.time()
    prob = LpProblem("SetCovering", LpMinimize)
    x = {i: LpVariable(f"x_{i}", cat='Binary') for i in cells}

    # Minimize total reserves
    prob += lpSum(x[i] for i in cells) + _tie_break_terms(cells, x)

    # Every species must be covered by at least one selected cell
    for j in species:
        prob += lpSum(a[i][j] * x[i] for i in cells if a[i][j] == 1) >= 1, f"cover_{j}"

    _solve(prob)

    elapsed = int((time.time() - start) * 1000)
    selected = [i for i in cells if x[i].varValue and x[i].varValue > 0.5]

    # Compute which species are covered
    covered = []
    for j in species:
        if any(a[i][j] == 1 for i in selected):
            covered.append(j)
    uncovered = [j for j in species if j not in covered]

    return {
        'status': LpStatus[prob.status],
        'model': 'set_covering',
        'totalSelected': len(selected),
        'selectedCells': selected,
        'coveredSpecies': covered,
        'uncoveredSpecies': uncovered,
        'coveragePercent': round(len(covered) / len(species) * 100, 1),
        'solveTimeMs': elapsed
    }

def solve_mclp(cells, species, a, weights, budget):
    if isinstance(budget, bool) or not isinstance(budget, int) or not 0 <= budget <= len(cells):
        raise ValueError(f'Budget must be an integer between 0 and {len(cells)}')
    if any(not math.isfinite(weights[j]) or weights[j] <= 0 for j in species):
        raise ValueError('Species weights must be finite and positive')
    start = time.time()
    prob = LpProblem("MCLP", LpMaximize)
    x = {i: LpVariable(f"x_{i}", cat='Binary') for i in cells}
    y = {j: LpVariable(f"y_{j}", cat='Binary') for j in species}

    # Maximize weighted species coverage
    # Optimize coverage first, then apply the rank preference without changing
    # the primary objective (also safe for user-supplied fractional weights).
    score = lpSum(weights[j] * y[j] for j in species)
    prob += score

    # Species can only be covered if at least one cell covering it is selected
    for j in species:
        covering_cells = [i for i in cells if a[i][j] == 1]
        prob += y[j] <= lpSum(x[i] for i in covering_cells), f"link_{j}"

    # Budget constraint
    prob += lpSum(x[i] for i in cells) <= budget, "budget"

    _solve(prob)
    prob += score >= value(score) - 1e-7, 'preserve_coverage_score'
    prob.setObjective(-_tie_break_terms(cells, x))
    _solve(prob)

    elapsed = int((time.time() - start) * 1000)
    selected = [i for i in cells if x[i].varValue and x[i].varValue > 0.5]
    covered = [j for j in species if any(a[i][j] == 1 for i in selected)]
    uncovered = [j for j in species if j not in covered]

    return {
        'status': LpStatus[prob.status],
        'model': 'mclp',
        'budget': budget,
        'totalSelected': len(selected),
        'selectedCells': selected,
        'coveredSpecies': covered,
        'uncoveredSpecies': uncovered,
        'coveragePercent': round(len(covered) / len(species) * 100, 1),
        'weightedScore': sum(weights[j] for j in covered),
        'weightedCoveragePercent': round(sum(weights[j] for j in covered) / sum(weights.values()) * 100, 1),
        'solveTimeMs': elapsed
    }

def generate_coverage_curve(cells, species, a, weights, max_budget=None):
    if max_budget is None:
        max_budget = min(len(cells), 100)
    if not 1 <= max_budget <= min(len(cells), 100):
        raise ValueError('Maximum curve budget must be between 1 and 100, and no greater than the cell count')
    curve = []
    budgets = list(range(1, max_budget + 1))
    for b in budgets:
        result = solve_mclp(cells, species, a, weights, b)
        curve.append({
            'budget': b,
            'coveragePercent': result['coveragePercent'],
            'speciesCovered': len(result['coveredSpecies']),
            'weightedCoveragePercent': result['weightedCoveragePercent']
        })
        if result['coveragePercent'] >= 100.0:
            break
    return curve

if __name__ == '__main__':
    cells, species, a, weights = load_data()
    print(f"Loaded {len(cells)} cells, {len(species)} species")

    result = solve_set_covering(cells, species, a)
    print(f"\nSet Covering: {result['totalSelected']} reserves for {result['coveragePercent']}% coverage")
    print(f"Status: {result['status']}, Solve time: {result['solveTimeMs']}ms")

    for budget in [1, 10, 20, 40, 55, 57]:
        result = solve_mclp(cells, species, a, weights, budget)
        print(f"MCLP(budget={budget}): {result['coveragePercent']}% coverage ({len(result['coveredSpecies'])} species)")
