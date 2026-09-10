import math

import pytest

from app.benchmark import benchmark_majority_baseline


def test_benchmark_with_majority_class_one() -> None:
    result = benchmark_majority_baseline(
        y_train=[1, 1, 0, 1],
        y_evaluation=[1, 1, 0, 1],
    )

    assert result.predicted_class == 1
    assert result.predicted_class_probability == pytest.approx(0.75)

    assert result.metrics.accuracy == pytest.approx(0.75)
    assert result.metrics.precision == pytest.approx(0.75)
    assert result.metrics.recall == 1.0
    assert result.metrics.f1 == pytest.approx(0.8571428571)

    expected_log_loss = -(
        math.log(0.75)
        + math.log(0.75)
        + math.log(1 - 0.75)
        + math.log(0.75)
    ) / 4

    assert result.metrics.log_loss == pytest.approx(expected_log_loss)


def test_benchmark_with_majority_class_zero() -> None:
    result = benchmark_majority_baseline(
        y_train=[0, 0, 0, 1],
        y_evaluation=[0, 0, 1, 0],
    )

    assert result.predicted_class == 0
    assert result.predicted_class_probability == pytest.approx(0.75)

    assert result.metrics.accuracy == pytest.approx(0.75)
    assert result.metrics.precision == 0.0
    assert result.metrics.recall == 0.0
    assert result.metrics.f1 == 0.0

    expected_log_loss = -(
        math.log(1 - 0.25)
        + math.log(1 - 0.25)
        + math.log(0.25)
        + math.log(1 - 0.25)
    ) / 4

    assert result.metrics.log_loss == pytest.approx(expected_log_loss)


def test_benchmark_uses_training_labels_only() -> None:
    result = benchmark_majority_baseline(
        y_train=[1, 1, 1, 0],
        y_evaluation=[0, 0, 0, 0, 0],
    )

    assert result.predicted_class == 1
    assert result.predicted_class_probability == pytest.approx(0.75)
    assert result.metrics.accuracy == 0.0


def test_benchmark_does_not_mutate_inputs() -> None:
    y_train = [1, 1, 0, 1]
    y_evaluation = [0, 1, 0]

    original_train = y_train.copy()
    original_evaluation = y_evaluation.copy()

    benchmark_majority_baseline(
        y_train,
        y_evaluation,
    )

    assert y_train == original_train
    assert y_evaluation == original_evaluation


def test_benchmark_rejects_empty_evaluation_labels() -> None:
    with pytest.raises(ValueError, match="at least one evaluation label"):
        benchmark_majority_baseline(
            y_train=[0, 1, 0],
            y_evaluation=[],
        )


def test_benchmark_produces_finite_metrics() -> None:
    result = benchmark_majority_baseline(
        y_train=[1, 1, 0, 1],
        y_evaluation=[0, 1, 0, 1],
    )

    assert math.isfinite(result.metrics.accuracy)
    assert math.isfinite(result.metrics.precision)
    assert math.isfinite(result.metrics.recall)
    assert math.isfinite(result.metrics.f1)
    assert math.isfinite(result.metrics.log_loss)