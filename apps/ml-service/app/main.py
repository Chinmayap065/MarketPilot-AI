from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.dataset import training_rows_to_model_dataset
from app.dataset_validation import validate_model_dataset

app = FastAPI(title="MarketPilot ML Service", version="0.1.0")


class DatasetValidationRequest(BaseModel):
    rows: list[dict[str, Any]]


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


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "MarketPilot ML Service",
        "status": "skeleton",
        "message": "Feature engineering and model workflows will be added incrementally.",
    }