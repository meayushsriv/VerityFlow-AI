# Cloud Run deployment

No Cloud Run project or deployment permissions were supplied for this build, and active account state was not queried. Deployment has not been performed.

Recommended: deploy the Go API as one Cloud Run service and the static frontend separately (e.g. a static host), configure `CORS_ORIGINS` to the exact frontend origin, and set `VITE_API_BASE_URL` at frontend build time to the API URL. The Python inference service must remain private (internal ingress/network path) and must not be exposed publicly. If deploying the Compose topology, use a managed private service-to-service connection for inference rather than publishing port 8001.

1. Install Google Cloud CLI and authenticate; select the intended project and region.
2. Enable Cloud Run, Artifact Registry, Cloud Build, and Vertex AI APIs. Grant the deployer build/push/deploy permissions. Create a least-privilege runtime identity and grant the minimum Vertex AI permissions needed for Gemini inference.
3. Create an Artifact Registry repository. Build/push the API image from the repository root with `docker build -f deploy/Dockerfile -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG backend` and `docker push REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG`.
4. Deploy the API privately: `gcloud run deploy verityflow-api --image REGION-docker.pkg.dev/PROJECT/REPOSITORY/verityflow-api:TAG --region REGION --service-account verityflow-runtime@PROJECT.iam.gserviceaccount.com --no-allow-unauthenticated --set-env-vars PORT=8080,CORS_ORIGINS=https://YOUR-FRONTEND.example,GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=PROJECT,GOOGLE_CLOUD_LOCATION=REGION,GEMINI_MODEL=gemini-2.5-flash`. The Go Gen AI SDK uses runtime ADC; no key is baked into the image. Cloud Run IAM alone does not transparently authenticate this SPA; keep the demo service private until a verified identity-aware frontend/API flow exists.
5. If a trained artifact is available, deploy inference separately with private ingress/network controls. Set the API `INFERENCE_URL` to its internal endpoint. Never expose Python inference publicly.
6. Build/deploy the frontend with `VITE_API_BASE_URL` pointing to the API and set exact-origin CORS. Do not make the service public before implementing identity token verification, analyst authorization, and case-level access control in Go.
7. If using Gemini Developer API instead of Vertex AI, store the API key in Secret Manager and mount it through supported secret environment configuration. Never place secrets in source, image layers, or command history.
8. Verify `/health`, `/ready`, demo overview, filtered transactions, investigation fallback/live mode, cases, confirmation-gated actions, reports, CORS, inference status, and frontend network calls.
9. Run `scripts/evaluate_agent.ps1 -ApiUrl https://VERIFIED_API_URL` and keep the measured output with the release record. It checks fixture workflows only, not production fraud accuracy.

Replace uppercase placeholders. No deployment URL or success is claimed until a live deployment is completed and verified. The current demo case store is in-memory and not tamper-proof; add approved durable storage and authentication before retaining real investigation records.
