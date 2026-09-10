import pytest

from app.dataset import FEATURE_NAMES, training_rows_to_model_dataset


def make_row(
    timestamp: str = "2026-01-01T00:00:00Z",
    future_timestamp: str = "2026-01-02T00:00:00Z",
    target: int = 1,
) -> dict:
    return {
        "timestamp": timestamp,
        "futureTimestamp": future_timestamp,
        "features": {
            "close": 100.0,
            "volume": 1000.0,
            "return_1": 0.01,
            "log_return_1": 0.00995,
            "sma_10": 98.0,
            "sma_20": 96.0,
            "price_to_sma_10": 1.0204,
            "price_to_sma_20": 1.0417,
            "volatility_10": 0.02,
            "volume_change_1": 0.10,
            "rsi_14": 55.0,
        },
        "target": target,
    }


def test_converts_training_row_to_model_dataset() -> None:
    result = training_rows_to_model_dataset(
        [make_row()]
    )

    assert len(result.x) == 1
    assert len(result.x[0]) == len(FEATURE_NAMES)
    assert len(result.y) == 1

    assert result.y == [1]
    assert result.timestamps == ["2026-01-01T00:00:00Z"]
    assert result.future_timestamps == ["2026-01-02T00:00:00Z"]


def test_feature_order_is_stable() -> None:
    row = make_row()

    result = training_rows_to_model_dataset([row])

    expected = [
        100.0,
        1000.0,
        0.01,
        0.00995,
        98.0,
        96.0,
        1.0204,
        1.0417,
        0.02,
        0.10,
        55.0,
    ]

    assert result.x[0] == pytest.approx(expected)


def test_feature_order_does_not_depend_on_dictionary_order() -> None:
    row = make_row()

    row["features"] = {
        "rsi_14": 55.0,
        "volume_change_1": 0.10,
        "volatility_10": 0.02,
        "price_to_sma_20": 1.0417,
        "price_to_sma_10": 1.0204,
        "sma_20": 96.0,
        "sma_10": 98.0,
        "log_return_1": 0.00995,
        "return_1": 0.01,
        "volume": 1000.0,
        "close": 100.0,
    }

    result = training_rows_to_model_dataset([row])

    assert result.x[0] == pytest.approx(
        [
            100.0,
            1000.0,
            0.01,
            0.00995,
            98.0,
            96.0,
            1.0204,
            1.0417,
            0.02,
            0.10,
            55.0,
        ]
    )


def test_converts_multiple_rows_in_order() -> None:
    rows = [
        make_row(
            timestamp="2026-01-01T00:00:00Z",
            future_timestamp="2026-01-02T00:00:00Z",
            target=0,
        ),
        make_row(
            timestamp="2026-01-02T00:00:00Z",
            future_timestamp="2026-01-03T00:00:00Z",
            target=1,
        ),
    ]

    result = training_rows_to_model_dataset(rows)

    assert result.y == [0, 1]
    assert result.timestamps == [
        "2026-01-01T00:00:00Z",
        "2026-01-02T00:00:00Z",
    ]
    assert result.future_timestamps == [
        "2026-01-02T00:00:00Z",
        "2026-01-03T00:00:00Z",
    ]


def test_does_not_mutate_input_rows() -> None:
    row = make_row()
    original = row.copy()
    original["features"] = row["features"].copy()

    training_rows_to_model_dataset([row])

    assert row == original


def test_rejects_empty_rows() -> None:
    with pytest.raises(ValueError, match="training rows cannot be empty"):
        training_rows_to_model_dataset([])


@pytest.mark.parametrize(
    "missing_field",
    [
        "timestamp",
        "futureTimestamp",
        "features",
        "target",
    ],
)
def test_rejects_missing_top_level_fields(missing_field: str) -> None:
    row = make_row()
    del row[missing_field]

    with pytest.raises(ValueError, match="missing"):
        training_rows_to_model_dataset([row])


def test_rejects_non_object_features() -> None:
    row = make_row()
    row["features"] = []

    with pytest.raises(ValueError, match="features must be an object"):
        training_rows_to_model_dataset([row])


def test_rejects_invalid_target() -> None:
    row = make_row(target=2)

    with pytest.raises(ValueError, match="target must be 0 or 1"):
        training_rows_to_model_dataset([row])


def test_rejects_missing_feature() -> None:
    row = make_row()
    del row["features"]["rsi_14"]

    with pytest.raises(ValueError, match="rsi_14"):
        training_rows_to_model_dataset([row])


def test_rejects_non_numeric_feature() -> None:
    row = make_row()
    row["features"]["close"] = "100"

    with pytest.raises(ValueError, match="close.*numeric"):
        training_rows_to_model_dataset([row])


def test_rejects_boolean_feature() -> None:
    row = make_row()
    row["features"]["close"] = True

    with pytest.raises(ValueError, match="close.*numeric"):
        training_rows_to_model_dataset([row])