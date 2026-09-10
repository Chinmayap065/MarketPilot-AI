import pytest

from app.dataset import ModelDataset
from app.dataset_validation import validate_model_dataset
from app.training_pipeline import train_and_evaluate


def make_dataset(
    x: list[list[float]],
    y: list[int],
) -> ModelDataset:
    timestamps = [
        f"2026-01-{index + 1:02d}T00:00:00+00:00"
        for index in range(len(x))
    ]

    future_timestamps = [
        f"2026-01-{index + 2:02d}T00:00:00+00:00"
        for index in range(len(x))
    ]

    return ModelDataset(
        x=x,
        y=y,
        timestamps=timestamps,
        future_timestamps=future_timestamps,
    )


def make_training_data() -> tuple[list[list[float]], list[int]]:
    x = [
        [1.0, 2.0],
        [2.0, 3.0],
        [3.0, 4.0],
        [4.0, 5.0],
        [5.0, 6.0],
        [6.0, 7.0],
        [7.0, 8.0],
        [8.0, 9.0],
        [9.0, 10.0],
        [10.0, 11.0],
        [11.0, 12.0],
        [12.0, 13.0],
        [13.0, 14.0],
        [14.0, 15.0],
        [15.0, 16.0],
        [16.0, 17.0],
        [17.0, 18.0],
        [18.0, 19.0],
        [19.0, 20.0],
        [20.0, 21.0],
    ]

    y = [0, 1] * 10

    return x, y


def test_valid_dataset_passes() -> None:
    dataset = make_dataset(
        [
            [100.0, 1000.0, 0.01],
            [101.0, 1100.0, 0.01],
            [102.0, 1200.0, 0.01],
        ],
        [1, 0, 1],
    )

    validate_model_dataset(dataset)


def test_empty_dataset_is_rejected() -> None:
    dataset = ModelDataset(
        x=[],
        y=[],
        timestamps=[],
        future_timestamps=[],
    )

    with pytest.raises(ValueError, match="cannot be empty"):
        validate_model_dataset(dataset)


def test_feature_target_length_mismatch_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
        ],
        y=[1],
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
        validate_model_dataset(dataset)


def test_timestamp_length_mismatch_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
        ],
        y=[1, 0],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="timestamp lengths"):
        validate_model_dataset(dataset)


def test_future_timestamp_length_mismatch_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
        ],
        y=[1, 0],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="future timestamp lengths"):
        validate_model_dataset(dataset)


def test_empty_feature_row_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="at least one feature"):
        validate_model_dataset(dataset)


def test_inconsistent_feature_count_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0, 0.01],
            [101.0, 1100.0],
            [102.0, 1200.0, 0.01],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="inconsistent feature count"):
        validate_model_dataset(dataset)


def test_non_finite_feature_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, float("nan"), 0.01],
            [101.0, 1100.0, 0.01],
            [102.0, 1200.0, 0.01],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="must be finite"):
        validate_model_dataset(dataset)


def test_infinite_feature_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, float("inf"), 0.01],
            [101.0, 1100.0, 0.01],
            [102.0, 1200.0, 0.01],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="must be finite"):
        validate_model_dataset(dataset)


def test_invalid_target_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 2, 0],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="must be 0 or 1"):
        validate_model_dataset(dataset)


def test_duplicate_timestamps_are_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="strictly chronological"):
        validate_model_dataset(dataset)


def test_out_of_order_timestamps_are_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-01T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-03T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="strictly chronological"):
        validate_model_dataset(dataset)


def test_future_timestamp_must_be_after_timestamp() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 0, 1],
        timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-01T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(
        ValueError,
        match="future timestamp must be after timestamp",
    ):
        validate_model_dataset(dataset)


def test_invalid_timestamp_is_rejected() -> None:
    dataset = ModelDataset(
        x=[
            [100.0, 1000.0],
            [101.0, 1100.0],
            [102.0, 1200.0],
        ],
        y=[1, 0, 1],
        timestamps=[
            "not-a-timestamp",
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
        ],
        future_timestamps=[
            "2026-01-02T00:00:00+00:00",
            "2026-01-03T00:00:00+00:00",
            "2026-01-04T00:00:00+00:00",
        ],
    )

    with pytest.raises(ValueError, match="invalid timestamp"):
        validate_model_dataset(dataset)


def test_training_pipeline_uses_requested_split_ratios() -> None:
    x, y = make_training_data()

    result = train_and_evaluate(
        make_dataset(x, y),
        train_ratio=0.60,
        validation_ratio=0.20,
    )

    assert len(result.split.train) == 12
    assert len(result.split.validation) == 3
    assert len(result.split.test) == 3


def test_training_pipeline_rejects_invalid_dataset() -> None:
    x, y = make_training_data()

    dataset = make_dataset(x, y)

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