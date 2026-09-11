from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.dataset import training_rows_to_model_dataset
from app.dataset_validation import validate_model_dataset
from app.training_pipeline import train_and_evaluate

app = FastAPI(title="MarketPilot ML Service", version="0.1.0")


class DatasetValidationRequest(BaseModel):
    rows: list[dict[str, Any]]


class ModelTrainingRequest(BaseModel):
    rows: list[dict[str, Any]]
    horizon: int = 1
    trainRatio: float = 0.70
    validationRatio: float = 0.15
    runWalkForward: bool = False
    walkForwardInitialTrainSize: int = 20
    walkForwardTestSize: int = 5
    walkForwardStepSize: int = 5


def _metrics_to_dict(metrics: object) -> dict[str, float]:
    return {
        "accuracy": metrics.accuracy,
        "precision": metrics.precision,
        "recall": metrics.recall,
        "f1": metrics.f1,
        "logLoss": metrics.log_loss,
    }


def _baseline_to_dict(baseline: object) -> dict[str, object]:
    return {
        "metrics": _metrics_to_dict(baseline.metrics),
        "predictedClass": baseline.predicted_class,
        "predictedClassProbability": baseline.predicted_class_probability,
    }


def _walk_forward_to_dict(result: object) -> dict[str, object]:
    return {
        "metrics": _metrics_to_dict(result.metrics),
        "baseline": _baseline_to_dict(result.baseline),
        "windowCount": len(result.windows),
        "windows": [
            {
                "trainStart": window.train_start,
                "trainEnd": window.train_end,
                "testStart": window.test_start,
                "testEnd": window.test_end,
            }
            for window in result.windows
        ],
        "predictionCount": len(result.predictions),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "marketpilot-ml", "status": "ok"}


@app.get("/api/v1/model/status")
def model_status() -> dict[str, object]:
    return {"modelsLoaded": False, "models": []}


@app.post("/api/v1/datasets/validate")
def validate_dataset(request: DatasetValidationRequest) -> dict[str, object]:
    if not request.rows:
        raise HTTPException(status_code=400, detail="dataset rows cannot be empty")

    try:
        dataset = training_rows_to_model_dataset(request.rows)
        validate_model_dataset(dataset)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "valid": True,
        "rowCount": len(dataset.x),
        "featureCount": len(dataset.x[0]),
        "featureNames": [
            "close",
            "volume",
            "return_1",
            "log_return_1",
            "sma_10",
            "sma_20",
            "price_to_sma_10",
            "price_to_sma_20",
            "volatility_10",
            "volume_change_1",
            "rsi_14",
        ],
    }


@app.post("/api/v1/models/train")
def train_model(request: ModelTrainingRequest) -> dict[str, object]:
    if not request.rows:
        raise HTTPException(status_code=400, detail="dataset rows cannot be empty")

    try:
        dataset = training_rows_to_model_dataset(request.rows)

        result = train_and_evaluate(
            dataset,
            horizon=request.horizon,
            train_ratio=request.trainRatio,
            validation_ratio=request.validationRatio,
            run_walk_forward=request.runWalkForward,
            walk_forward_initial_train_size=request.walkForwardInitialTrainSize,
            walk_forward_test_size=request.walkForwardTestSize,
            walk_forward_step_size=request.walkForwardStepSize,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    response: dict[str, object] = {
        "trained": result.model.is_fitted,
        "model": {
            "name": "logistic_regression",
        },
        "horizon": request.horizon,
        "split": {
            "trainRows": len(result.split.train),
            "validationRows": len(result.split.validation),
            "testRows": len(result.split.test),
        },
        "validation": _metrics_to_dict(result.validation),
        "test": _metrics_to_dict(result.test),
        "baseline": {
            "validation": _baseline_to_dict(result.baseline_validation),
            "test": _baseline_to_dict(result.baseline_test),
        },
        "trainedAt": datetime.now(timezone.utc).isoformat(),
    }

    if result.walk_forward is not None:
        response["walkForward"] = _walk_forward_to_dict(result.walk_forward)

    return response


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "MarketPilot ML Service",
        "status": "skeleton",
        "message": "Feature engineering and model workflows will be added incrementally.",
    }