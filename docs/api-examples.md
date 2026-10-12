# API examples

Base URL: `http://localhost:8080`

```http
GET /health
GET /api/v1/overview
GET /api/v1/transactions?page=1&page_size=10&q=market&risk=high&min_amount=50&max_amount=2000
GET /api/v1/transactions/VF-DEMO-1000
GET /api/v1/model/metrics
```

Prediction currently fails closed unless a valid trained inference service is configured:

```http
POST /api/v1/predict
Content-Type: application/json

{"amount":125.50,"category":"grocery_pos","timestamp":"2026-10-12T10:30:00Z"}
```

Expected current result: HTTP 503 with `model_unavailable`. Never treat synthetic scores as deployed predictions.
