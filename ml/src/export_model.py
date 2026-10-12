"""Smoke-test the saved artifact and exact training feature schema."""
import argparse
from pathlib import Path
import joblib
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser();p.add_argument("--artifact",type=Path,default=ROOT/"artifacts/verityflow-model.joblib");args=p.parse_args()
    if not args.artifact.exists(): raise SystemExit(f"Model artifact not found: {args.artifact}")
    artifact=joblib.load(args.artifact)
    if not isinstance(artifact.get("feature_columns"),list): raise SystemExit("Invalid model artifact schema")
    sample=pd.DataFrame([{c: ("unknown" if c in {"category","merchant","state","time_period"} else 0.0) for c in artifact["feature_columns"]}])
    prediction=artifact["pipeline"].predict_proba(sample)
    if prediction.shape != (1,2): raise SystemExit(f"Unexpected prediction shape: {prediction.shape}")
    print(f"Model smoke test passed; version={artifact['version']}, predicted risk={prediction[0,1]:.6f}")
if __name__=="__main__":main()
