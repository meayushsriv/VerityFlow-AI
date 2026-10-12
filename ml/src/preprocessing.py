"""Leakage-conscious feature preparation for the simulated Kaggle transaction data."""
from __future__ import annotations

from pathlib import Path
import json
import numpy as np
import pandas as pd

REQUIRED_COLUMNS = {
    "trans_date_trans_time", "cc_num", "merchant", "category", "amt", "gender",
    "city", "state", "zip", "lat", "long", "city_pop", "job", "dob",
    "trans_num", "unix_time", "merch_lat", "merch_long", "is_fraud",
}
CATEGORICAL = ["category", "merchant", "state", "time_period"]
NUMERIC = ["amount_log", "hour", "day_of_week", "is_weekend", "card_merchant_distance_km", "city_pop_log"]
FEATURE_COLUMNS = CATEGORICAL + NUMERIC
TARGET = "is_fraud"


def validate_frame(frame: pd.DataFrame, require_target: bool = True) -> dict:
    required = REQUIRED_COLUMNS if require_target else REQUIRED_COLUMNS - {TARGET}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")
    issues: list[str] = []
    ts = pd.to_datetime(frame["trans_date_trans_time"], errors="coerce")
    bad_ts = int(ts.isna().sum())
    amount = pd.to_numeric(frame["amt"], errors="coerce")
    bad_amount = int((amount.isna() | (amount < 0)).sum())
    duplicates = int(frame["trans_num"].duplicated().sum())
    prevalence = None
    invalid_labels = 0
    if require_target:
        labels = pd.to_numeric(frame[TARGET], errors="coerce")
        invalid_labels = int((labels.isna() | ~labels.isin([0, 1])).sum())
        prevalence = float(labels.mean()) if len(labels) else 0.0
    for label, value in (("unparseable timestamps", bad_ts), ("invalid/negative amounts", bad_amount), ("duplicate trans_num identifiers", duplicates), ("invalid labels", invalid_labels)):
        if value:
            issues.append(f"{label}: {value}")
    return {"rows": int(len(frame)), "columns": int(len(frame.columns)), "missing_values": {str(k): int(v) for k, v in frame.isna().sum().items() if v}, "duplicate_transaction_ids": duplicates, "invalid_timestamps": bad_ts, "invalid_or_negative_amounts": bad_amount, "invalid_labels": invalid_labels, "fraud_prevalence": prevalence, "malformed_record_count": bad_ts + bad_amount + invalid_labels, "issues": issues}


def profile_file(path: Path, require_target: bool = True) -> dict:
    frame = pd.read_csv(path, low_memory=False)
    return validate_frame(frame, require_target=require_target)


def haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = (np.radians(pd.to_numeric(x, errors="coerce")) for x in (lat1, lon1, lat2, lon2))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(np.clip(value, 0, 1)))


def make_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Use behavioral/merchant context; never include identifiers, PII, or target."""
    ts = pd.to_datetime(frame["trans_date_trans_time"], errors="coerce")
    amt = pd.to_numeric(frame["amt"], errors="coerce").clip(lower=0)
    city_pop = pd.to_numeric(frame["city_pop"], errors="coerce").clip(lower=0)
    out = pd.DataFrame(index=frame.index)
    out["category"] = frame["category"].fillna("unknown").astype(str)
    out["merchant"] = frame["merchant"].fillna("unknown").astype(str)
    out["state"] = frame["state"].fillna("unknown").astype(str)
    hour = ts.dt.hour
    out["hour"] = hour.fillna(-1).astype(float)
    out["day_of_week"] = ts.dt.dayofweek.fillna(-1).astype(float)
    out["is_weekend"] = (ts.dt.dayofweek >= 5).fillna(False).astype(int)
    out["time_period"] = pd.cut(hour, bins=[-1, 5, 11, 17, 23], labels=["overnight", "morning", "afternoon", "evening"], include_lowest=True).astype("object").fillna("unknown")
    out["amount_log"] = np.log1p(amt)
    out["city_pop_log"] = np.log1p(city_pop)
    out["card_merchant_distance_km"] = haversine_km(frame["lat"], frame["long"], frame["merch_lat"], frame["merch_long"])
    return out[FEATURE_COLUMNS]


def load_labeled_csv(path: Path, max_rows: int | None = 250_000) -> pd.DataFrame:
    frame = pd.read_csv(path, low_memory=False)
    validate_frame(frame, require_target=True)
    frame["trans_date_trans_time"] = pd.to_datetime(frame["trans_date_trans_time"], errors="coerce")
    frame["amt"] = pd.to_numeric(frame["amt"], errors="coerce")
    frame["is_fraud"] = pd.to_numeric(frame["is_fraud"], errors="coerce")
    frame = frame.dropna(subset=["trans_date_trans_time", "amt", "is_fraud"])
    frame = frame.loc[frame["is_fraud"].isin([0, 1])].sort_values("trans_date_trans_time")
    # Retain the most recent contiguous period instead of randomly mixing future rows into training.
    if max_rows and len(frame) > max_rows:
        frame = frame.tail(max_rows).copy()
    return frame.reset_index(drop=True)


def write_profile(profile: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(profile, indent=2), encoding="utf-8")
