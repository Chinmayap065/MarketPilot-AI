import pytest

from app.purged_split import purged_chronological_split


def test_purge_removes_rows_before_validation_and_test() -> None:
    rows = list(range(100))

    result = purged_chronological_split(
        rows,
        horizon=2,
        train_ratio=0.70,
        validation_ratio=0.15,
    )

    assert result.train == list(range(70))
    assert result.validation == list(range(72, 85))
    assert result.test == list(range(87, 100))


def test_purge_preserves_chronological_order() -> None:
    rows = list(range(30))

    result = purged_chronological_split(
        rows,
        horizon=3,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert result.train == list(range(18))
    assert result.validation == list(range(21, 24))
    assert result.test == list(range(27, 30))


def test_purged_rows_do_not_appear_in_any_split() -> None:
    rows = list(range(20))

    result = purged_chronological_split(
        rows,
        horizon=2,
        train_ratio=0.50,
        validation_ratio=0.25,
    )

    combined = result.train + result.validation + result.test

    assert combined == list(range(10)) + list(range(12, 15)) + list(range(17, 20))


def test_input_is_not_mutated() -> None:
    rows = list(range(20))
    original = rows.copy()

    purged_chronological_split(
        rows,
        horizon=2,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert rows == original


def test_custom_horizon_changes_purge_size() -> None:
    rows = list(range(30))

    result = purged_chronological_split(
        rows,
        horizon=4,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert result.train == list(range(18))
    assert result.validation == list(range(22, 24))
    assert result.test == list(range(28, 30))


def test_horizon_must_be_positive() -> None:
    with pytest.raises(ValueError, match="horizon"):
        purged_chronological_split(
            list(range(20)),
            horizon=0,
        )


def test_rejects_too_few_rows() -> None:
    with pytest.raises(ValueError, match="at least 3 rows"):
        purged_chronological_split(
            [1, 2],
            horizon=1,
        )


def test_rejects_invalid_train_ratio() -> None:
    with pytest.raises(ValueError, match="train_ratio"):
        purged_chronological_split(
            list(range(20)),
            train_ratio=0,
        )


def test_rejects_invalid_validation_ratio() -> None:
    with pytest.raises(ValueError, match="validation_ratio"):
        purged_chronological_split(
            list(range(20)),
            train_ratio=0.70,
            validation_ratio=1,
        )


def test_rejects_ratios_that_leave_no_test_data() -> None:
    with pytest.raises(ValueError, match="test set"):
        purged_chronological_split(
            list(range(20)),
            train_ratio=0.80,
            validation_ratio=0.20,
        )