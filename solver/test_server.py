from fastapi.testclient import TestClient
import server

client = TestClient(server.app)

def test_health_and_csv_data():
    assert client.get('/health').json()['species'] == 220
    assert len(client.get('/cells').json()) == 759
    status = client.get('/data/status').json()
    assert status['recordCount'] == 9226
    assert status['minReserves'] == 56

def test_repeat_solve_has_same_complete_schema():
    body = {'model': 'mclp', 'budget': 20}
    first = client.post('/solve', json=body)
    second = client.post('/solve', json=body)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    for key in ['uncoveredSpecies', 'cellDetails', 'status', 'model', 'dataVersion']:
        assert key in second.json()

def test_bad_requests():
    for body in [{'model':'mclp','budget':-1}, {'model':'mclp','budget':1.5},
                 {'model':'mclp','budget':True}, {'model':'wrong'}]:
        assert client.post('/solve', json=body).status_code == 422
    assert client.post('/solve', json={'model':'mclp'}).status_code == 400
    assert client.get('/coverage-curve?max_budget=101').status_code == 422

def test_sensitivity_reports_excluded_species():
    rows = client.get('/sensitivity').json()
    assert [r['speciesCount'] for r in rows] == [220, 162, 125, 85]
    for row in rows:
        assert row['speciesCount'] + len(row['excludedSpecies']) == 220
