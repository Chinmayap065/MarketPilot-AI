from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def make_valid_row(
    timestamp: str = "2026-01-01T09:15:00+00:00",
    future_timestamp: str = "2026-01-01T09:30:00+00:00",
    target: int = 1,
) -> dict:
    return {
        "timestamp": timestamp,
        "futureTimestamp": future_timestamp,
        "features": {
            "close": 100.0,
            "volume": 1000.0,
            "return_1": 0.01,
            "log_return_1": 0.00995,
            "sma_10": 99.0,
            "sma_20": 98.0,
            "price_to_sma_10": 1.0101,
            "price_to_sma_20": 1.0204,
            "volatility_10": 0.02,
            "volume_change_1": 0.05,
            "rsi_14": 55.0,
        },
        "target": target,
    }


def make_training_rows(count: int = 20) -> list[dict]:
    rows = []

    for index in range(count):
        day = index + 1
        next_day = day + 1

        rows.append(
            make_valid_row(
                timestamp=f"2026-01-{day:02d}T09:15:00+00:00",
                future_timestamp=f"2026-01-{next_day:02d}T09:15:00+00:00",
                target=index % 2,
            )
        )

    return rows


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "marketpilot-ml",
        "status": "ok",
    }


def test_model_status() -> None:
    response = client.get("/api/v1/model/status")

    assert response.status_code == 200
    assert response.json() == {
        "modelsLoaded": False,
        "models": [],
    }


def test_validate_dataset_accepts_valid_rows() -> None:
    rows = [
        make_valid_row(
            timestamp="2026-01-01T09:15:00+00:00",
            future_timestamp="2026-01-01T09:30:00+00:00",
            target=1,
        ),
        make_valid_row(
            timestamp="2026-01-01T09:30:00+00:00",
            future_timestamp="2026-01-01T09:45:00+00:00",
            target=0,
        ),
    ]

    response = client.post(
        "/api/v1/datasets/validate",
        json={"rows": rows},
    )

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "rowCount": 2,
        "featureCount": 11,
        "featureNames": [
            "close",
            "volume",
            "return_1",
            "log_return_1",
            "sma_10",
            "sma_20",
            "price_to_sma_10",
            "price_to_sma_20",
            "volatility_10",
            "volume_change_1",
            "rsi_14",
        ],
    }


def test_validate_dataset_rejects_empty_rows() -> None:
    response = client.post(
        "/api/v1/datasets/validate",
        json={"rows": []},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "dataset rows cannot be empty",
    }


def test_validate_dataset_rejects_invalid_feature_value() -> None:
    row = make_valid_row()
    row["features"]["rsi_14"] = "not-a-number"

    response = client.post(
        "/api/v1/datasets/validate",
        json={"rows": [row]},
    )

    assert response.status_code == 400
    assert "rsi_14" in response.json()["detail"]


def test_validate_dataset_rejects_invalid_target() -> None:
    row = make_valid_row()
    row["target"] = 2

    response = client.post(
        "/api/v1/datasets/validate",
        json={"rows": [row]},
    )

    assert response.status_code == 400
    assert "target" in response.json()["detail"]


def test_validate_dataset_rejects_non_chronological_rows() -> None:
    rows = [
        make_valid_row(
            timestamp="2026-01-01T09:30:00+00:00",
            future_timestamp="2026-01-01T09:45:00+00:00",
        ),
        make_valid_row(
            timestamp="2026-01-01T09:15:00+00:00",
            future_timestamp="2026-01-01T09:30:00+00:00",
        ),
    ]

    response = client.post(
        "/api/v1/datasets/validate",
        json={"rows": rows},
    )

    assert response.status_code == 400
    assert "chronological" in response.json()["detail"]


def test_train_model_returns_training_metrics() -> None:
    rows = make_training_rows()

    response = client.post(
        "/api/v1/models/train",
        json={
            "rows": rows,
            "horizon": 1,
            "trainRatio": 0.70,
            "validationRatio": 0.15,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["trained"] is True
    assert body["model"] == {
        "name": "logistic_regression",
    }
    assert body["horizon"] == 1

    assert body["split"] == {
        "trainRows": 14,
        "validationRows": 2,
        "testRows": 2,
    }

    for partition in ("validation", "test"):
        assert set(body[partition]) == {
            "accuracy",
            "precision",
            "recall",
            "f1",
            "logLoss",
        }

        for metric in body[partition].values():
            assert isinstance(metric, float)
            assert metric == metric

    assert "baseline" in body
    assert "validation" in body["baseline"]
    assert "test" in body["baseline"]
    assert "trainedAt" in body


def test_train_model_rejects_empty_rows() -> None:
    response = client.post(
        "/api/v1/models/train",
        json={"rows": []},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "dataset rows cannot be empty",
    }


def test_train_model_rejects_invalid_horizon() -> None:
    rows = make_training_rows()

    response = client.post(
        "/api/v1/models/train",
        json={
            "rows": rows,
            "horizon": 0,
        },
    )

    assert response.status_code == 400
    assert "horizon" in response.json()["detail"]


def test_train_model_rejects_dataset_with_one_class() -> None:
    rows = []

    for index in range(20):
        day = index + 1
        next_day = day + 1

        rows.append(
            make_valid_row(
                timestamp=f"2026-02-{day:02d}T09:15:00+00:00",
                future_timestamp=f"2026-02-{next_day:02d}T09:15:00+00:00",
                target=1,
            )
        )

    response = client.post(
        "/api/v1/models/train",
        json={
            "rows": rows,
            "horizon": 1,
        },
    )

    assert response.status_code == 400
    assert "both classes" in response.json()["detail"]