from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'service': 'marketpilot-ml', 'status': 'ok'}


def test_model_status_has_no_loaded_models() -> None:
    response = client.get('/api/v1/model/status')
    assert response.status_code == 200
    assert response.json() == {'modelsLoaded': False, 'models': []}
