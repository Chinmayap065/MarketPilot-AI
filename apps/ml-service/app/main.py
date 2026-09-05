from datetime import datetime, timezone
from fastapi import FastAPI

app = FastAPI(title="MarketPilot ML Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "marketpilot-ml",
        "status": "ok",
    }


@app.get("/api/v1/model/status")
def model_status() -> dict[str, object]:
    return {"modelsLoaded": False, "models": []}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "MarketPilot ML Service",
        "status": "skeleton",
        "message": "Feature engineering and model workflows will be added incrementally.",
    }
