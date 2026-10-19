import pytest
import benchmark


def example():
    # Richest-first takes A, B, C; the minimum is B and C.
    species = ['frog', 'toad', 'newt', 'salamander', 'caecilian', 'treefrog']
    present = {'A': set(species[:4]), 'B': {'frog', 'toad', 'caecilian'},
               'C': {'newt', 'salamander', 'treefrog'}}
    matrix = {c: {s: int(s in names) for s in species} for c, names in present.items()}
    return list(present), species, matrix


def test_greedy_gap_against_known_optimum():
    c, s, a = example()
    result = benchmark.compare(c, s, a)
    assert [row['cellCount'] for row in result['methods']] == [3, 2]
    assert all(row['speciesCovered'] == 6 for row in result['methods'])
    assert result['cellsSaved'] == 1
    assert all(row['elapsedMs'] >= 0 for row in result['methods'])


def test_compulsory_reasons_are_single_cell_species():
    c, s, a = example()
    assert benchmark.compulsory_cells(c, s, a) == [
        {'cellId': 'B', 'species': ['caecilian']}, {'cellId': 'C', 'species': ['treefrog']}]


def test_greedy_ties_use_sorted_ids_not_input_order():
    a = {'B': {'frog': 1}, 'A': {'frog': 1}}
    assert benchmark.greedy_cover(['B', 'A'], ['frog'], a) == ['A']


def test_missing_species_is_not_reported_as_covered():
    with pytest.raises(ValueError, match='no candidate cell'):
        benchmark.greedy_cover(['A'], ['frog'], {'A': {'frog': 0}})
