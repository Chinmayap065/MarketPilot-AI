from datetime import datetime, timedelta

import pytest

from app.dataset import FEATURE_NAMES, ModelDataset
from app.training_pipeline import train_and_evaluate


def make_dataset(size: int = 40) -> tuple[list[list[float]], list[int]]:
    x = []
    y = []

    for index in range(size):
        value = float(index + 1)
        x.append(
            [
                value,
                value * 10.0,
                value / 10.0,
                value / 100.0,
            ]
        )
        y.append(index % 2)

    return x, y


def make_model_dataset(
    x: list[list[float]],
    y: list[int],
) -> ModelDataset:
    start = datetime(2025, 1, 1)

    timestamps = [
        (start + timedelta(days=index)).isoformat()
        for index in range(len(x))
    ]

    future_timestamps = [
        (start + timedelta(days=index + 1)).isoformat()
        for index in range(len(x))
    ]

    return ModelDataset(
        x=x,
        y=y,
        timestamps=timestamps,
        future_timestamps=future_timestamps,
    )


def test_training_pipeline_returns_model_and_metrics() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.model.is_fitted is True

    assert 0.0 <= result.validation.accuracy <= 1.0
    assert 0.0 <= result.validation.precision <= 1.0
    assert 0.0 <= result.validation.recall <= 1.0
    assert 0.0 <= result.validation.f1 <= 1.0
    assert result.validation.log_loss >= 0.0

    assert 0.0 <= result.test.accuracy <= 1.0
    assert 0.0 <= result.test.precision <= 1.0
    assert 0.0 <= result.test.recall <= 1.0
    assert 0.0 <= result.test.f1 <= 1.0
    assert result.test.log_loss >= 0.0


def test_training_pipeline_returns_baseline_benchmarks() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.baseline_validation is not None
    assert result.baseline_test is not None

    assert 0.0 <= result.baseline_validation.metrics.accuracy <= 1.0
    assert 0.0 <= result.baseline_test.metrics.accuracy <= 1.0


def test_training_pipeline_uses_purged_split() -> None:
    x, y = make_dataset(20)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=1,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert len(result.split.train) == 14
    assert len(result.split.validation) == 2
    assert len(result.split.test) == 2

    assert result.split.train == list(range(14))
    assert result.split.validation == [15, 16]
    assert result.split.test == [18, 19]


def test_training_pipeline_does_not_use_test_labels_for_training() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    test_indices = set(result.split.test)

    for index in test_indices:
        assert index not in result.split.train


def test_training_pipeline_can_run_walk_forward_evaluation() -> None:
    x, y = make_dataset(40)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=1,
        run_walk_forward=True,
        walk_forward_initial_train_size=20,
        walk_forward_test_size=5,
        walk_forward_step_size=5,
    )

    assert result.walk_forward is not None
    assert len(result.walk_forward.windows) > 0
    assert len(result.walk_forward.predictions) > 0
    assert len(result.walk_forward.probabilities) > 0
    assert len(result.walk_forward.actuals) > 0


def test_training_pipeline_walk_forward_is_disabled_by_default() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.walk_forward is None


def test_training_pipeline_passes_horizon_to_purged_split() -> None:
    x, y = make_dataset(30)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=2,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.split.validation[0] == result.split.train[-1] + 3
    assert result.split.test[0] == result.split.validation[-1] + 3


def test_training_pipeline_supports_custom_train_ratio() -> None:
    x, y = make_dataset(40)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert len(result.split.train) == 24


def test_training_pipeline_supports_custom_validation_ratio() -> None:
    x, y = make_dataset(40)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert len(result.split.validation) == 7


def test_training_pipeline_supports_custom_walk_forward_parameters() -> None:
    x, y = make_dataset(50)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        run_walk_forward=True,
        walk_forward_initial_train_size=25,
        walk_forward_test_size=5,
        walk_forward_step_size=5,
    )

    assert result.walk_forward is not None
    assert len(result.walk_forward.windows) > 0


def test_training_pipeline_rejects_invalid_dataset() -> None:
    dataset = ModelDataset(
        x=[],
        y=[],
        timestamps=[],
        future_timestamps=[],
    )

    with pytest.raises(ValueError):
        train_and_evaluate(dataset)


def test_training_pipeline_rejects_invalid_horizon() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    with pytest.raises(ValueError):
        train_and_evaluate(dataset, horizon=0)


def test_training_pipeline_rejects_invalid_train_ratio() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    with pytest.raises(ValueError):
        train_and_evaluate(
            dataset,
            train_ratio=0.0,
        )


def test_training_pipeline_rejects_invalid_validation_ratio() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    with pytest.raises(ValueError):
        train_and_evaluate(
            dataset,
            validation_ratio=0.0,
        )


def test_training_pipeline_model_produces_probabilities() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    probabilities = result.model.predict_probability(
        [x[index] for index in result.split.test]
    )

    assert len(probabilities) == len(result.split.test)

    for probability in probabilities:
        assert 0.0 <= probability <= 1.0


def test_training_pipeline_does_not_use_test_labels_for_baseline_training() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    test_indices = set(result.split.test)

    assert len(test_indices) > 0

    for index in result.split.train:
        assert index not in test_indices


def test_training_pipeline_walk_forward_respects_horizon_purge() -> None:
    x, y = make_dataset(50)
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=2,
        run_walk_forward=True,
        walk_forward_initial_train_size=20,
        walk_forward_test_size=5,
        walk_forward_step_size=5,
    )

    assert result.walk_forward is not None

    for window in result.walk_forward.windows:
        assert window.test_start > window.train_end
        assert window.test_start - window.train_end >= 2


def test_training_pipeline_can_persist_model_artifact(tmp_path) -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    artifact_path = (
        tmp_path
        / "models"
        / "logistic_regression_v1.joblib"
    )

    result = train_and_evaluate(
        dataset,
        artifact_path=str(artifact_path),
        model_name="logistic_regression",
        model_version="v1",
        horizon=1,
    )

    assert artifact_path.exists()
    assert result.artifact is not None
    assert result.artifact.model is result.model
    assert (
        result.artifact.metadata.model_name
        == "logistic_regression"
    )
    assert (
        result.artifact.metadata.model_version
        == "v1"
    )
    assert (
        result.artifact.metadata.feature_names
        == list(FEATURE_NAMES)
    )
    assert result.artifact.metadata.horizon == 1


def test_training_pipeline_does_not_persist_artifact_by_default(
    tmp_path,
) -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    artifact_path = tmp_path / "model.joblib"

    result = train_and_evaluate(dataset)

    assert result.artifact is None
    assert artifact_path.exists() is False