# API examples

Base URL: `http://localhost:8080`

```http
GET /health
GET /api/v1/overview
GET /api/v1/transactions?page=1&page_size=10&q=market&risk=high&min_amount=50&max_amount=2000
GET /api/v1/transactions/VF-DEMO-1000
```

The API serves stable fictional transaction records directly from Go. It has no prediction or model-metrics endpoints; fixture scores are illustrative, not deployed.
