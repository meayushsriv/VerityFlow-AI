"""Compare logistic and histogram-gradient-boosting models with chronological validation."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.inspection import permutation_importance
from sklearn.metrics import (average_precision_score, classification_report, confusion_matrix,
                             f1_score, precision_recall_curve, precision_score, recall_score, roc_auc_score)
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler, OrdinalEncoder

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from preprocessing import CATEGORICAL, NUMERIC, FEATURE_COLUMNS, TARGET, load_labeled_csv, make_features


def pipeline_for(model_name: str):
    if model_name == "logistic":
        preprocess = ColumnTransformer([
            ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=5), CATEGORICAL),
            ("num", Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), NUMERIC),
        ])
        model = LogisticRegression(max_iter=500, class_weight="balanced", solver="saga", random_state=42)
    else:
        preprocess = ColumnTransformer([
            ("cat", Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("encode", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))]), CATEGORICAL),
            ("num", SimpleImputer(strategy="median"), NUMERIC),
        ])
        model = HistGradientBoostingClassifier(max_iter=120, learning_rate=0.08, max_leaf_nodes=20, l2_regularization=1.0, random_state=42)
    return Pipeline([("preprocess", preprocess), ("model", model)])


def eval_at_threshold(y, scores, threshold):
    pred = (scores >= threshold).astype(int)
    return {"threshold": float(threshold), "precision": float(precision_score(y, pred, zero_division=0)), "recall": float(recall_score(y, pred, zero_division=0)), "f1": float(f1_score(y, pred, zero_division=0)), "confusion_matrix": confusion_matrix(y, pred).tolist()}


def evaluate_model(name, fitted, X, y, threshold):
    started = time.perf_counter()
    scores = fitted.predict_proba(X)[:, 1]
    elapsed = (time.perf_counter() - started) / max(len(y), 1) * 1000
    p, r, thresholds = precision_recall_curve(y, scores)
    candidates = [eval_at_threshold(y, scores, t) for t in (np.unique(np.quantile(scores, [0.90, 0.95, 0.975, 0.99])).tolist())]
    selected = max(candidates, key=lambda x: (x["f1"], x["recall"])) if candidates else eval_at_threshold(y, scores, threshold)
    selected["threshold_selection"] = "Best F1 among validation score quantiles 90%, 95%, 97.5%, 99%; review operating point, not a production policy."
    predictions = (scores >= selected["threshold"]).astype(int)
    example_features = ["category", "state", "hour", "time_period", "amount_log", "card_merchant_distance_km"]
    def examples(mask):
        indices = np.flatnonzero(mask)[:10]
        return [{"risk_score":float(scores[i]),"features":{key:(None if pd.isna(X.iloc[i][key]) else X.iloc[i][key].item() if hasattr(X.iloc[i][key],"item") else X.iloc[i][key]) for key in example_features}} for i in indices]
    return {"name": name, "precision": selected["precision"], "recall": selected["recall"], "f1": selected["f1"], "pr_auc": float(average_precision_score(y, scores)), "roc_auc": float(roc_auc_score(y, scores)) if len(np.unique(y)) > 1 else None, "threshold": selected["threshold"], "confusion_matrix": selected["confusion_matrix"], "classification_report": classification_report(y, predictions, output_dict=True, zero_division=0), "threshold_analysis": candidates, "precision_recall_curve": {"precision": p[::max(1, len(p)//200)].tolist(), "recall": r[::max(1, len(r)//200)].tolist()}, "inference_latency_ms_per_transaction": elapsed, "validation_prevalence": float(np.mean(y)), "false_positive_examples": examples((predictions==1)&(y.to_numpy()==0)), "false_negative_examples": examples((predictions==0)&(y.to_numpy()==1)), "validation_scores": scores}


def run(train_csv: Path, output_dir: Path, max_rows: int = 250_000):
    data = load_labeled_csv(train_csv, max_rows=max_rows)
    if len(data) < 100 or data[TARGET].nunique() < 2:
        raise ValueError("Need at least 100 valid transactions and both target classes.")
    split = max(1, int(len(data) * 0.8))
    train, valid = data.iloc[:split], data.iloc[split:]
    if train[TARGET].nunique() < 2 or valid[TARGET].nunique() < 2:
        raise ValueError("Chronological split must contain both fraud and legitimate examples; provide more data.")
    X_train, X_valid = make_features(train), make_features(valid)
    y_train, y_valid = train[TARGET].astype(int), valid[TARGET].astype(int)
    results = []
    models = {}
    for name in ("logistic", "hist_gradient_boosting"):
        model = pipeline_for(name)
        if name == "hist_gradient_boosting":
            model.fit(X_train, y_train, model__sample_weight=compute_sample_weight("balanced", y_train))
        else:
            model.fit(X_train, y_train)
        result = evaluate_model(name, model, X_valid, y_valid, 0.5)
        results.append(result)
        models[name] = model
        print(f"{name}: PR-AUC={result['pr_auc']:.4f}, F1={result['f1']:.4f}, threshold={result['threshold']:.4f}")
    selected = max(results, key=lambda x: (x["pr_auc"], x["f1"]))
    chosen_name = selected["name"]
    chosen_model = models[chosen_name]
    importance_rows = min(1000, len(X_valid))
    importance = permutation_importance(chosen_model, X_valid.iloc[:importance_rows], y_valid.iloc[:importance_rows], scoring="average_precision", n_repeats=3, random_state=42, n_jobs=1)
    selected["global_permutation_importance"] = [{"feature":FEATURE_COLUMNS[i],"mean_pr_auc_drop":float(importance.importances_mean[i]),"std":float(importance.importances_std[i])} for i in np.argsort(importance.importances_mean)[::-1]]
    artifact_dir = output_dir
    artifact_dir.mkdir(parents=True, exist_ok=True)
    artifact_path = artifact_dir / "verityflow-model.joblib"
    joblib.dump({"pipeline": chosen_model, "feature_columns": FEATURE_COLUMNS, "version": "0.1.0", "threshold": selected["threshold"], "selected_model": chosen_name}, artifact_path)
    # Serialize metrics only; do not store all validation scores/examples to avoid unnecessary personal data retention.
    selected_metrics = {k: v for k, v in selected.items() if k != "validation_scores"}
    metrics = {"schema_version": "1", "evaluation_date_utc": datetime.now(timezone.utc).isoformat(), "dataset": "Kaggle kartik2112/fraud-detection simulated US card transactions", "training_configuration": {"max_rows": max_rows, "train_fraction": 0.8, "random_state": 42, "logistic_class_weight": "balanced", "hist_gradient_boosting_sample_weight": "balanced", "model_selection": "highest validation PR-AUC, tie-broken by F1", "threshold_selection": "highest validation F1 among 90th, 95th, 97.5th, 99th score quantiles"}, "split": {"method": "chronological 80/20 within latest --max-rows window", "train_start": str(train["trans_date_trans_time"].min()), "train_end": str(train["trans_date_trans_time"].max()), "validation_start": str(valid["trans_date_trans_time"].min()), "validation_end": str(valid["trans_date_trans_time"].max()), "train_rows": len(train), "validation_rows": len(valid)}, "fraud_prevalence": {"train": float(y_train.mean()), "validation": float(y_valid.mean())}, "features": FEATURE_COLUMNS, "excluded_features": ["cc_num", "trans_num", "first", "last", "street", "zip", "dob", "job", "gender", "is_fraud target", "unix_time raw"], "models": [{k:v for k,v in r.items() if k!="validation_scores"} for r in results], "selected_model": chosen_name, "selected": selected_metrics, "artifact": artifact_path.name, "limitations": ["Dataset is simulated, not real banking data.", "A chronological split within one file may not represent future deployment drift.", "Validation threshold is selected for retrospective comparison, not operational deployment."]}
    (output_dir / "evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics

if __name__ == "__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("--input",type=Path,default=ROOT/"data/raw/fraudTrain.csv"); parser.add_argument("--output",type=Path,default=ROOT/"artifacts"); parser.add_argument("--max-rows",type=int,default=250_000)
    args=parser.parse_args(); run(args.input,args.output,args.max_rows)
