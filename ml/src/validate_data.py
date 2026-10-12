"""Validate Kaggle CSV files locally and emit a concise JSON profile."""
import argparse, json
from pathlib import Path
from preprocessing import profile_file
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser();p.add_argument("files",nargs="*",type=Path,default=[ROOT/"data/raw/fraudTrain.csv",ROOT/"data/raw/fraudTest.csv"]);p.add_argument("--output",type=Path,default=ROOT/"data/processed/data-profile.json");args=p.parse_args()
    reports=[]
    for path in args.files:
        if not path.exists(): raise SystemExit(f"Missing dataset file: {path}. Download it manually or use the authorized Kaggle script.")
        report={"file":path.name,**profile_file(path,require_target="train" in path.name.lower())};reports.append(report);print(json.dumps(report,indent=2))
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(reports,indent=2),encoding="utf-8")
if __name__=="__main__":main()
