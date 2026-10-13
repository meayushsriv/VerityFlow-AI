# Cloud Run deployment

No Cloud Run project or deployment permissions were supplied for this build, and active account state was not queried. Deployment has not been performed.

Deploy the Go API as one Cloud Run service and the static frontend separately (e.g. a static host), configure `CORS_ORIGINS` to the exact frontend origin, and set `VITE_API_BASE_URL` at frontend build time to the API URL. The Go API serves all synthetic transactions and demo review scores itself. The `ml/` Python directory, model artifacts, and inference services are not part of the deployment.

1. Install Google Cloud CLI and authenticate; select the intended project and region.
2. Enable Cloud Run, Artifact Registry, and Cloud Build APIs. Grant the deployer build/push/deploy permissions. Optional Vertex AI/Gemini investigations require separate API enablement and runtime permissions; they are not needed for the synthetic demo.
3. Create an Artifact Registry repository. Build/push the API image from the repository root with `docker build -f deploy/Dockerfile -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG backend` and `docker push REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG`.
4. Deploy the API privately: `gcloud run deploy verityflow-api --image REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG --region REGION --service-account verityflow-runtime@PROJECT.iam.gserviceaccount.com --no-allow-unauthenticated --set-env-vars PORT=8080,CORS_ORIGINS=https://YOUR-FRONTEND.example`. This default demo deployment requires no model or AI credentials. Cloud Run IAM alone does not transparently authenticate this SPA; keep the demo service private until a verified identity-aware frontend/API flow exists.
5. Build/deploy the frontend with `VITE_API_BASE_URL` pointing to the API and set exact-origin CORS. Do not make the service public before implementing identity token verification, analyst authorization, and case-level access control in Go.
6. If using Gemini Developer API instead of Vertex AI, store the API key in Secret Manager and mount it through supported secret environment configuration. Never place secrets in source, image layers, or command history.
7. Verify `/health`, `/ready`, demo overview, filtered transactions, investigation fallback/live mode, cases, confirmation-gated actions, reports, CORS, and frontend network calls.
8. Run `scripts/evaluate_agent.ps1 -ApiUrl https://VERIFIED_API_URL` and keep the measured output with the release record. It checks synthetic fixture workflows only, not production fraud accuracy.

Replace uppercase placeholders. No deployment URL or success is claimed until a live deployment is completed and verified. The current demo case store is in-memory and not tamper-proof; add approved durable storage and authentication before retaining real investigation records.
