from dataclasses import dataclass

from app.baseline import predict_baseline
from app.evaluation import ClassificationMetrics, classification_metrics


@dataclass(frozen=True)
class BaselineBenchmark:
    metrics: ClassificationMetrics
    predicted_class: int
    predicted_class_probability: float


def benchmark_majority_baseline(
    y_train: list[int],
    y_evaluation: list[int],
) -> BaselineBenchmark:
    """
    Evaluate a majority-class baseline on unseen evaluation labels.

    The baseline is fitted using y_train only.

    The evaluation layer expects P(class=1), while the baseline stores
    the probability of whichever class it predicts. This function
    performs that conversion explicitly.
    """
    if not y_evaluation:
        raise ValueError("at least one evaluation label is required")

    predictions, predicted_class_probabilities = predict_baseline(
        y_train,
        len(y_evaluation),
    )

    predicted_class = predictions[0]
    predicted_class_probability = predicted_class_probabilities[0]

    if predicted_class == 1:
        probability_class_1 = predicted_class_probability
    else:
        probability_class_1 = 1 - predicted_class_probability

    probabilities = [probability_class_1] * len(y_evaluation)

    metrics = classification_metrics(
        y_true=y_evaluation,
        y_pred=predictions,
        y_probability=probabilities,
    )

    return BaselineBenchmark(
        metrics=metrics,
        predicted_class=predicted_class,
        predicted_class_probability=predicted_class_probability,
    )