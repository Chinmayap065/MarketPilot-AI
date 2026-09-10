from dataclasses import dataclass
from typing import Any


FEATURE_NAMES = (
    "close",
    "volume",
    "return_1",
    "log_return_1",
    "sma_10",
    "sma_20",
    "price_to_sma_10",
    "price_to_sma_20",
    "volatility_10",
    "volume_change_1",
    "rsi_14",
)


@dataclass(frozen=True)
class ModelDataset:
    x: list[list[float]]
    y: list[int]
    timestamps: list[str]
    future_timestamps: list[str]


def training_rows_to_model_dataset(
    rows: list[dict[str, Any]],
) -> ModelDataset:
    """
    Convert API TrainingDatasetRow-shaped dictionaries into
    a numerical feature matrix and target vector.

    Feature order is defined by FEATURE_NAMES and must remain stable.
    """
    if not rows:
        raise ValueError("training rows cannot be empty")

    x: list[list[float]] = []
    y: list[int] = []
    timestamps: list[str] = []
    future_timestamps: list[str] = []

    for row_index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"row {row_index} must be an object")

        if "timestamp" not in row:
            raise ValueError(f"row {row_index} is missing timestamp")

        if "futureTimestamp" not in row:
            raise ValueError(f"row {row_index} is missing futureTimestamp")

        if "features" not in row:
            raise ValueError(f"row {row_index} is missing features")

        if "target" not in row:
            raise ValueError(f"row {row_index} is missing target")

        features = row["features"]

        if not isinstance(features, dict):
            raise ValueError(f"row {row_index} features must be an object")

        target = row["target"]

        if target not in (0, 1):
            raise ValueError(f"row {row_index} target must be 0 or 1")

        feature_values: list[float] = []

        for feature_name in FEATURE_NAMES:
            if feature_name not in features:
                raise ValueError(
                    f"row {row_index} is missing feature '{feature_name}'"
                )

            value = features[feature_name]

            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(
                    f"row {row_index} feature '{feature_name}' must be numeric"
                )

            feature_values.append(float(value))

        x.append(feature_values)
        y.append(int(target))
        timestamps.append(str(row["timestamp"]))
        future_timestamps.append(str(row["futureTimestamp"]))

    return ModelDataset(
        x=x,
        y=y,
        timestamps=timestamps,
        future_timestamps=future_timestamps,
    )