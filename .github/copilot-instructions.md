# VerityFlow AI workspace guidance

- Keep the product truthful about provenance: Kaggle kartik2112/fraud-detection is simulated US card transaction data, not real banking or MSME loan data.
- Use synthetic fixtures only in explicit demo mode. Never describe fixture scores as trained model predictions, measured fraud prevalence, or verified fraud outcomes.
- Separate observed transaction fields, model estimates, deterministic rule findings, and hypotheses. An alert is not proof of fraud.
- Never show raw card numbers, names, street addresses, birth dates, or unnecessary direct identifiers in UI/logs. Keep datasets, credentials, and model artifacts out of Git.
- Frontend changes belong under frontend/src; use React, TypeScript strict mode, React Router, and Recharts. Run `npm run lint` and `npm run build` from frontend/.
- Public application API is Go net/http under backend/. Validate inputs, bound requests/timeouts, return structured JSON errors, and keep Python inference private. Run `go test ./...` from backend/ when Go is installed.
- ML code is under ml/src. Training/inference must share preprocessing; split chronologically before fitting. Save the full preprocessing/model artifact and measured evaluation output. Never fabricate scores or evaluation metrics.
- Run Python tests with `python -m pytest ml/tests -q`. Do not download Kaggle data without the user's authorization and configured credentials.
- Do not introduce paid services or persistent databases without a demonstrated MVP need. Do not claim builds, tests, screenshots, or cloud deployment unless verified.
