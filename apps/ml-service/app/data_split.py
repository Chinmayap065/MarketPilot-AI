from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class ChronologicalSplit(Generic[T]):
    train: list[T]
    validation: list[T]
    test: list[T]


def chronological_split(
    rows: Sequence[T],
    train_ratio: float = 0.70,
    validation_ratio: float = 0.15,
) -> ChronologicalSplit[T]:
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

    return ChronologicalSplit(
        train=list(rows[:train_end]),
        validation=list(rows[train_end:validation_end]),
        test=list(rows[validation_end:]),
    )