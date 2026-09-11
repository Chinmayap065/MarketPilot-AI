from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.inference import predict_from_artifact
from app.logistic_model import LogisticRegressionModel
from app.model_artifact import build_model_artifact

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

    start = datetime(
        2026,
        1,
        1,
        9,
        15,
        tzinfo=timezone.utc,
    )

    for index in range(count):
        timestamp = start + timedelta(days=index)
        future_timestamp = start + timedelta(days=index + 1)

        rows.append(
            make_valid_row(
                timestamp=timestamp.isoformat(),
                future_timestamp=future_timestamp.isoformat(),
                target=index % 2,
            )
        )

    return rows


def make_prediction_artifact(tmp_path):
    x = []
    y = []

    for index in range(20):
        value = float(index + 1)

        x.append(
            [
                value,
                value * 2.0,
                value / 10.0,
                value / 100.0,
            ]
        )

        y.append(index % 2)

    model = LogisticRegressionModel()
    model.fit(x, y)

    artifact = build_model_artifact(
        model,
        model_name="logistic_regression",
        model_version="v1",
        feature_names=[
            "feature_0",
            "feature_1",
            "feature_2",
            "feature_3",
        ],
        horizon=1,
        trained_at=datetime(2025, 1, 1),
    )

    artifact_path = tmp_path / "model.joblib"

    from app.model_artifact import save_model_artifact

    save_model_artifact(
        artifact,
        artifact_path,
    )

    return artifact_path


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

    assert "walkForward" not in body


def test_train_model_can_run_walk_forward_evaluation() -> None:
    rows = make_training_rows(30)

    response = client.post(
        "/api/v1/models/train",
        json={
            "rows": rows,
            "horizon": 1,
            "trainRatio": 0.70,
            "validationRatio": 0.15,
            "runWalkForward": True,
            "walkForwardInitialTrainSize": 20,
            "walkForwardTestSize": 5,
            "walkForwardStepSize": 5,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert "walkForward" in body

    walk_forward = body["walkForward"]

    assert set(walk_forward["metrics"]) == {
        "accuracy",
        "precision",
        "recall",
        "f1",
        "logLoss",
    }

    assert set(walk_forward["baseline"]) == {
        "metrics",
        "predictedClass",
        "predictedClassProbability",
    }

    assert walk_forward["windowCount"] == 1
    assert walk_forward["predictionCount"] == 5

    assert walk_forward["windows"] == [
        {
            "trainStart": 0,
            "trainEnd": 20,
            "testStart": 21,
            "testEnd": 26,
        }
    ]


def test_train_model_walk_forward_uses_multiple_windows() -> None:
    rows = make_training_rows(40)

    response = client.post(
        "/api/v1/models/train",
        json={
            "rows": rows,
            "runWalkForward": True,
            "walkForwardInitialTrainSize": 20,
            "walkForwardTestSize": 5,
            "walkForwardStepSize": 5,
        },
    )

    assert response.status_code == 200

    walk_forward = response.json()["walkForward"]

    assert walk_forward["windowCount"] == 3
    assert walk_forward["predictionCount"] == 15

    assert walk_forward["windows"] == [
        {
            "trainStart": 0,
            "trainEnd": 20,
            "testStart": 21,
            "testEnd": 26,
        },
        {
            "trainStart": 0,
            "trainEnd": 25,
            "testStart": 26,
            "testEnd": 31,
        },
        {
            "trainStart": 0,
            "trainEnd": 30,
            "testStart": 31,
            "testEnd": 36,
        },
    ]


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

    start = datetime(
        2026,
        2,
        1,
        9,
        15,
        tzinfo=timezone.utc,
    )

    for index in range(20):
        timestamp = start + timedelta(days=index)
        future_timestamp = start + timedelta(days=index + 1)

        rows.append(
            make_valid_row(
                timestamp=timestamp.isoformat(),
                future_timestamp=future_timestamp.isoformat(),
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


def test_predict_model_returns_prediction(
    tmp_path,
) -> None:
    artifact_path = make_prediction_artifact(tmp_path)

    response = client.post(
        "/api/v1/models/predict",
        json={
            "artifactPath": str(artifact_path),
            "features": [
                21.0,
                42.0,
                2.1,
                0.21,
            ],
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["predictedClass"] in (0, 1)
    assert 0.0 <= body["probability"] <= 1.0
    assert body["model"] == {
        "name": "logistic_regression",
        "version": "v1",
    }
    assert body["horizon"] == 1


def test_predict_model_rejects_wrong_feature_count(
    tmp_path,
) -> None:
    artifact_path = make_prediction_artifact(tmp_path)

    response = client.post(
        "/api/v1/models/predict",
        json={
            "artifactPath": str(artifact_path),
            "features": [
                21.0,
                42.0,
                2.1,
            ],
        },
    )

    assert response.status_code == 400
    assert "feature count does not match" in response.json()["detail"]


def test_predict_model_rejects_missing_artifact(
    tmp_path,
) -> None:
    artifact_path = tmp_path / "missing.joblib"

    response = client.post(
        "/api/v1/models/predict",
        json={
            "artifactPath": str(artifact_path),
            "features": [
                21.0,
                42.0,
                2.1,
                0.21,
            ],
        },
    )

    assert response.status_code == 400
    assert "model artifact does not exist" in response.json()["detail"]


def test_predict_model_rejects_empty_features(
    tmp_path,
) -> None:
    artifact_path = tmp_path / "model.joblib"

    response = client.post(
        "/api/v1/models/predict",
        json={
            "artifactPath": str(artifact_path),
            "features": [],
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "prediction features cannot be empty",
    }


def test_predict_model_rejects_empty_artifact_path() -> None:
    response = client.post(
        "/api/v1/models/predict",
        json={
            "artifactPath": "",
            "features": [
                21.0,
                42.0,
                2.1,
                0.21,
            ],
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "artifact path cannot be empty",
    }