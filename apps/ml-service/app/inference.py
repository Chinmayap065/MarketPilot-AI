from dataclasses import dataclass

from app.model_artifact import ModelArtifact, load_model_artifact


@dataclass(frozen=True)
class InferencePrediction:
    predicted_class: int
    probability: float
    model_name: str
    model_version: str
    horizon: int


def load_inference_artifact(
    artifact_path: str,
) -> ModelArtifact:
    """
    Load a persisted model artifact for inference.

    Artifacts must come from a trusted application-controlled location.
    """

    return load_model_artifact(artifact_path)


def predict_from_artifact(
    artifact: ModelArtifact,
    features: list[float],
) -> InferencePrediction:
    """
    Generate a binary prediction from a persisted model artifact.

    The feature vector must exactly match the feature schema stored
    in the artifact metadata.
    """

    expected_feature_count = len(artifact.metadata.feature_names)

    if expected_feature_count == 0:
        raise ValueError("artifact feature schema cannot be empty")

    if len(features) != expected_feature_count:
        raise ValueError(
            "prediction feature count does not match artifact feature schema"
        )

    predictions = artifact.model.predict_with_probability(
        [features],
    )

    if len(predictions) != 1:
        raise ValueError(
            "model must return exactly one prediction"
        )

    prediction = predictions[0]

    if prediction.predicted_class not in (0, 1):
        raise ValueError(
            "model returned an invalid predicted class"
        )

    if not 0.0 <= prediction.probability <= 1.0:
        raise ValueError(
            "model returned an invalid probability"
        )

    return InferencePrediction(
        predicted_class=prediction.predicted_class,
        probability=prediction.probability,
        model_name=artifact.metadata.model_name,
        model_version=artifact.metadata.model_version,
        horizon=artifact.metadata.horizon,
    )


def predict_from_artifact_path(
    artifact_path: str,
    features: list[float],
) -> InferencePrediction:
    """
    Load a persisted model artifact and generate one prediction.
    """

    artifact = load_inference_artifact(artifact_path)

    return predict_from_artifact(
        artifact,
        features,
    )