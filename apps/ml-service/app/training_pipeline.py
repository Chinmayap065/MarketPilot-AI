from dataclasses import dataclass

from app.benchmark import BaselineBenchmark, benchmark_majority_baseline
from app.evaluation import ClassificationMetrics, classification_metrics
from app.logistic_model import LogisticRegressionModel
from app.purged_split import PurgedChronologicalSplit, purged_chronological_split


@dataclass(frozen=True)
class ModelBenchmark:
    accuracy: float
    precision: float
    recall: float
    f1: float
    log_loss: float


@dataclass(frozen=True)
class TrainingResult:
    model: LogisticRegressionModel
    validation: ModelBenchmark
    test: ModelBenchmark
    baseline_validation: BaselineBenchmark
    baseline_test: BaselineBenchmark
    split: PurgedChronologicalSplit[object]


def _to_model_benchmark(metrics: ClassificationMetrics) -> ModelBenchmark:
    return ModelBenchmark(
        accuracy=metrics.accuracy,
        precision=metrics.precision,
        recall=metrics.recall,
        f1=metrics.f1,
        log_loss=metrics.log_loss,
    )


def train_and_evaluate(
    x: list[list[float]],
    y: list[int],
    horizon: int = 1,
    train_ratio: float = 0.70,
    validation_ratio: float = 0.15,
) -> TrainingResult:
    """
    Train Logistic Regression using a purged chronological split.

    Scaling is fitted only on the training partition.

    Validation and test data remain completely unseen during model fitting.
    A majority-class baseline is evaluated on the same partitions.
    """
    if len(x) != len(y):
        raise ValueError("features and labels must have the same length")

    if not x:
        raise ValueError("training dataset cannot be empty")

    split = purged_chronological_split(
        list(range(len(x))),
        horizon=horizon,
        train_ratio=train_ratio,
        validation_ratio=validation_ratio,
    )

    train_indices = split.train
    validation_indices = split.validation
    test_indices = split.test

    x_train = [x[index] for index in train_indices]
    y_train = [y[index] for index in train_indices]

    x_validation = [x[index] for index in validation_indices]
    y_validation = [y[index] for index in validation_indices]

    x_test = [x[index] for index in test_indices]
    y_test = [y[index] for index in test_indices]

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    validation_predictions = model.predict(x_validation)
    validation_probabilities = model.predict_probability(x_validation)

    test_predictions = model.predict(x_test)
    test_probabilities = model.predict_probability(x_test)

    validation_metrics = classification_metrics(
        y_true=y_validation,
        y_pred=validation_predictions,
        y_probability=validation_probabilities,
    )

    test_metrics = classification_metrics(
        y_true=y_test,
        y_pred=test_predictions,
        y_probability=test_probabilities,
    )

    baseline_validation = benchmark_majority_baseline(
        y_train=y_train,
        y_evaluation=y_validation,
    )

    baseline_test = benchmark_majority_baseline(
        y_train=y_train,
        y_evaluation=y_test,
    )

    return TrainingResult(
        model=model,
        validation=_to_model_benchmark(validation_metrics),
        test=_to_model_benchmark(test_metrics),
        baseline_validation=baseline_validation,
        baseline_test=baseline_test,
        split=split,
    )