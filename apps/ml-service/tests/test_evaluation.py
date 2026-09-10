import math

import pytest

from app.evaluation import classification_metrics


def test_classification_metrics_for_perfect_predictions() -> None:
    result = classification_metrics(
        y_true=[0, 1, 0, 1],
        y_pred=[0, 1, 0, 1],
        y_probability=[0.1, 0.9, 0.2, 0.8],
    )

    assert result.accuracy == 1.0
    assert result.precision == 1.0
    assert result.recall == 1.0
    assert result.f1 == 1.0
    assert result.log_loss > 0


def test_classification_metrics_calculate_expected_values() -> None:
    result = classification_metrics(
        y_true=[1, 1, 0, 0],
        y_pred=[1, 0, 1, 0],
        y_probability=[0.8, 0.4, 0.6, 0.2],
    )

    assert result.accuracy == 0.5
    assert result.precision == 0.5
    assert result.recall == 0.5
    assert result.f1 == 0.5

    expected_log_loss = -(
        math.log(0.8)
        + math.log(0.4)
        + math.log(1 - 0.6)
        + math.log(1 - 0.2)
    ) / 4

    assert result.log_loss == pytest.approx(expected_log_loss)


def test_metrics_handle_no_predicted_positive_cases() -> None:
    result = classification_metrics(
        y_true=[0, 0, 1, 0],
        y_pred=[0, 0, 0, 0],
        y_probability=[0.1, 0.2, 0.3, 0.1],
    )

    assert result.precision == 0.0
    assert result.recall == 0.0
    assert result.f1 == 0.0


def test_metrics_handle_no_actual_positive_cases() -> None:
    result = classification_metrics(
        y_true=[0, 0, 0, 0],
        y_pred=[0, 0, 0, 0],
        y_probability=[0.1, 0.2, 0.3, 0.1],
    )

    assert result.accuracy == 1.0
    assert result.precision == 0.0
    assert result.recall == 0.0
    assert result.f1 == 0.0


def test_probabilities_are_used_for_log_loss() -> None:
    confident = classification_metrics(
        y_true=[1, 0],
        y_pred=[1, 0],
        y_probability=[0.99, 0.01],
    )

    uncertain = classification_metrics(
        y_true=[1, 0],
        y_pred=[1, 0],
        y_probability=[0.60, 0.40],
    )

    assert confident.accuracy == uncertain.accuracy
    assert confident.log_loss < uncertain.log_loss


def test_log_loss_is_safe_at_probability_boundaries() -> None:
    result = classification_metrics(
        y_true=[1, 0],
        y_pred=[1, 0],
        y_probability=[1.0, 0.0],
    )

    assert math.isfinite(result.log_loss)


def test_rejects_empty_inputs() -> None:
    with pytest.raises(ValueError, match="at least one prediction"):
        classification_metrics([], [], [])


def test_rejects_mismatched_lengths() -> None:
    with pytest.raises(ValueError, match="same length"):
        classification_metrics(
            y_true=[0, 1],
            y_pred=[0],
            y_probability=[0.2, 0.8],
        )


def test_rejects_invalid_labels() -> None:
    with pytest.raises(ValueError, match="y_true"):
        classification_metrics(
            y_true=[0, 2],
            y_pred=[0, 1],
            y_probability=[0.2, 0.8],
        )


def test_rejects_invalid_predictions() -> None:
    with pytest.raises(ValueError, match="y_pred"):
        classification_metrics(
            y_true=[0, 1],
            y_pred=[0, 2],
            y_probability=[0.2, 0.8],
        )


def test_rejects_invalid_probabilities() -> None:
    with pytest.raises(ValueError, match="probabilities"):
        classification_metrics(
            y_true=[0, 1],
            y_pred=[0, 1],
            y_probability=[0.2, 1.2],
        )