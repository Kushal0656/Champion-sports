import os
import pickle
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import pandas as pd
import io

from predict import load_model, predict_probability
from train import train_xgboost_model

MODEL_PATH = "model/xgboost.pkl"
DATASET_PATH = "dataset/matches.csv"

# Ensure directories exist
os.makedirs("model", exist_ok=True)
os.makedirs("dataset", exist_ok=True)

# Global model reference
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model = load_model(MODEL_PATH)
    if model is not None:
        print("Successfully loaded trained XGBoost model from startup.")
    else:
        print("No pre-trained model found. Running in fallback mode.")
    yield
    # Shutdown cleanup (if any) goes here

app = FastAPI(title="Cricket Win Probability ML Service", version="1.0", lifespan=lifespan)


class MatchFeatures(BaseModel):
    score: float
    wickets_lost: float
    overs_completed: float
    balls_remaining: float
    runs_remaining: float
    current_run_rate: float
    required_run_rate: float
    wickets_in_hand: float
    pressure_index: float
    resource_remaining: float
    momentum: float
    wicket_momentum: float
    partnership_runs: float
    current_bowler_economy: float


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict")
def predict(features: MatchFeatures):
    global model
    # If model is not loaded, attempt reload
    if model is None:
        model = load_model(MODEL_PATH)

    prob = predict_probability(model, features.model_dump())
    confidence = max(prob, 1.0 - prob)
    return {
        "win_probability": prob,
        "confidence": confidence,
        "source": "ml_model" if model is not None else "fallback_default"
    }


@app.post("/train")
async def train(file: UploadFile = File(...)):
    global model
    try:
        # Save upload to dataset folder
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df.to_csv(DATASET_PATH, index=False)

        # Train model
        metrics = train_xgboost_model(df, MODEL_PATH)

        # Reload model
        model = load_model(MODEL_PATH)

        return {
            "status": "success",
            "message": "Model trained successfully and loaded into memory.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
