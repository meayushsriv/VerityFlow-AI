"""Print saved evaluation artifact metrics; it never invents values."""
import argparse, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser();p.add_argument("--metrics",type=Path,default=ROOT/"artifacts/evaluation.json");args=p.parse_args()
    if not args.metrics.exists(): raise SystemExit(f"Evaluation output not found: {args.metrics}. Run make train after adding labeled data.")
    data=json.loads(args.metrics.read_text(encoding="utf-8"));print(json.dumps({"evaluation_date_utc":data["evaluation_date_utc"],"split":data["split"],"fraud_prevalence":data["fraud_prevalence"],"selected_model":data["selected_model"],"selected":data["selected"]},indent=2))
if __name__=="__main__":main()
