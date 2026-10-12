# Model card — VerityFlow transaction-fraud investigation

## Status

No model has been trained or evaluated in the current repository state. The application runs in synthetic demo mode and its interface scores are illustrative fixtures only. No performance numbers are available or claimed.

## Intended use

Educational demonstration of transaction-risk review and explainability concepts on the simulated Kaggle kartik2112/fraud-detection dataset. Not for production financial decisions, customer treatment, lending, account restrictions, law enforcement, or proof of fraud.

## Data

The intended dataset is simulated US credit-card transactions. It does not represent real banking activity or MSME loans. Users must obtain and place the CSV files locally after reviewing dataset terms. Training requires valid `is_fraud` labels. Test metrics require valid labels to be present; they are never assumed.

## Features and exclusions

Included candidate inputs: category, merchant, state, transaction hour/day/weekend/time period, log amount, log city population, approximate card-to-merchant distance. Direct card/transaction identifiers, names, street, ZIP, date of birth, occupation, gender, target, and raw Unix time are excluded. Review location and merchant features for synthetic leakage and proxy bias.

## Training and evaluation

Compare class-weighted logistic regression and histogram gradient boosting on a chronological 80/20 holdout. Metrics include precision, recall, F1, PR-AUC, ROC-AUC where defined, confusion matrix, report, threshold sweep, prevalence, and measured inference latency. Select model by validation PR-AUC then F1. Select a review threshold from validation score quantiles by F1; this does not establish a production threshold. No oversampling is performed. The saved artifact includes preprocessing and feature schema.

Actual split sizes and results will only be documented after training on locally supplied data. `ml/artifacts/evaluation.json` is ignored by Git; do not report made-up performance results.

## Limitations and risks

- Synthetic data may contain unrealistic behaviors and artifacts.
- A within-dataset temporal holdout may not reflect future shifts or other institutions.
- PR-AUC and threshold performance depend on prevalence and review capacity.
- Features may encode geographic, merchant, or population proxies; fairness and subgroup performance need investigation.
- False positives can harm customers and create review burden; false negatives miss suspicious activity.
- This pipeline does not guarantee calibration, causal explanations, drift monitoring, or independent validation.
- Local explanations are not currently produced; deterministic rules and global model reports are distinct.

## Human oversight

Use alerts as leads for independent review. Validate underlying records and authorized context. Do not infer intent or make consequential decisions from scores alone. Maintain an audit trail, access controls, minimization, and a documented escalation process before any real-world application.
