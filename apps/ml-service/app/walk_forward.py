from dataclasses import dataclass

from app.benchmark import BaselineBenchmark, benchmark_majority_baseline
from app.evaluation import ClassificationMetrics, classification_metrics
from app.logistic_model import LogisticRegressionModel


@dataclass(frozen=True)
class WalkForwardWindow:
    train_start: int
    train_end: int
    test_start: int
    test_end: int


@dataclass(frozen=True)
class WalkForwardResult:
    windows: list[WalkForwardWindow]
    metrics: ClassificationMetrics
    baseline: BaselineBenchmark
    predictions: list[int]
    probabilities: list[float]
    actuals: list[int]


def _validate_configuration(
    total_rows: int,
    horizon: int,
    initial_train_size: int,
    test_size: int,
    step_size: int,
) -> None:
    if total_rows < 3:
        raise ValueError("at least 3 rows are required")

    if horizon < 1:
        raise ValueError("horizon must be at least 1")

    if initial_train_size < 2:
        raise ValueError("initial_train_size must be at least 2")

    if test_size < 1:
        raise ValueError("test_size must be at least 1")

    if step_size < 1:
        raise ValueError("step_size must be at least 1")

    minimum_required = initial_train_size + horizon + test_size

    if total_rows < minimum_required:
        raise ValueError(
            "not enough rows for the requested walk-forward configuration"
        )


def _build_windows(
    total_rows: int,
    horizon: int,
    initial_train_size: int,
    test_size: int,
    step_size: int,
) -> list[WalkForwardWindow]:
    windows: list[WalkForwardWindow] = []

    train_end = initial_train_size

    while True:
        test_start = train_end + horizon
        test_end = test_start + test_size

        if test_end > total_rows:
            break

        windows.append(
            WalkForwardWindow(
                train_start=0,
                train_end=train_end,
                test_start=test_start,
                test_end=test_end,
            )
        )

        train_end += step_size

    if not windows:
        raise ValueError(
            "not enough rows for at least one walk-forward evaluation window"
        )

    return windows


def walk_forward_evaluate(
    x: list[list[float]],
    y: list[int],
    horizon: int = 1,
    initial_train_size: int = 20,
    test_size: int = 5,
    step_size: int = 5,
) -> WalkForwardResult:
    """
    Evaluate a binary classification model using expanding-window
    walk-forward validation.

    For every window:

    1. Train on all observations available before the purge period.
    2. Skip `horizon` observations immediately before the test period.
    3. Predict the unseen test observations.
    4. Evaluate a majority-class baseline on the same unseen test
       observations.
    5. Move the training boundary forward by `step_size`.

    A fresh LogisticRegressionModel is fitted for every window so that
    feature scaling and model parameters are learned only from that
    window's historical training data.

    Baseline predictions are also generated independently for each
    window and aggregated only from out-of-sample test observations.
    """

    if len(x) != len(y):
        raise ValueError("features and labels must have the same length")

    if any(value not in (0, 1) for value in y):
        raise ValueError("labels must be 0 or 1")

    _validate_configuration(
        total_rows=len(x),
        horizon=horizon,
        initial_train_size=initial_train_size,
        test_size=test_size,
        step_size=step_size,
    )

    windows = _build_windows(
        total_rows=len(x),
        horizon=horizon,
        initial_train_size=initial_train_size,
        test_size=test_size,
        step_size=step_size,
    )

    all_predictions: list[int] = []
    all_probabilities: list[float] = []
    all_actuals: list[int] = []

    all_baseline_predictions: list[int] = []
    all_baseline_probabilities: list[float] = []

    for window in windows:
        x_train = x[window.train_start : window.train_end]
        y_train = y[window.train_start : window.train_end]

        x_test = x[window.test_start : window.test_end]
        y_test = y[window.test_start : window.test_end]

        if len(set(y_train)) < 2:
            raise ValueError(
                "walk-forward training window must contain both classes"
            )

        model = LogisticRegressionModel()
        model.fit(x_train, y_train)

        predictions = model.predict(x_test)
        probabilities = model.predict_probability(x_test)

        baseline = benchmark_majority_baseline(
            y_train=y_train,
            y_evaluation=y_test,
        )

        baseline_predictions = [
            baseline.predicted_class
            for _ in y_test
        ]

        baseline_probabilities = [
            baseline.predicted_class_probability
            for _ in y_test
        ]

        all_predictions.extend(predictions)
        all_probabilities.extend(probabilities)
        all_actuals.extend(y_test)

        all_baseline_predictions.extend(baseline_predictions)
        all_baseline_probabilities.extend(baseline_probabilities)

    metrics = classification_metrics(
        y_true=all_actuals,
        y_pred=all_predictions,
        y_probability=all_probabilities,
    )

    baseline_metrics = classification_metrics(
        y_true=all_actuals,
        y_pred=all_baseline_predictions,
        y_probability=all_baseline_probabilities,
    )

    first_baseline = benchmark_majority_baseline(
        y_train=y[
            windows[0].train_start : windows[0].train_end
        ],
        y_evaluation=y[
            windows[0].test_start : windows[0].test_end
        ],
    )

    baseline = BaselineBenchmark(
        metrics=baseline_metrics,
        predicted_class=first_baseline.predicted_class,
        predicted_class_probability=first_baseline.predicted_class_probability,
    )

    return WalkForwardResult(
        windows=windows,
        metrics=metrics,
        baseline=baseline,
        predictions=all_predictions,
        probabilities=all_probabilities,
        actuals=all_actuals,
    )