"""Private stdlib JSON inference endpoint; bind only to an internal container network."""
from __future__ import annotations
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from threading import Lock
import joblib
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parent))
from preprocessing import FEATURE_COLUMNS, make_features
ARTIFACT=Path(os.getenv("MODEL_ARTIFACT",str(Path(__file__).resolve().parents[1]/"artifacts/verityflow-model.joblib")))
MAX_BODY=16*1024
_MODEL_CACHE=None
_MODEL_MTIME=None
_MODEL_LOCK=Lock()

def load_artifact():
    """Load once and refresh only if the mounted artifact changes."""
    global _MODEL_CACHE, _MODEL_MTIME
    modified=ARTIFACT.stat().st_mtime_ns
    with _MODEL_LOCK:
        if _MODEL_CACHE is None or _MODEL_MTIME != modified:
            _MODEL_CACHE=joblib.load(ARTIFACT)
            _MODEL_MTIME=modified
        return _MODEL_CACHE

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Request payloads may contain transaction attributes; omit access logs.
        return
    def send_json(self,status,payload):
        body=json.dumps(payload).encode();self.send_response(status);self.send_header("Content-Type","application/json");self.send_header("Content-Length",str(len(body)));self.end_headers();self.wfile.write(body)
    def do_GET(self):
        if self.path!="/health":self.send_json(404,{"error":"not_found"});return
        self.send_json(200,{"status":"ok","model_available":ARTIFACT.exists()})
    def do_POST(self):
        if self.path!="/predict":self.send_json(404,{"error":"not_found"});return
        try:
            size=int(self.headers.get("Content-Length","0"))
            if size<1 or size>MAX_BODY:self.send_json(413,{"error":"invalid_size"});return
            payload=json.loads(self.rfile.read(size))
            if not ARTIFACT.exists():self.send_json(503,{"error":"model_unavailable"});return
            artifact=load_artifact()
            if artifact.get("feature_columns")!=FEATURE_COLUMNS:self.send_json(503,{"error":"feature_schema_mismatch"});return
            required={"amt", "category", "merchant", "state", "trans_date_trans_time", "city_pop", "lat", "long", "merch_lat", "merch_long"}
            missing=required-set(payload)
            if missing:self.send_json(400,{"error":"missing_features","fields":sorted(missing)});return
            frame=make_features(pd.DataFrame([payload]))
            score=float(artifact["pipeline"].predict_proba(frame[FEATURE_COLUMNS])[0,1])
            self.send_json(200,{"model_version":artifact["version"],"risk_score":score,"threshold":artifact["threshold"],"predicted_label":int(score>=artifact["threshold"]),"feature_columns":FEATURE_COLUMNS})
        except (json.JSONDecodeError,ValueError,TypeError) as exc:self.send_json(400,{"error":"invalid_request","message":str(exc)})
        except Exception:self.send_json(503,{"error":"inference_failed"})
def main():
    host=os.getenv("INFERENCE_HOST","0.0.0.0");port=int(os.getenv("INFERENCE_PORT","8001"));server=ThreadingHTTPServer((host,port),Handler);print(f"Private inference service listening on {host}:{port}");server.serve_forever()
if __name__=="__main__":main()
