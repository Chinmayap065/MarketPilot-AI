from dataclasses import dataclass
from math import log


@dataclass(frozen=True)
class ClassificationMetrics:
    accuracy: float
    precision: float
    recall: float
    f1: float
    log_loss: float


def _validate_inputs(
    y_true: list[int],
    y_pred: list[int],
    y_probability: list[float],
) -> None:
    if not y_true:
        raise ValueError("at least one prediction is required")

    if len(y_true) != len(y_pred) or len(y_true) != len(y_probability):
        raise ValueError("all prediction inputs must have the same length")

    if any(value not in (0, 1) for value in y_true):
        raise ValueError("y_true values must be 0 or 1")

    if any(value not in (0, 1) for value in y_pred):
        raise ValueError("y_pred values must be 0 or 1")

    if any(not 0 <= value <= 1 for value in y_probability):
        raise ValueError("probabilities must be between 0 and 1")


def classification_metrics(
    y_true: list[int],
    y_pred: list[int],
    y_probability: list[float],
) -> ClassificationMetrics:
    """
    Calculate binary classification metrics.

    y_probability contains the predicted probability of class 1.
    """

    _validate_inputs(y_true, y_pred, y_probability)

    true_positives = sum(
        actual == 1 and predicted == 1
        for actual, predicted in zip(y_true, y_pred)
    )
    false_positives = sum(
        actual == 0 and predicted == 1
        for actual, predicted in zip(y_true, y_pred)
    )
    false_negatives = sum(
        actual == 1 and predicted == 0
        for actual, predicted in zip(y_true, y_pred)
    )

    correct = sum(
        actual == predicted
        for actual, predicted in zip(y_true, y_pred)
    )

    accuracy = correct / len(y_true)

    precision_denominator = true_positives + false_positives
    precision = (
        true_positives / precision_denominator
        if precision_denominator > 0
        else 0.0
    )

    recall_denominator = true_positives + false_negatives
    recall = (
        true_positives / recall_denominator
        if recall_denominator > 0
        else 0.0
    )

    f1_denominator = precision + recall
    f1 = (
        2 * precision * recall / f1_denominator
        if f1_denominator > 0
        else 0.0
    )

    epsilon = 1e-15
    log_loss = -sum(
        actual * log(max(probability, epsilon))
        + (1 - actual) * log(max(1 - probability, epsilon))
        for actual, probability in zip(y_true, y_probability)
    ) / len(y_true)

    return ClassificationMetrics(
        accuracy=accuracy,
        precision=precision,
        recall=recall,
        f1=f1,
        log_loss=log_loss,
    )