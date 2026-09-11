import math

import pytest

from app.walk_forward import walk_forward_evaluate


def make_dataset() -> tuple[list[list[float]], list[int]]:
    x = [
        [float(index), float(index % 5)]
        for index in range(40)
    ]

    y = [
        0 if index % 2 == 0 else 1
        for index in range(40)
    ]

    return x, y


def test_walk_forward_creates_expanding_windows() -> None:
    x, y = make_dataset()

    result = walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=5,
        step_size=5,
    )

    assert len(result.windows) == 5

    assert result.windows[0].train_start == 0
    assert result.windows[0].train_end == 10
    assert result.windows[0].test_start == 11
    assert result.windows[0].test_end == 16

    assert result.windows[1].train_start == 0
    assert result.windows[1].train_end == 15
    assert result.windows[1].test_start == 16
    assert result.windows[1].test_end == 21


def test_walk_forward_preserves_purge_between_training_and_test() -> None:
    x, y = make_dataset()

    result = walk_forward_evaluate(
        x,
        y,
        horizon=3,
        initial_train_size=10,
        test_size=4,
        step_size=4,
    )

    for window in result.windows:
        assert window.test_start - window.train_end == 3


def test_walk_forward_predictions_cover_only_unseen_test_rows() -> None:
    x, y = make_dataset()

    result = walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=5,
        step_size=5,
    )

    assert len(result.predictions) == len(result.probabilities)
    assert len(result.predictions) == len(result.actuals)

    expected_test_rows = len(result.windows) * 5

    assert len(result.predictions) == expected_test_rows
    assert len(result.actuals) == expected_test_rows


def test_walk_forward_returns_valid_probabilities_and_metrics() -> None:
    x, y = make_dataset()

    result = walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=5,
        step_size=5,
    )

    assert all(
        0.0 <= probability <= 1.0
        for probability in result.probabilities
    )

    assert 0.0 <= result.metrics.accuracy <= 1.0
    assert 0.0 <= result.metrics.precision <= 1.0
    assert 0.0 <= result.metrics.recall <= 1.0
    assert 0.0 <= result.metrics.f1 <= 1.0
    assert math.isfinite(result.metrics.log_loss)


def test_walk_forward_produces_majority_baseline() -> None:
    x, y = make_dataset()

    result = walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=5,
        step_size=5,
    )

    assert result.baseline.predicted_class in (0, 1)
    assert 0.0 <= result.baseline.predicted_class_probability <= 1.0
    assert 0.0 <= result.baseline.metrics.accuracy <= 1.0


def test_walk_forward_baseline_is_evaluated_on_out_of_sample_predictions() -> None:
    x = [[float(index)] for index in range(30)]
    y = [0, 1] * 15

    result = walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=4,
        step_size=4,
    )

    expected_test_rows = len(result.windows) * 4

    assert len(result.actuals) == expected_test_rows
    assert result.baseline.metrics.accuracy >= 0.0
    assert result.baseline.metrics.accuracy <= 1.0
    assert result.baseline.metrics.log_loss >= 0.0


def test_walk_forward_does_not_modify_inputs() -> None:
    x, y = make_dataset()

    original_x = [row.copy() for row in x]
    original_y = y.copy()

    walk_forward_evaluate(
        x,
        y,
        horizon=1,
        initial_train_size=10,
        test_size=5,
        step_size=5,
    )

    assert x == original_x
    assert y == original_y


def test_rejects_mismatched_features_and_labels() -> None:
    with pytest.raises(ValueError, match="same length"):
        walk_forward_evaluate(
            [[1.0], [2.0]],
            [0],
        )


def test_rejects_invalid_labels() -> None:
    with pytest.raises(ValueError, match="labels must be 0 or 1"):
        walk_forward_evaluate(
            [[1.0], [2.0], [3.0]],
            [0, 1, 2],
        )


def test_rejects_invalid_horizon() -> None:
    x, y = make_dataset()

    with pytest.raises(ValueError, match="horizon"):
        walk_forward_evaluate(
            x,
            y,
            horizon=0,
        )


def test_rejects_invalid_initial_train_size() -> None:
    x, y = make_dataset()

    with pytest.raises(ValueError, match="initial_train_size"):
        walk_forward_evaluate(
            x,
            y,
            initial_train_size=1,
        )


def test_rejects_invalid_test_size() -> None:
    x, y = make_dataset()

    with pytest.raises(ValueError, match="test_size"):
        walk_forward_evaluate(
            x,
            y,
            test_size=0,
        )


def test_rejects_invalid_step_size() -> None:
    x, y = make_dataset()

    with pytest.raises(ValueError, match="step_size"):
        walk_forward_evaluate(
            x,
            y,
            step_size=0,
        )


def test_rejects_insufficient_rows() -> None:
    with pytest.raises(ValueError, match="not enough rows"):
        walk_forward_evaluate(
            [[1.0], [2.0], [3.0], [4.0]],
            [0, 1, 0, 1],
            horizon=1,
            initial_train_size=3,
            test_size=2,
        )


def test_rejects_training_window_with_one_class() -> None:
    x = [[float(index)] for index in range(20)]
    y = [0] * 10 + [1] * 10

    with pytest.raises(ValueError, match="both classes"):
        walk_forward_evaluate(
            x,
            y,
            horizon=1,
            initial_train_size=5,
            test_size=3,
            step_size=3,
        )