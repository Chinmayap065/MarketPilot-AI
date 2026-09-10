from datetime import datetime

from app.dataset import ModelDataset


def validate_model_dataset(dataset: ModelDataset) -> None:
    """Validate the structural and temporal integrity of a model dataset."""

    if not dataset.x:
        raise ValueError("model dataset cannot be empty")

    if len(dataset.x) != len(dataset.y):
        raise ValueError("feature and target lengths must match")

    if len(dataset.x) != len(dataset.timestamps):
        raise ValueError("feature and timestamp lengths must match")

    if len(dataset.x) != len(dataset.future_timestamps):
        raise ValueError("feature and future timestamp lengths must match")

    if not dataset.x[0]:
        raise ValueError("model dataset must contain at least one feature")

    feature_count = len(dataset.x[0])

    for row_index, features in enumerate(dataset.x):
        if len(features) != feature_count:
            raise ValueError(
                f"feature row {row_index} has inconsistent feature count"
            )

        for feature_index, value in enumerate(features):
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError(
                    f"feature value at row {row_index}, column {feature_index} "
                    "must be numeric"
                )

            if value != value or value in (float("inf"), float("-inf")):
                raise ValueError(
                    f"feature value at row {row_index}, column {feature_index} "
                    "must be finite"
                )

    for row_index, target in enumerate(dataset.y):
        if target not in (0, 1):
            raise ValueError(
                f"target at row {row_index} must be 0 or 1"
            )

    parsed_timestamps: list[datetime] = []
    parsed_future_timestamps: list[datetime] = []

    for row_index, (timestamp, future_timestamp) in enumerate(
        zip(dataset.timestamps, dataset.future_timestamps)
    ):
        try:
            parsed_timestamp = datetime.fromisoformat(
                timestamp.replace("Z", "+00:00")
            )
        except ValueError as error:
            raise ValueError(
                f"invalid timestamp at row {row_index}: {timestamp}"
            ) from error

        try:
            parsed_future_timestamp = datetime.fromisoformat(
                future_timestamp.replace("Z", "+00:00")
            )
        except ValueError as error:
            raise ValueError(
                f"invalid future timestamp at row {row_index}: "
                f"{future_timestamp}"
            ) from error

        if parsed_future_timestamp <= parsed_timestamp:
            raise ValueError(
                f"future timestamp must be after timestamp at row {row_index}"
            )

        parsed_timestamps.append(parsed_timestamp)
        parsed_future_timestamps.append(parsed_future_timestamp)

    for index in range(1, len(parsed_timestamps)):
        if parsed_timestamps[index] <= parsed_timestamps[index - 1]:
            raise ValueError(
                "dataset timestamps must be strictly chronological "
                "with no duplicates"
            )