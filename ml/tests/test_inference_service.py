import json,sys,joblib
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
from threading import Thread
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
import inference_service
from preprocessing import FEATURE_COLUMNS,make_features
from train import pipeline_for
from test_preprocessing import frame

def test_unavailable_model_returns_503(tmp_path,monkeypatch):
    monkeypatch.setattr(inference_service,"ARTIFACT",tmp_path/"absent.joblib")
    server=ThreadingHTTPServer(("127.0.0.1",0),inference_service.Handler);thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        req=Request(f"http://127.0.0.1:{server.server_port}/predict",data=b"{}",headers={"Content-Type":"application/json"},method="POST")
        try:urlopen(req)
        except HTTPError as error:assert error.code==503 and json.loads(error.read())["error"]=="model_unavailable"
        else:raise AssertionError("expected unavailable model response")
    finally:server.shutdown();thread.join()

def test_inference_uses_shared_preprocessing_and_returns_schema(tmp_path,monkeypatch):
    data=pd.concat([frame().assign(is_fraud=0),frame().assign(is_fraud=1),frame().assign(is_fraud=0),frame().assign(is_fraud=1)],ignore_index=True)
    pipeline=pipeline_for("logistic");pipeline.set_params(model__solver="liblinear",model__max_iter=30);pipeline.fit(make_features(data),data.is_fraud)
    artifact=tmp_path/"model.joblib";joblib.dump({"pipeline":pipeline,"feature_columns":FEATURE_COLUMNS,"version":"test","threshold":0.5,"selected_model":"logistic"},artifact)
    monkeypatch.setattr(inference_service,"ARTIFACT",artifact);monkeypatch.setattr(inference_service,"_MODEL_CACHE",None);monkeypatch.setattr(inference_service,"_MODEL_MTIME",None)
    server=ThreadingHTTPServer(("127.0.0.1",0),inference_service.Handler);thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        payload=frame().drop(columns=["cc_num","gender","city","zip","job","dob","trans_num","unix_time","is_fraud"]).iloc[0].to_dict()
        body=json.dumps(payload).encode();req=Request(f"http://127.0.0.1:{server.server_port}/predict",data=body,headers={"Content-Type":"application/json"},method="POST")
        with urlopen(req) as response:
            result=json.loads(response.read());assert response.status==200;assert 0<=result["risk_score"]<=1;assert result["model_version"]=="test"
    finally:server.shutdown();thread.join()
