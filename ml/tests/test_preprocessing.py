import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
import pandas as pd
import pytest
from preprocessing import FEATURE_COLUMNS, make_features, validate_frame

def frame():
    return pd.DataFrame({"trans_date_trans_time":["2020-01-01 02:30:00"],"cc_num":[123],"merchant":["m"],"category":["food"],"amt":[12.5],"gender":["F"],"city":["x"],"state":["CA"],"zip":[1],"lat":[37.0],"long":[-122.0],"city_pop":[500],"job":["x"],"dob":["1970-01-01"],"trans_num":["t1"],"unix_time":[1],"merch_lat":[38.0],"merch_long":[-122.0],"is_fraud":[0]})

def test_features_exact_schema_and_no_identifiers():
    result=make_features(frame());assert list(result.columns)==FEATURE_COLUMNS;assert "cc_num" not in result;assert result.iloc[0]["hour"]==2;assert result.iloc[0]["time_period"]=="overnight"

def test_validate_reports_duplicates_and_label_prevalence():
    data=pd.concat([frame(),frame()],ignore_index=True);result=validate_frame(data);assert result["duplicate_transaction_ids"]==1;assert result["fraud_prevalence"]==0

def test_validate_missing_required_column():
    with pytest.raises(ValueError,match="Missing required columns"):validate_frame(frame().drop(columns=["amt"]))
