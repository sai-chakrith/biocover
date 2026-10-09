import os
import pandas as pd
import pytest
import optimize

def test_load_data():
    cells, species, a, weights = optimize.load_data()
    cov_path = os.path.join(optimize.DATA_DIR, 'coverage_matrix.csv')
    cov_df = pd.read_csv(cov_path, index_col=0)

    assert len(cells) == len(cov_df.index)
    assert len(species) == len(cov_df.columns)
    assert len(a) == len(cells)
    assert len(weights) == len(species)

def test_solve_set_covering():
    cells, species, a, weights = optimize.load_data()
    result = optimize.solve_set_covering(cells, species, a)
    assert result['status'] == 'Optimal'
    assert result['coveragePercent'] == 100.0
    assert result['totalSelected'] > 0
    assert result['totalSelected'] <= len(cells)
    assert result['totalSelected'] == 56  # regenerated boundary-corrected snapshot
    assert all(any(a[c][sp] for c in result['selectedCells']) for sp in species)

def test_solve_mclp():
    cells, species, a, weights = optimize.load_data()
    budget = 10
    result = optimize.solve_mclp(cells, species, a, weights, budget)
    assert result['status'] == 'Optimal'
    assert result['totalSelected'] <= budget
    assert result['coveragePercent'] > 0

def test_coverage_curve():
    cells, species, a, weights = optimize.load_data()
    curve = optimize.generate_coverage_curve(cells, species, a, weights, max_budget=3)
    assert len(curve) <= 3
    if len(curve) > 1:
        assert curve[1]['coveragePercent'] >= curve[0]['coveragePercent']


@pytest.fixture
def tiny():
    return ['A', 'B', 'C'], ['frog', 'toad', 'newt'], {
        'A': {'frog': 1, 'toad': 1, 'newt': 0},
        'B': {'frog': 0, 'toad': 1, 'newt': 1},
        'C': {'frog': 0, 'toad': 0, 'newt': 1}}, {'frog': 1, 'toad': 1, 'newt': 5}


def test_known_small_optima(tiny):
    c, s, a, w = tiny
    assert optimize.solve_set_covering(c, s, a)['totalSelected'] == 2
    result = optimize.solve_mclp(c, s, a, w, 1)
    assert result['selectedCells'] == ['B']
    assert set(result['coveredSpecies']) == {'toad', 'newt'}
    assert result['weightedScore'] == 6


def test_zero_budget(tiny):
    result = optimize.solve_mclp(*tiny, 0)
    assert result['totalSelected'] == 0
    assert result['coveredSpecies'] == []


@pytest.mark.parametrize('budget', [-1, 4, 1.5, True])
def test_invalid_budget(tiny, budget):
    with pytest.raises(ValueError, match='Budget'):
        optimize.solve_mclp(*tiny, budget)


def test_infeasible_returns_no_fake_solution(tiny):
    c, s, a, _ = tiny
    for row in a.values():
        row['newt'] = 0
    with pytest.raises(ValueError, match='Infeasible'):
        optimize.solve_set_covering(c, s, a)


def test_full_representation_is_impossible_with_55_cells():
    from pulp import LpProblem, LpVariable, lpSum, LpMinimize, PULP_CBC_CMD, LpStatus
    cells, species, a, _ = optimize.load_data()
    problem = LpProblem('VerifyLowerBound', LpMinimize)
    x = {c: LpVariable(f'site_{c}', cat='Binary') for c in cells}
    problem += lpSum(x.values())
    problem += lpSum(x.values()) <= 55
    for sp in species:
        problem += lpSum(x[c] for c in cells if a[c][sp]) >= 1
    problem.solve(PULP_CBC_CMD(msg=0, timeLimit=60))
    assert LpStatus[problem.status] == 'Infeasible'


def test_time_limited_incumbent_is_not_presented_as_optimal():
    # PuLP can map a stopped CBC run to status=Optimal while sol_status
    # records that only an integer feasible incumbent was obtained.
    class StoppedProblem:
        status = 1
        sol_status = 2
        def solve(self, solver):
            pass
    with pytest.raises(ValueError, match='No proven optimal'):
        optimize._solve(StoppedProblem())
