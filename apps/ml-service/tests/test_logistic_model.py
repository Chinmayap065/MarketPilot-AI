import pytest

from app.logistic_model import LogisticRegressionModel


def training_data() -> tuple[list[list[float]], list[int]]:
    x_train = [
        [1.0, 10.0],
        [2.0, 20.0],
        [3.0, 30.0],
        [4.0, 40.0],
        [5.0, 50.0],
        [6.0, 60.0],
        [7.0, 70.0],
        [8.0, 80.0],
    ]

    y_train = [0, 0, 0, 0, 1, 1, 1, 1]

    return x_train, y_train


def test_model_starts_unfitted() -> None:
    model = LogisticRegressionModel()

    assert model.is_fitted is False


def test_model_fits_successfully() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    assert model.is_fitted is True


def test_model_predicts_binary_classes() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    predictions = model.predict(
        [
            [1.5, 15.0],
            [7.5, 75.0],
        ]
    )

    assert len(predictions) == 2
    assert all(prediction in (0, 1) for prediction in predictions)


def test_model_returns_class_one_probabilities() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    probabilities = model.predict_probability(
        [
            [1.5, 15.0],
            [7.5, 75.0],
        ]
    )

    assert len(probabilities) == 2
    assert all(0.0 <= probability <= 1.0 for probability in probabilities)
    assert probabilities[0] < probabilities[1]


def test_combined_prediction_contains_matching_values() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    results = model.predict_with_probability(
        [
            [1.5, 15.0],
            [7.5, 75.0],
        ]
    )

    assert len(results) == 2

    predictions = model.predict(
        [
            [1.5, 15.0],
            [7.5, 75.0],
        ]
    )

    probabilities = model.predict_probability(
        [
            [1.5, 15.0],
            [7.5, 75.0],
        ]
    )

    assert [result.predicted_class for result in results] == predictions
    assert [result.probability for result in results] == pytest.approx(
        probabilities
    )


def test_prediction_requires_fitted_model() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="fitted"):
        model.predict([[1.0, 2.0]])


def test_probability_prediction_requires_fitted_model() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="fitted"):
        model.predict_probability([[1.0, 2.0]])


def test_rejects_empty_training_features() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="training features cannot be empty"):
        model.fit([], [])


def test_rejects_mismatched_training_lengths() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="same length"):
        model.fit(
            [[1.0], [2.0]],
            [0],
        )


def test_rejects_invalid_training_labels() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="labels must be 0 or 1"):
        model.fit(
            [[1.0], [2.0], [3.0]],
            [0, 1, 2],
        )


def test_rejects_training_data_with_only_one_class() -> None:
    model = LogisticRegressionModel()

    with pytest.raises(ValueError, match="both classes"):
        model.fit(
            [[1.0], [2.0], [3.0]],
            [1, 1, 1],
        )


def test_rejects_empty_prediction_features() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    with pytest.raises(ValueError, match="prediction features cannot be empty"):
        model.predict([])


def test_rejects_invalid_prediction_dimensions() -> None:
    x_train, y_train = training_data()

    model = LogisticRegressionModel()
    model.fit(x_train, y_train)

    with pytest.raises(ValueError, match="two-dimensional"):
        model.predict([1.0, 2.0])