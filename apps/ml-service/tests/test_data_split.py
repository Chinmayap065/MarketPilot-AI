import pytest

from app.data_split import chronological_split


def test_split_preserves_chronological_order() -> None:
    rows = list(range(100))

    result = chronological_split(rows)

    assert result.train == list(range(70))
    assert result.validation == list(range(70, 85))
    assert result.test == list(range(85, 100))


def test_split_preserves_all_rows_exactly_once() -> None:
    rows = list(range(20))

    result = chronological_split(
        rows,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    combined = result.train + result.validation + result.test

    assert combined == rows
    assert len(combined) == len(rows)


def test_custom_ratios_are_respected() -> None:
    rows = list(range(100))

    result = chronological_split(
        rows,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert len(result.train) == 60
    assert len(result.validation) == 20
    assert len(result.test) == 20


def test_input_is_not_mutated() -> None:
    rows = list(range(10))
    original = rows.copy()

    chronological_split(
        rows,
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert rows == original


def test_rejects_invalid_train_ratio() -> None:
    with pytest.raises(ValueError, match="train_ratio"):
        chronological_split(
            list(range(10)),
            train_ratio=0,
            validation_ratio=0.20,
        )


def test_rejects_invalid_validation_ratio() -> None:
    with pytest.raises(ValueError, match="validation_ratio"):
        chronological_split(
            list(range(10)),
            train_ratio=0.70,
            validation_ratio=1,
        )


def test_rejects_ratios_that_leave_no_test_data() -> None:
    with pytest.raises(ValueError, match="test set"):
        chronological_split(
            list(range(10)),
            train_ratio=0.80,
            validation_ratio=0.20,
        )


def test_rejects_too_few_rows() -> None:
    with pytest.raises(ValueError, match="at least 3 rows"):
        chronological_split(
            [1, 2],
            train_ratio=0.60,
            validation_ratio=0.20,
        )


def test_rejects_empty_rows() -> None:
    with pytest.raises(ValueError, match="at least 3 rows"):
        chronological_split([])


def test_split_works_with_non_numeric_rows() -> None:
    rows = [
        {"timestamp": "2026-01-01", "target": 0},
        {"timestamp": "2026-01-02", "target": 1},
        {"timestamp": "2026-01-03", "target": 0},
        {"timestamp": "2026-01-04", "target": 1},
        {"timestamp": "2026-01-05", "target": 1},
        {"timestamp": "2026-01-06", "target": 0},
    ]

    result = chronological_split(
        rows,
        train_ratio=0.50,
        validation_ratio=0.25,
    )

    assert result.train == rows[:3]
    assert result.validation == rows[3:4]
    assert result.test == rows[4:]