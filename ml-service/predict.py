import os
import pickle
import pandas as pd
import numpy as np

# Column ordering required by the XGBoost model
FEATURE_COLUMNS = [
    "score",
    "wickets_lost",
    "overs_completed",
    "balls_remaining",
    "runs_remaining",
    "current_run_rate",
    "required_run_rate",
    "wickets_in_hand",
    "pressure_index",
    "resource_remaining",
    "momentum",
    "wicket_momentum",
    "partnership_runs",
    "current_bowler_economy"
]

def load_model(model_path: str):
    """Loads the pickled XGBoost model if it exists."""
    if os.path.exists(model_path):
        try:
            with open(model_path, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Error loading model from {model_path}: {e}")
            return None
    return None

def predict_probability(model, features_dict: dict) -> float:
    """Predicts win probability using the model, with a default fallback."""
    if model is None:
        # Fallback: Simple heuristic estimation if model is not yet trained
        # Bounded between 0.01 and 0.99
        crr = features_dict.get("current_run_rate", 7.5)
        rrr = features_dict.get("required_run_rate", 7.5)
        wih = features_dict.get("wickets_in_hand", 10.0)
        
        diff = crr - rrr
        w_factor = (wih - 5.0) * 0.05
        prob = 0.5 + (diff * 0.04) + w_factor
        return float(np.clip(prob, 0.01, 0.99))
        
    try:
        # Construct DataFrame with exactly the expected feature columns in correct order
        df = pd.DataFrame([features_dict], columns=FEATURE_COLUMNS)
        
        # XGBoost predict_proba outputs array of shapes [n_samples, n_classes]
        # class 0: Loss, class 1: Win
        prob_win = model.predict_proba(df)[0][1]
        return float(prob_win)
    except Exception as e:
        print(f"Error during model prediction: {e}")
        # Fallback in case of prediction failure
        return 0.5
