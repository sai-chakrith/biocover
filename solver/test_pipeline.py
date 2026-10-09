import subprocess
import sys
from pathlib import Path
import pandas as pd

def test_grid_boundaries_filters_and_provenance(tmp_path):
    pd.DataFrame([
        {'gbifID': 1, 'species': 'frog', 'decimalLatitude': 10.0, 'decimalLongitude': 76.2, 'occurrenceStatus': 'PRESENT'},
        {'gbifID': 2, 'species': 'frog', 'decimalLatitude': 10.099, 'decimalLongitude': 76.299, 'occurrenceStatus': 'PRESENT'},
        {'gbifID': 3, 'species': 'toad', 'decimalLatitude': 10.0, 'decimalLongitude': 76.2, 'occurrenceStatus': 'ABSENT'},
        {'gbifID': 4, 'species': 'toad', 'decimalLatitude': 30.0, 'decimalLongitude': 76.2, 'occurrenceStatus': 'PRESENT'},
    ]).to_csv(tmp_path / 'occurrence.txt', sep='\t', index=False)
    subprocess.run([sys.executable, '-B', str(Path(__file__).resolve().parents[1] / 'clean_and_grid.py')], cwd=tmp_path, check=True, capture_output=True)
    records = pd.read_csv(tmp_path / 'cleaned_occurrences.csv')
    assert records.cell_id.tolist() == ['10.0_76.2', '10.0_76.2']
    assert records.gbifID.tolist() == [1, 2]
    cov = pd.read_csv(tmp_path / 'coverage_matrix.csv', index_col=0)
    assert cov.shape == (1, 1)
    assert cov.loc['10.0_76.2', 'frog'] == 1
