from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class PurgedChronologicalSplit(Generic[T]):
    train: list[T]
    validation: list[T]
    test: list[T]


def purged_chronological_split(
    rows: Sequence[T],
    horizon: int = 1,
    train_ratio: float = 0.70,
    validation_ratio: float = 0.15,
) -> PurgedChronologicalSplit[T]:
    """
    Split time-ordered rows into train, validation, and test sets.

    The split preserves chronological order and removes `horizon` rows
    immediately before each validation/test boundary. This prevents a
    training sample's future-looking target from crossing into the next
    evaluation period.
    """
    if horizon < 1:
        raise ValueError("horizon must be at least 1")

    if not 0 < train_ratio < 1:
        raise ValueError("train_ratio must be between 0 and 1")

    if not 0 <= validation_ratio < 1:
        raise ValueError("validation_ratio must be between 0 and 1")

    test_ratio = 1.0 - train_ratio - validation_ratio

    if test_ratio <= 0:
        raise ValueError(
            "train_ratio and validation_ratio must leave data for the test set"
        )

    if len(rows) < 3:
        raise ValueError("at least 3 rows are required for a three-way split")

    train_end = int(len(rows) * train_ratio)
    validation_end = train_end + int(len(rows) * validation_ratio)

    if train_end == 0:
        raise ValueError("train split must contain at least one row")

    if validation_end <= train_end:
        raise ValueError("validation split must contain at least one row")

    if validation_end >= len(rows):
        raise ValueError("test split must contain at least one row")

    validation_start = train_end + horizon
    test_start = validation_end + horizon

    if validation_start >= validation_end:
        raise ValueError(
            "horizon is too large for the validation split"
        )

    if test_start >= len(rows):
        raise ValueError(
            "horizon is too large for the test split"
        )

    return PurgedChronologicalSplit(
        train=list(rows[:train_end]),
        validation=list(rows[validation_start:validation_end]),
        test=list(rows[test_start:]),
    )