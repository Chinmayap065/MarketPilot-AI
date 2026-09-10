import math

import pytest

from app.training_pipeline import train_and_evaluate


def make_dataset() -> tuple[list[list[float]], list[int]]:
    x: list[list[float]] = []
    y: list[int] = []

    for index in range(100):
        feature = float(index)

        x.append(
            [
                feature,
                feature * 0.5,
            ]
        )

        y.append(1 if index >= 50 else 0)

    return x, y


def test_training_pipeline_returns_fitted_model() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(
        x,
        y,
        horizon=1,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.model.is_fitted is True


def test_training_pipeline_uses_purged_split() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(
        x,
        y,
        horizon=2,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.split.train == list(range(70))
    assert result.split.validation == list(range(72, 85))
    assert result.split.test == list(range(87, 100))


def test_training_pipeline_produces_finite_validation_metrics() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(x, y)

    assert math.isfinite(result.validation.accuracy)
    assert math.isfinite(result.validation.precision)
    assert math.isfinite(result.validation.recall)
    assert math.isfinite(result.validation.f1)
    assert math.isfinite(result.validation.log_loss)


def test_training_pipeline_produces_finite_test_metrics() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(x, y)

    assert math.isfinite(result.test.accuracy)
    assert math.isfinite(result.test.precision)
    assert math.isfinite(result.test.recall)
    assert math.isfinite(result.test.f1)
    assert math.isfinite(result.test.log_loss)


def test_model_produces_probabilities_for_validation_and_test() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(x, y)

    validation_predictions = result.model.predict(
        x[result.split.validation[0]:result.split.validation[-1] + 1]
    )

    validation_probabilities = result.model.predict_probability(
        x[result.split.validation[0]:result.split.validation[-1] + 1]
    )

    assert len(validation_predictions) == len(validation_probabilities)
    assert all(prediction in (0, 1) for prediction in validation_predictions)
    assert all(0.0 <= probability <= 1.0 for probability in validation_probabilities)


def test_baseline_is_evaluated_on_same_test_partition() -> None:
    x, y = make_dataset()

    result = train_and_evaluate(x, y)

    assert result.baseline_test.metrics.accuracy >= 0.0
    assert result.baseline_test.metrics.accuracy <= 1.0
    assert result.baseline_test.metrics.log_loss >= 0.0


def test_training_does_not_use_test_labels_for_model_fitting() -> None:
    x, y = make_dataset()

    result_one = train_and_evaluate(x, y)

    modified_y = y.copy()

    for index in result_one.split.test:
        modified_y[index] = 1 - modified_y[index]

    result_two = train_and_evaluate(x, modified_y)

    assert result_one.validation.accuracy == pytest.approx(
        result_two.validation.accuracy
    )
    assert result_one.validation.log_loss == pytest.approx(
        result_two.validation.log_loss
    )


def test_rejects_empty_dataset() -> None:
    with pytest.raises(ValueError, match="dataset cannot be empty"):
        train_and_evaluate([], [])


def test_rejects_mismatched_features_and_labels() -> None:
    with pytest.raises(ValueError, match="same length"):
        train_and_evaluate(
            [[1.0], [2.0]],
            [0],
        )


def test_rejects_dataset_that_cannot_form_valid_classes() -> None:
    x = [[float(index)] for index in range(20)]
    y = [1] * 20

    with pytest.raises(ValueError, match="both classes"):
        train_and_evaluate(x, y)