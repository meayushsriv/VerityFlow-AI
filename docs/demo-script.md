# Three-minute demo script

1. **0:00–0:25 — Honest setup:** “VerityFlow connects risk indicators to evidence. This workspace currently uses fictional demo scenarios. The Kaggle source we support is simulated US card transactions, not actual banking data or MSME loans.”
2. **0:25–1:05 — Overview:** Show transaction/scenario totals, demo alert bands, flagged amount, time chart and category chart. Explain these are derived from fixture records, not observed fraud metrics.
3. **1:05–1:50 — Explorer:** Search, filter on category/risk/amount, inspect pagination and masked/non-PII fields.
4. **1:50–2:20 — Investigation agent:** Open a high-risk fixture, ask the investigator to explain the signal, inspect tool activity, and click evidence IDs. If configured, identify `gemini_with_backend_tools`; without credentials, show the deterministic fallback—never claim Gemini was called.
5. **2:20–2:40 — Compare and decide:** Compare with a same-category lower-risk fixture, review limitations, choose a case status, enter a rationale, confirm the action, and append it.
6. **2:40–3:00 — Report and safeguards:** Open the case page, inspect its evidence ledger/audit events, generate a report digest, and disclose that this is in-memory demo history, not tamper-proof storage. State that no Kaggle metrics are available yet.

For repeatable demo checks, run `scripts/evaluate_agent.ps1` against the started API. It measures synthetic flow/API behavior only. Manual unsupported-claim review, live Gemini tool-selection accuracy, and real labelled ML metrics remain **Not yet measured**.
