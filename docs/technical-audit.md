# Technical audit and prioritized implementation checklist

Audit date: 2026-10-12. Repository inspected before implementation; baseline Go tests passed. Baseline ESLint identified two synchronous-effect state updates and an unstable/missing loader dependency; those were refactored. Frontend and Python files are revalidated after implementation. Dataset directories contain only `.gitkeep`; no trained artifact was present. No Gemini key/Vertex project credentials or `gcloud` CLI were available. Raw credential values were not inspected.

## Baseline findings

- Frontend had Overview, Transactions, detail drawer, Model evaluation, and Methodology. It had no cases, evidence ledger, Gemini orchestration, comparison, or replay workflow.
- Go exposed demo transactions, filters, overview/analytics, model-unavailable prediction, and model metrics. Transaction store was in-memory only.
- Python provides shared preprocessing, chronological holdout, logistic regression and histogram gradient boosting, saved metrics/artifact, and a private inference service. Current feature explanations are global permutation importance only; the UI fixture risk is not model inference.
- Kaggle data and artifacts are absent. Model evaluation on the target dataset has not been run.
- Cloud Run and container deployment configuration exists; no deployable Cloud project/runtime credentials were supplied and deployment has not been attempted.

## Priorities

### P0 — demo-critical

- [x] Remove React Hooks lint errors and make filters reset pagination in handlers.
- [x] Add case-scoped evidence-backed investigation API and explicit deterministic fallback.
- [x] Ensure findings cite available evidence IDs and invalid references fall back instead of rendering as supported claims.
- [x] Require analyst confirmation and rationale before appending an action; prohibit a “fraud proven” state.
- [x] Keep model unavailable without a trained artifact; preserve honest dataset provenance.
- [ ] Configure a Gemini key or Vertex AI service identity and verify a live call/tool loop.
- [ ] Deploy to Cloud Run and verify live endpoints.

### P1 — differentiated workflow

- [x] Add bounded Go Gen AI SDK function-calling loop with only selected-transaction and deterministic-rule tools, four-call ceiling, request deadline, and safe fallback.
- [x] Add an evidence ledger with source, status, source time, value, relevance, and limitations; clickable references open source details.
- [x] Add synthetic demo cases and append-only in-process analyst/agent/report events.
- [x] Add comparison to a same-category lower-risk fixture, with limitations disclosed.
- [x] Add a case report with linked evidence/audit records and content digest.
- [x] Add an agent evaluation PowerShell harness for citations, missing IDs, fallback behavior, and comparison.
- [ ] Persist cases and audit records in Firestore or another approved durable store if the deployment needs persistence.
- [ ] Add authenticated analyst identity and authorization before any non-synthetic data is exposed.
- [ ] Review whether threshold/model selection and final metric reporting need a separate untouched temporal test window before real model results are used.

### P2 — optional

- [ ] Add SHAP/local attributions only after selecting a method compatible with the final estimator and adding parity/tests.
- [ ] Add real-time case search, export formatting, and keyboard navigation refinements.
- [ ] Capture browser screenshots after a fully connected API/agent run.

## Measurement status

The harness is `scripts/evaluate_agent.ps1`. It measures demo API calls, evidence-reference validity, missing transaction behavior, comparison, and latency when run against a started backend. Gemini tool selection, unsupported-claim manual review, real labelled false-positive/false-negative cases, ML metrics on the Kaggle dataset, and production latency are **Not yet measured**. Demo fixtures have no fraud ground-truth labels and must not be used to estimate fraud prevalence.
