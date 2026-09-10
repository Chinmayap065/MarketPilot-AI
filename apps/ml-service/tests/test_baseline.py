import pytest

from app.baseline import majority_class_baseline, predict_baseline


def test_majority_class_is_one() -> None:
    result = majority_class_baseline([1, 1, 0, 1, 0])

    assert result.predicted_class == 1
    assert result.probability == pytest.approx(0.6)


def test_majority_class_is_zero() -> None:
    result = majority_class_baseline([0, 0, 1, 0, 1])

    assert result.predicted_class == 0
    assert result.probability == pytest.approx(0.6)


def test_tie_prefers_class_one() -> None:
    result = majority_class_baseline([0, 1, 0, 1])

    assert result.predicted_class == 1
    assert result.probability == pytest.approx(0.5)


def test_majority_class_handles_single_label() -> None:
    result = majority_class_baseline([1, 1, 1])

    assert result.predicted_class == 1
    assert result.probability == 1.0


def test_predictions_repeat_majority_class() -> None:
    predictions, probabilities = predict_baseline(
        [1, 1, 0, 1, 0],
        number_of_predictions=4,
    )

    assert predictions == [1, 1, 1, 1]
    assert probabilities == pytest.approx([0.6, 0.6, 0.6, 0.6])


def test_zero_majority_predictions_have_class_zero_probability() -> None:
    predictions, probabilities = predict_baseline(
        [0, 0, 0, 1],
        number_of_predictions=3,
    )

    assert predictions == [0, 0, 0]
    assert probabilities == pytest.approx([0.75, 0.75, 0.75])


def test_baseline_does_not_mutate_training_labels() -> None:
    labels = [1, 1, 0, 1]
    original = labels.copy()

    majority_class_baseline(labels)

    assert labels == original


def test_rejects_empty_training_labels() -> None:
    with pytest.raises(ValueError, match="at least one training label"):
        majority_class_baseline([])


def test_rejects_invalid_training_labels() -> None:
    with pytest.raises(ValueError, match="must be 0 or 1"):
        majority_class_baseline([0, 1, 2])


def test_rejects_invalid_prediction_count() -> None:
    with pytest.raises(ValueError, match="at least 1"):
        predict_baseline([0, 1, 0], number_of_predictions=0)