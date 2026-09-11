from datetime import datetime, timezone

import pytest

from app.logistic_model import LogisticRegressionModel
from app.model_artifact import (
    ModelArtifact,
    build_model_artifact,
    load_model_artifact,
    save_model_artifact,
)


def make_training_data() -> tuple[list[list[float]], list[int]]:
    x_train = [
        [1.0, 10.0],
        [2.0, 11.0],
        [3.0, 12.0],
        [4.0, 13.0],
        [5.0, 14.0],
        [6.0, 15.0],
    ]
    y_train = [0, 0, 0, 1, 1, 1]

    return x_train, y_train


def make_fitted_model() -> LogisticRegressionModel:
    x_train, y_train = make_training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    return model


def test_build_model_artifact_requires_fitted_model() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="unfitted"):
        build_model_artifact(
            model,
            model_name="logistic_regression",
            model_version="v1",
            feature_names=["feature_a", "feature_b"],
            horizon=1,
        )


def test_build_model_artifact_preserves_metadata() -> None:
    model = make_fitted_model()

    trained_at = datetime(
        2026,
        9,
        11,
        12,
        0,
        tzinfo=timezone.utc,
    )

    artifact = build_model_artifact(
        model,
        model_name="logistic_regression",
        model_version="v1",
        feature_names=["feature_a", "feature_b"],
        horizon=1,
        trained_at=trained_at,
    )

    assert isinstance(artifact, ModelArtifact)
    assert artifact.model is model
    assert artifact.metadata.model_name == "logistic_regression"
    assert artifact.metadata.model_version == "v1"
    assert artifact.metadata.feature_names == [
        "feature_a",
        "feature_b",
    ]
    assert artifact.metadata.horizon == 1
    assert artifact.metadata.trained_at == trained_at.isoformat()


def test_save_and_load_model_artifact_preserves_predictions(
    tmp_path,
) -> None:
    model = make_fitted_model()

    artifact = build_model_artifact(
        model,
        model_name="logistic_regression",
        model_version="v1",
        feature_names=["feature_a", "feature_b"],
        horizon=1,
    )

    artifact_path = tmp_path / "models" / "logistic_regression_v1.joblib"

    save_model_artifact(artifact, artifact_path)

    loaded_artifact = load_model_artifact(artifact_path)

    assert loaded_artifact.metadata == artifact.metadata
    assert loaded_artifact.model.is_fitted

    test_features = [
        [1.5, 10.5],
        [5.5, 14.5],
    ]

    assert (
        loaded_artifact.model.predict(test_features)
        == model.predict(test_features)
    )

    assert (
        loaded_artifact.model.predict_probability(test_features)
        == model.predict_probability(test_features)
    )


def test_save_model_artifact_rejects_unfitted_model(tmp_path) -> None:
    model = LogisticRegressionModel()

    artifact = ModelArtifact(
        metadata=build_model_artifact(
            make_fitted_model(),
            model_name="logistic_regression",
            model_version="v1",
            feature_names=["feature_a", "feature_b"],
            horizon=1,
        ).metadata,
        model=model,
    )

    artifact_path = tmp_path / "model.joblib"

    with pytest.raises(ValueError, match="unfitted"):
        save_model_artifact(artifact, artifact_path)


def test_load_model_artifact_rejects_missing_file(tmp_path) -> None:
    artifact_path = tmp_path / "missing.joblib"

    with pytest.raises(FileNotFoundError, match="does not exist"):
        load_model_artifact(artifact_path)


def test_load_model_artifact_rejects_invalid_artifact(tmp_path) -> None:
    import joblib

    artifact_path = tmp_path / "invalid.joblib"

    joblib.dump({"not": "a model artifact"}, artifact_path)

    with pytest.raises(ValueError, match="invalid model artifact"):
        load_model_artifact(artifact_path)