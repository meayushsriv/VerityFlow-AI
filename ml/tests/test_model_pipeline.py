import sys
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from train import pipeline_for
from preprocessing import FEATURE_COLUMNS, make_features
from test_preprocessing import frame

def test_pipeline_fit_predict_schema():
    data=frame();data=pd.concat([data.assign(is_fraud=0),data.assign(is_fraud=1),data.assign(is_fraud=0),data.assign(is_fraud=1)],ignore_index=True)
    features=make_features(data);model=pipeline_for("logistic");model.set_params(model__solver="liblinear",model__max_iter=30);model.fit(features,data.is_fraud);assert list(features.columns)==FEATURE_COLUMNS;assert model.predict_proba(features).shape==(4,2)
