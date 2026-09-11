from datetime import datetime

import pytest

from app.inference import (
    InferencePrediction,
    load_inference_artifact,
    predict_from_artifact,
    predict_from_artifact_path,
)
from app.logistic_model import LogisticRegressionModel
from app.model_artifact import build_model_artifact, save_model_artifact


def make_training_data() -> tuple[list[list[float]], list[int]]:
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

    return x, y


def make_artifact():
    x, y = make_training_data()

    model = LogisticRegressionModel()
    model.fit(x, y)

    return build_model_artifact(
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


def test_predict_from_artifact_returns_prediction() -> None:
    artifact = make_artifact()

    prediction = predict_from_artifact(
        artifact,
        [21.0, 42.0, 2.1, 0.21],
    )

    assert isinstance(prediction, InferencePrediction)
    assert prediction.predicted_class in (0, 1)
    assert 0.0 <= prediction.probability <= 1.0


def test_predict_from_artifact_returns_model_metadata() -> None:
    artifact = make_artifact()

    prediction = predict_from_artifact(
        artifact,
        [21.0, 42.0, 2.1, 0.21],
    )

    assert prediction.model_name == "logistic_regression"
    assert prediction.model_version == "v1"
    assert prediction.horizon == 1


def test_predict_from_artifact_rejects_wrong_feature_count() -> None:
    artifact = make_artifact()

    with pytest.raises(
        ValueError,
        match="feature count does not match",
    ):
        predict_from_artifact(
            artifact,
            [21.0, 42.0, 2.1],
        )


def test_predict_from_artifact_rejects_extra_features() -> None:
    artifact = make_artifact()

    with pytest.raises(
        ValueError,
        match="feature count does not match",
    ):
        predict_from_artifact(
            artifact,
            [21.0, 42.0, 2.1, 0.21, 5.0],
        )


def test_load_inference_artifact_loads_saved_artifact(
    tmp_path,
) -> None:
    artifact = make_artifact()

    artifact_path = (
        tmp_path
        / "models"
        / "logistic_regression_v1.joblib"
    )

    save_model_artifact(
        artifact,
        artifact_path,
    )

    loaded_artifact = load_inference_artifact(
        str(artifact_path),
    )

    assert loaded_artifact.metadata.model_name == (
        "logistic_regression"
    )
    assert loaded_artifact.metadata.model_version == "v1"
    assert loaded_artifact.metadata.feature_names == [
        "feature_0",
        "feature_1",
        "feature_2",
        "feature_3",
    ]
    assert loaded_artifact.metadata.horizon == 1
    assert loaded_artifact.model.is_fitted is True


def test_predict_from_artifact_path_loads_and_predicts(
    tmp_path,
) -> None:
    artifact = make_artifact()

    artifact_path = (
        tmp_path
        / "models"
        / "logistic_regression_v1.joblib"
    )

    save_model_artifact(
        artifact,
        artifact_path,
    )

    prediction = predict_from_artifact_path(
        str(artifact_path),
        [21.0, 42.0, 2.1, 0.21],
    )

    assert prediction.predicted_class in (0, 1)
    assert 0.0 <= prediction.probability <= 1.0
    assert prediction.model_name == "logistic_regression"
    assert prediction.model_version == "v1"
    assert prediction.horizon == 1


def test_load_inference_artifact_rejects_missing_artifact(
    tmp_path,
) -> None:
    artifact_path = (
        tmp_path
        / "models"
        / "missing.joblib"
    )

    with pytest.raises(
        FileNotFoundError,
        match="model artifact does not exist",
    ):
        load_inference_artifact(
            str(artifact_path),
        )