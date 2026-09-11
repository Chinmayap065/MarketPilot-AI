from datetime import datetime, timedelta, timezone

import pytest

from app.dataset import ModelDataset
from app.training_pipeline import train_and_evaluate


def make_dataset() -> tuple[list[list[float]], list[int]]:
    x = [
        [0.0, 0.0],
        [1.0, 0.5],
        [2.0, 1.0],
        [3.0, 1.5],
        [4.0, 2.0],
        [5.0, 2.5],
        [6.0, 3.0],
        [7.0, 3.5],
        [8.0, 4.0],
        [9.0, 4.5],
        [10.0, 5.0],
        [11.0, 5.5],
        [12.0, 6.0],
        [13.0, 6.5],
        [14.0, 7.0],
        [15.0, 7.5],
        [16.0, 8.0],
        [17.0, 8.5],
        [18.0, 9.0],
        [19.0, 9.5],
    ]

    y = [0, 1] * 10

    return x, y


def make_walk_forward_dataset() -> tuple[list[list[float]], list[int]]:
    x = [
        [float(index), float(index % 5)]
        for index in range(40)
    ]

    y = [
        0 if index % 2 == 0 else 1
        for index in range(40)
    ]

    return x, y


def make_model_dataset(
    x: list[list[float]],
    y: list[int],
) -> ModelDataset:
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)

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


def test_training_pipeline_returns_fitted_model() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=1,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.model.is_fitted is True


def test_training_pipeline_uses_purged_split() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=2,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.split.train
    assert result.split.validation
    assert result.split.test

    assert min(result.split.validation) == max(result.split.train) + 3
    assert min(result.split.test) == max(result.split.validation) + 3


def test_training_pipeline_produces_finite_validation_metrics() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.validation.accuracy == result.validation.accuracy
    assert result.validation.precision == result.validation.precision
    assert result.validation.recall == result.validation.recall
    assert result.validation.f1 == result.validation.f1
    assert result.validation.log_loss == result.validation.log_loss


def test_training_pipeline_produces_finite_test_metrics() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.test.accuracy == result.test.accuracy
    assert result.test.precision == result.test.precision
    assert result.test.recall == result.test.recall
    assert result.test.f1 == result.test.f1
    assert result.test.log_loss == result.test.log_loss


def test_model_produces_probabilities_for_validation_and_test() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    validation_probabilities = result.model.predict_probability(
        [dataset.x[index] for index in result.split.validation]
    )

    test_probabilities = result.model.predict_probability(
        [dataset.x[index] for index in result.split.test]
    )

    assert len(validation_probabilities) == len(result.split.validation)
    assert len(test_probabilities) == len(result.split.test)

    assert all(
        0.0 <= probability <= 1.0
        for probability in validation_probabilities
    )
    assert all(
        0.0 <= probability <= 1.0
        for probability in test_probabilities
    )


def test_baseline_is_evaluated_on_same_test_partition() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.baseline_test.metrics.accuracy >= 0.0
    assert result.baseline_test.metrics.precision >= 0.0
    assert result.baseline_test.metrics.recall >= 0.0
    assert result.baseline_test.metrics.f1 >= 0.0
    assert result.baseline_test.metrics.log_loss >= 0.0


def test_training_does_not_use_test_labels_for_model_fitting() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result_one = train_and_evaluate(dataset)

    modified_y = list(y)

    for index in result_one.split.test:
        modified_y[index] = 1 - modified_y[index]

    modified_dataset = make_model_dataset(x, modified_y)

    result_two = train_and_evaluate(modified_dataset)

    assert result_two.validation == result_one.validation


def test_training_pipeline_does_not_run_walk_forward_by_default() -> None:
    x, y = make_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.walk_forward is None


def test_training_pipeline_can_run_walk_forward_evaluation() -> None:
    x, y = make_walk_forward_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=1,
        run_walk_forward=True,
        walk_forward_initial_train_size=10,
        walk_forward_test_size=5,
        walk_forward_step_size=5,
    )

    assert result.walk_forward is not None
    assert len(result.walk_forward.windows) == 5
    assert len(result.walk_forward.predictions) == 25
    assert len(result.walk_forward.probabilities) == 25
    assert len(result.walk_forward.actuals) == 25


def test_training_pipeline_walk_forward_uses_requested_configuration() -> None:
    x, y = make_walk_forward_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        horizon=2,
        run_walk_forward=True,
        walk_forward_initial_train_size=10,
        walk_forward_test_size=4,
        walk_forward_step_size=4,
    )

    assert result.walk_forward is not None

    assert result.walk_forward.windows[0].train_start == 0
    assert result.walk_forward.windows[0].train_end == 10
    assert result.walk_forward.windows[0].test_start == 12
    assert result.walk_forward.windows[0].test_end == 16

    for window in result.walk_forward.windows:
        assert window.test_start - window.train_end == 2


def test_training_pipeline_walk_forward_produces_metrics() -> None:
    x, y = make_walk_forward_dataset()
    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(
        dataset,
        run_walk_forward=True,
        walk_forward_initial_train_size=10,
        walk_forward_test_size=5,
        walk_forward_step_size=5,
    )

    assert result.walk_forward is not None

    assert 0.0 <= result.walk_forward.metrics.accuracy <= 1.0
    assert 0.0 <= result.walk_forward.metrics.precision <= 1.0
    assert 0.0 <= result.walk_forward.metrics.recall <= 1.0
    assert 0.0 <= result.walk_forward.metrics.f1 <= 1.0
    assert result.walk_forward.metrics.log_loss >= 0.0

    assert 0.0 <= result.walk_forward.baseline.metrics.accuracy <= 1.0
    assert result.walk_forward.baseline.metrics.log_loss >= 0.0


def test_training_pipeline_rejects_empty_dataset() -> None:
    dataset = ModelDataset(
        x=[],
        y=[],
        timestamps=[],
        future_timestamps=[],
    )

    with pytest.raises(ValueError, match="cannot be empty"):
        train_and_evaluate(dataset)


def test_training_pipeline_rejects_mismatched_features_and_labels() -> None:
    dataset = ModelDataset(
        x=[
            [1.0],
            [2.0],
        ],
        y=[0],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="feature and target lengths"):
        train_and_evaluate(dataset)


def test_training_pipeline_rejects_dataset_that_cannot_form_valid_classes() -> None:
    x = [[float(index)] for index in range(20)]
    y = [1] * 20

    dataset = make_model_dataset(x, y)

    with pytest.raises(ValueError, match="both classes"):
        train_and_evaluate(dataset)


def test_training_pipeline_rejects_invalid_dataset() -> None:
    x, y = make_dataset()

    dataset = make_model_dataset(x, y)

    invalid_dataset = ModelDataset(
        x=dataset.x,
        y=dataset.y,
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            *dataset.timestamps[3:],
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            *dataset.future_timestamps[3:],
        ],
    )

    with pytest.raises(ValueError, match="strictly chronological"):
        train_and_evaluate(invalid_dataset)


def test_training_pipeline_rejects_non_finite_features() -> None:
    x, y = make_dataset()

    x[0][0] = float("nan")

    dataset = make_model_dataset(x, y)

    with pytest.raises(ValueError, match="must be finite"):
        train_and_evaluate(dataset)


def test_training_pipeline_uses_dataset_targets() -> None:
    x, y = make_dataset()

    dataset = make_model_dataset(x, y)

    result = train_and_evaluate(dataset)

    assert result.split.train
    assert result.split.validation
    assert result.split.test