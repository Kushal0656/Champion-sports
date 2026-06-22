import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, log_loss, roc_auc_score, brier_score_loss

# Feature columns required for training
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
TARGET_COLUMN = "match_result"

def train_xgboost_model(df: pd.DataFrame, model_save_path: str) -> dict:
    """Trains an XGBoost model on the input DataFrame and saves it as a pickle file."""
    # Validate required columns
    missing_features = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_features:
        raise ValueError(f"Missing feature columns in dataset: {missing_features}")
        
    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Missing target column '{TARGET_COLUMN}' in dataset.")
        
    # Drop rows with NaN in features or target
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    
    if len(df) < 50:
        raise ValueError(f"Not enough data to train. Current dataset has {len(df)} valid rows (need at least 50).")
        
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]
    
    # Train/Test Split: 80% train, 20% test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Dynamically import xgboost so the file compiles even if xgboost is missing initially
    try:
        from xgboost import XGBClassifier
        model = XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            random_state=42,
            eval_metric="logloss"
        )
    except ImportError:
        # Fallback to standard scikit-learn GradientBoostingClassifier if xgboost is not available
        print("XGBoost package not found. Falling back to Scikit-Learn GradientBoostingClassifier.")
        from sklearn.ensemble import GradientBoostingClassifier
        model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.08,
            random_state=42
        )
        
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    accuracy = float(accuracy_score(y_test, y_pred))
    logloss = float(log_loss(y_test, y_prob))
    brier = float(brier_score_loss(y_test, y_prob))
    
    try:
        roc_auc = float(roc_auc_score(y_test, y_prob))
    except Exception:
        # Fallback if only 1 class in test partition
        roc_auc = 0.5
        
    # Save trained model to disk
    with open(model_save_path, "wb") as f:
        pickle.dump(model, f)
        
    return {
        "accuracy": accuracy,
        "log_loss": logloss,
        "roc_auc": roc_auc,
        "brier_score": brier,
        "dataset_rows": len(df)
    }
