from dataclasses import dataclass


@dataclass(frozen=True)
class BaselinePrediction:
    predicted_class: int
    probability: float


def majority_class_baseline(
    y_train: list[int],
) -> BaselinePrediction:
    """
    Build a majority-class baseline from training labels only.

    The returned probability is the observed training frequency of
    the selected majority class.
    """
    if not y_train:
        raise ValueError("at least one training label is required")

    if any(value not in (0, 1) for value in y_train):
        raise ValueError("training labels must be 0 or 1")

    ones = sum(value == 1 for value in y_train)
    zeros = len(y_train) - ones

    if ones >= zeros:
        return BaselinePrediction(
            predicted_class=1,
            probability=ones / len(y_train),
        )

    return BaselinePrediction(
        predicted_class=0,
        probability=zeros / len(y_train),
    )


def predict_baseline(
    y_train: list[int],
    number_of_predictions: int,
) -> tuple[list[int], list[float]]:
    """
    Generate repeated baseline predictions for an evaluation dataset.

    The baseline is fitted using y_train only.

    Probabilities represent the predicted class probability:
    - for predicted class 1, probability is P(class=1)
    - for predicted class 0, probability is P(class=0)
    """
    if number_of_predictions < 1:
        raise ValueError("number_of_predictions must be at least 1")

    baseline = majority_class_baseline(y_train)

    predictions = [baseline.predicted_class] * number_of_predictions
    probabilities = [baseline.probability] * number_of_predictions

    return predictions, probabilities