from dataclasses import dataclass

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


@dataclass(frozen=True)
class LogisticModelPrediction:
    predicted_class: int
    probability: float


class LogisticRegressionModel:
    """
    Binary Logistic Regression model with train-only feature scaling.

    The scaler and classifier are fitted exclusively on training data.
    """

    def __init__(
        self,
        random_state: int = 42,
        max_iter: int = 1000,
    ) -> None:
        self._scaler = StandardScaler()
        self._model = LogisticRegression(
            random_state=random_state,
            max_iter=max_iter,
        )
        self._is_fitted = False

    @property
    def is_fitted(self) -> bool:
        return self._is_fitted

    def fit(
        self,
        x_train: list[list[float]],
        y_train: list[int],
    ) -> None:
        if not x_train:
            raise ValueError("training features cannot be empty")

        if len(x_train) != len(y_train):
            raise ValueError(
                "training features and labels must have the same length"
            )

        if any(value not in (0, 1) for value in y_train):
            raise ValueError("training labels must be 0 or 1")

        feature_array = np.asarray(x_train, dtype=float)
        target_array = np.asarray(y_train, dtype=int)

        if feature_array.ndim != 2:
            raise ValueError("training features must be a two-dimensional array")

        if feature_array.shape[1] == 0:
            raise ValueError("training features must contain at least one feature")

        if len(np.unique(target_array)) < 2:
            raise ValueError(
                "training labels must contain both classes 0 and 1"
            )

        scaled_features = self._scaler.fit_transform(feature_array)
        self._model.fit(scaled_features, target_array)
        self._is_fitted = True

    def predict(
        self,
        x_features: list[list[float]],
    ) -> list[int]:
        self._ensure_fitted()

        feature_array = self._prepare_features(x_features)
        scaled_features = self._scaler.transform(feature_array)

        return self._model.predict(scaled_features).astype(int).tolist()

    def predict_probability(
        self,
        x_features: list[list[float]],
    ) -> list[float]:
        self._ensure_fitted()

        feature_array = self._prepare_features(x_features)
        scaled_features = self._scaler.transform(feature_array)

        probabilities = self._model.predict_proba(scaled_features)

        class_one_index = list(self._model.classes_).index(1)

        return probabilities[:, class_one_index].astype(float).tolist()

    def predict_with_probability(
        self,
        x_features: list[list[float]],
    ) -> list[LogisticModelPrediction]:
        predictions = self.predict(x_features)
        probabilities = self.predict_probability(x_features)

        return [
            LogisticModelPrediction(
                predicted_class=predicted_class,
                probability=probability,
            )
            for predicted_class, probability in zip(
                predictions,
                probabilities,
            )
        ]

    def _prepare_features(
        self,
        x_features: list[list[float]],
    ) -> np.ndarray:
        if not x_features:
            raise ValueError("prediction features cannot be empty")

        feature_array = np.asarray(x_features, dtype=float)

        if feature_array.ndim != 2:
            raise ValueError("prediction features must be a two-dimensional array")

        if feature_array.shape[1] == 0:
            raise ValueError("prediction features must contain at least one feature")

        return feature_array

    def _ensure_fitted(self) -> None:
        if not self._is_fitted:
            raise ValueError("model must be fitted before prediction")