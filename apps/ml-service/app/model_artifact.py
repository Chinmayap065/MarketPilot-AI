from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import joblib

from app.logistic_model import LogisticRegressionModel


@dataclass(frozen=True)
class ModelArtifactMetadata:
    model_name: str
    model_version: str
    feature_names: list[str]
    horizon: int
    trained_at: str


@dataclass(frozen=True)
class ModelArtifact:
    metadata: ModelArtifactMetadata
    model: LogisticRegressionModel


def save_model_artifact(
    artifact: ModelArtifact,
    path: str | Path,
) -> None:
    if not artifact.model.is_fitted:
        raise ValueError("cannot save an unfitted model")

    if not artifact.metadata.model_name:
        raise ValueError("model name cannot be empty")

    if not artifact.metadata.model_version:
        raise ValueError("model version cannot be empty")

    if not artifact.metadata.feature_names:
        raise ValueError("feature names cannot be empty")

    if artifact.metadata.horizon < 1:
        raise ValueError("horizon must be a positive integer")

    if not artifact.metadata.trained_at:
        raise ValueError("trained_at cannot be empty")

    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(artifact, output_path)


def load_model_artifact(
    path: str | Path,
) -> ModelArtifact:
    input_path = Path(path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"model artifact does not exist: {input_path}"
        )

    artifact = joblib.load(input_path)

    if not isinstance(artifact, ModelArtifact):
        raise ValueError("invalid model artifact")

    if not artifact.model.is_fitted:
        raise ValueError("model artifact contains an unfitted model")

    return artifact


def build_model_artifact(
    model: LogisticRegressionModel,
    *,
    model_name: str,
    model_version: str,
    feature_names: list[str],
    horizon: int,
    trained_at: datetime | None = None,
) -> ModelArtifact:
    if not model.is_fitted:
        raise ValueError("cannot create an artifact from an unfitted model")

    if not model_name:
        raise ValueError("model name cannot be empty")

    if not model_version:
        raise ValueError("model version cannot be empty")

    if not feature_names:
        raise ValueError("feature names cannot be empty")

    if horizon < 1:
        raise ValueError("horizon must be a positive integer")

    timestamp = trained_at or datetime.now().astimezone()

    metadata = ModelArtifactMetadata(
        model_name=model_name,
        model_version=model_version,
        feature_names=list(feature_names),
        horizon=horizon,
        trained_at=timestamp.isoformat(),
    )

    return ModelArtifact(
        metadata=metadata,
        model=model,
    )