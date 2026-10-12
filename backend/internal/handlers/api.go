package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/verityflow-ai/verityflow/internal/fraud"
	"github.com/verityflow-ai/verityflow/internal/middleware"
	"github.com/verityflow-ai/verityflow/internal/models"
	"github.com/verityflow-ai/verityflow/internal/services"
	"github.com/verityflow-ai/verityflow/internal/storage"
)

type API struct {
	store          *storage.Store
	logger         *slog.Logger
	inferenceURL   string
	evaluationPath string
	investigation  *services.InvestigationService
	agentSlots     chan struct{}
}

func New(store *storage.Store, logger *slog.Logger, inferenceURL string, evaluationPaths ...string) *API {
	path := "../ml/artifacts/evaluation.json"
	model := "gemini-2.5-flash"
	if len(evaluationPaths) > 0 && evaluationPaths[0] != "" {
		path = evaluationPaths[0]
	}
	if len(evaluationPaths) > 1 && evaluationPaths[1] != "" {
		model = evaluationPaths[1]
	}
	return &API{store: store, logger: logger, inferenceURL: inferenceURL, evaluationPath: path, investigation: services.NewInvestigationService(store, model), agentSlots: make(chan struct{}, 4)}
}
func (a *API) Router(origins []string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", a.health)
	mux.HandleFunc("GET /ready", a.ready)
	mux.HandleFunc("GET /api/v1/config", a.config)
	mux.HandleFunc("GET /api/v1/overview", a.overview)
	mux.HandleFunc("GET /api/v1/transactions", a.transactions)
	mux.HandleFunc("GET /api/v1/transactions/{id}", a.transaction)
	mux.HandleFunc("GET /api/v1/model/metrics", a.metrics)
	mux.HandleFunc("POST /api/v1/predict", a.predict)
	mux.HandleFunc("GET /api/v1/analytics/fraud-trends", a.trends)
	mux.HandleFunc("GET /api/v1/analytics/categories", a.categories)
	mux.HandleFunc("POST /api/v1/transactions/{id}/investigate", a.investigate)
	mux.HandleFunc("GET /api/v1/transactions/{id}/compare", a.compareTransactions)
	mux.HandleFunc("GET /api/v1/cases", a.cases)
	mux.HandleFunc("GET /api/v1/cases/{id}", a.caseDetail)
	mux.HandleFunc("GET /api/v1/cases/{id}/audit", a.caseAudit)
	mux.HandleFunc("POST /api/v1/cases/{id}/actions", a.recordCaseAction)
	mux.HandleFunc("POST /api/v1/cases/{id}/report", a.createReport)
	return middleware.Security(origins, mux)
}
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func errorJSON(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]string{"error": code, "message": message})
}
func (a *API) health(w http.ResponseWriter, r *http.Request) {
	modelAvailable := false
	if a.inferenceURL != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 750*time.Millisecond)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(a.inferenceURL, "/")+"/health", nil)
		if err == nil {
			resp, err := (&http.Client{Timeout: 750 * time.Millisecond}).Do(req)
			if err == nil {
				var state struct {
					ModelAvailable bool `json:"model_available"`
				}
				if resp.StatusCode == http.StatusOK && json.NewDecoder(http.MaxBytesReader(w, resp.Body, 2<<10)).Decode(&state) == nil {
					modelAvailable = state.ModelAvailable
				}
				resp.Body.Close()
			}
		}
	}
	writeJSON(w, 200, map[string]any{"status": "ok", "mode": "synthetic_demo", "model_available": modelAvailable})
}
func (a *API) ready(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{"status": "ready", "demo_mode": true, "gemini_configured": a.investigation.Available(), "model_status": "unavailable"})
}
func (a *API) config(w http.ResponseWriter, _ *http.Request) {
	modelStatus := "unavailable"
	if a.investigation.Available() {
		modelStatus = "gemini_configured"
	}
	writeJSON(w, 200, map[string]any{"demo_mode": true, "dataset": "synthetic UI fixtures", "model_status": "unavailable", "gemini_status": modelStatus, "risk_thresholds": map[string]float64{"medium": 0.35, "high": 0.70}, "high_amount_review_usd": fraud.HighAmountThreshold})
}
func (a *API) metrics(w http.ResponseWriter, _ *http.Request) {
	content, err := os.ReadFile(a.evaluationPath)
	if err != nil {
		errorJSON(w, http.StatusServiceUnavailable, "model_unavailable", "No trained model evaluation artifact is available. Place the Kaggle files and run the documented training pipeline.")
		return
	}
	var metrics map[string]any
	if err := json.Unmarshal(content, &metrics); err != nil {
		errorJSON(w, http.StatusServiceUnavailable, "invalid_metrics", "Saved evaluation output is invalid JSON.")
		return
	}
	writeJSON(w, http.StatusOK, metrics)
}
func (a *API) predict(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 32<<10)
	var input struct {
		Amount            float64 `json:"amount"`
		Category          string  `json:"category"`
		Merchant          string  `json:"merchant"`
		State             string  `json:"state"`
		Timestamp         string  `json:"timestamp"`
		CityPopulation    float64 `json:"city_population"`
		Latitude          float64 `json:"latitude"`
		Longitude         float64 `json:"longitude"`
		MerchantLatitude  float64 `json:"merchant_latitude"`
		MerchantLongitude float64 `json:"merchant_longitude"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&input); err != nil {
		errorJSON(w, 400, "invalid_request", "Provide a valid JSON transaction request.")
		return
	}
	if input.Amount < 0 || input.Amount > 1e9 || math.IsNaN(input.Amount) || math.IsInf(input.Amount, 0) || len(input.Category) > 80 || len(input.Merchant) > 120 || len(input.State) > 8 || input.CityPopulation < 0 || !finite(input.CityPopulation) || !validCoordinate(input.Latitude, -90, 90) || !validCoordinate(input.MerchantLatitude, -90, 90) || !validCoordinate(input.Longitude, -180, 180) || !validCoordinate(input.MerchantLongitude, -180, 180) {
		errorJSON(w, 400, "invalid_request", "Amount, category, merchant, population, state, and coordinates must be within their documented limits.")
		return
	}
	ts, err := time.Parse(time.RFC3339, input.Timestamp)
	if err != nil {
		ts, err = time.Parse("2006-01-02 15:04:05", input.Timestamp)
	}
	if err != nil {
		errorJSON(w, 400, "invalid_request", "timestamp must be RFC3339 or YYYY-MM-DD HH:MM:SS.")
		return
	}
	if a.inferenceURL == "" {
		errorJSON(w, http.StatusServiceUnavailable, "model_unavailable", "Prediction is unavailable until a verified model artifact and private inference service are configured.")
		return
	}
	payload := map[string]any{"amt": input.Amount, "category": input.Category, "merchant": input.Merchant, "state": input.State, "trans_date_trans_time": ts.Format(time.RFC3339), "city_pop": input.CityPopulation, "lat": input.Latitude, "long": input.Longitude, "merch_lat": input.MerchantLatitude, "merch_long": input.MerchantLongitude}
	body, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(a.inferenceURL, "/")+"/predict", bytes.NewReader(body))
	if err != nil {
		errorJSON(w, 503, "inference_unavailable", "Inference service is unavailable.")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := (&http.Client{Timeout: 4 * time.Second}).Do(req)
	if err != nil {
		errorJSON(w, 503, "inference_unavailable", "Inference service did not respond within the configured timeout.")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		errorJSON(w, 503, "inference_unavailable", "Inference service could not produce a verified model prediction.")
		return
	}
	var result struct {
		ModelVersion   string  `json:"model_version"`
		RiskScore      float64 `json:"risk_score"`
		Threshold      float64 `json:"threshold"`
		PredictedLabel int     `json:"predicted_label"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, resp.Body, 16<<10)).Decode(&result); err != nil || !finite(result.RiskScore) || result.RiskScore < 0 || result.RiskScore > 1 || result.PredictedLabel < 0 || result.PredictedLabel > 1 {
		errorJSON(w, 503, "invalid_model_response", "Inference service returned an invalid model response.")
		return
	}
	band := "low"
	if result.RiskScore >= 0.70 {
		band = "high"
	} else if result.RiskScore >= 0.35 {
		band = "medium"
	}
	writeJSON(w, 200, map[string]any{"model_version": result.ModelVersion, "risk_score": result.RiskScore, "threshold": result.Threshold, "predicted_label": result.PredictedLabel, "risk_band": band, "interpretation": "Model alert only; not proof of fraud."})
}
func finite(v float64) bool                    { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func validCoordinate(v, min, max float64) bool { return finite(v) && v >= min && v <= max }
func query(r *http.Request) url.Values         { return r.URL.Query() }
func (a *API) filtered(q url.Values) ([]models.Transaction, string) {
	items := make([]models.Transaction, 0)
	search := strings.ToLower(strings.TrimSpace(q.Get("q")))
	category := q.Get("category")
	risk := q.Get("risk")
	minS, maxS := q.Get("min_amount"), q.Get("max_amount")
	if len(search) > 120 {
		return nil, "q must be at most 120 characters"
	}
	if risk != "" && risk != "all" && risk != "low" && risk != "medium" && risk != "high" {
		return nil, "risk must be low, medium, high, or all"
	}
	validCategories := map[string]bool{"grocery_pos": true, "gas_transport": true, "shopping_net": true, "food_dining": true, "entertainment": true, "misc_pos": true}
	if category != "" && category != "all" && !validCategories[category] {
		return nil, "category is not supported"
	}
	fromDate, toDate := time.Time{}, time.Time{}
	if value := q.Get("from_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			return nil, "from_date must use YYYY-MM-DD"
		}
		fromDate = parsed
	}
	if value := q.Get("to_date"); value != "" {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			return nil, "to_date must use YYYY-MM-DD"
		}
		toDate = parsed
	}
	if !fromDate.IsZero() && !toDate.IsZero() && fromDate.After(toDate) {
		return nil, "from_date must not be after to_date"
	}
	min, max := 0.0, math.MaxFloat64
	if minS != "" {
		v, e := strconv.ParseFloat(minS, 64)
		if e != nil || v < 0 || !finite(v) {
			return nil, "min_amount must be a finite non-negative number"
		}
		min = v
	}
	if maxS != "" {
		v, e := strconv.ParseFloat(maxS, 64)
		if e != nil || v < 0 || !finite(v) {
			return nil, "max_amount must be a finite non-negative number"
		}
		max = v
	}
	if min > max {
		return nil, "min_amount must not exceed max_amount"
	}
	for _, t := range a.store.Transactions {
		if category != "" && category != "all" && t.Category != category {
			continue
		}
		if risk != "" && risk != "all" && t.RiskBand != risk {
			continue
		}
		if t.Amount < min || t.Amount > max {
			continue
		}
		if !fromDate.IsZero() && t.Timestamp.Before(fromDate) {
			continue
		}
		if !toDate.IsZero() && !t.Timestamp.Before(toDate.Add(24*time.Hour)) {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(t.ID+" "+t.Merchant+" "+t.Category+" "+t.City+" "+t.State), search) {
			continue
		}
		items = append(items, t)
	}
	return items, ""
}
func pageInt(v string, fallback int) int {
	n, e := strconv.Atoi(v)
	if e != nil || n < 1 {
		return fallback
	}
	return n
}
func (a *API) transactions(w http.ResponseWriter, r *http.Request) {
	items, err := a.filtered(query(r))
	if err != "" {
		errorJSON(w, 400, "invalid_filter", err)
		return
	}
	values := r.URL.Query()
	page, size := pageInt(values.Get("page"), 1), pageInt(values.Get("page_size"), 20)
	if size > 100 {
		size = 100
	}
	sortBy, order := values.Get("sort"), values.Get("order")
	if sortBy == "" {
		sortBy = "risk"
	}
	if order == "" {
		order = "desc"
	}
	if sortBy != "risk" && sortBy != "amount" && sortBy != "timestamp" {
		errorJSON(w, 400, "invalid_sort", "sort must be risk, amount, or timestamp")
		return
	}
	if order != "asc" && order != "desc" {
		errorJSON(w, 400, "invalid_sort", "order must be asc or desc")
		return
	}
	sort.SliceStable(items, func(i, j int) bool {
		if order == "desc" {
			switch sortBy {
			case "amount":
				return items[i].Amount > items[j].Amount
			case "timestamp":
				return items[i].Timestamp.After(items[j].Timestamp)
			default:
				return items[i].DemoRisk > items[j].DemoRisk
			}
		}
		switch sortBy {
		case "amount":
			return items[i].Amount < items[j].Amount
		case "timestamp":
			return items[i].Timestamp.Before(items[j].Timestamp)
		default:
			return items[i].DemoRisk < items[j].DemoRisk
		}
	})
	total := len(items)
	start := total
	if page-1 <= total/size {
		start = (page - 1) * size
		if start > total {
			start = total
		}
	}
	end := start + size
	if end > total {
		end = total
	}
	writeJSON(w, 200, models.Page{Items: items[start:end], Total: total, Page: page, PageSize: size})
}
func (a *API) transaction(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	for _, t := range a.store.Transactions {
		if t.ID == id {
			writeJSON(w, 200, t)
			return
		}
	}
	errorJSON(w, 404, "not_found", "Transaction was not found.")
}
func (a *API) investigate(w http.ResponseWriter, r *http.Request) {
	select {
	case a.agentSlots <- struct{}{}:
		defer func() { <-a.agentSlots }()
	default:
		errorJSON(w, http.StatusTooManyRequests, "agent_busy", "Investigation service is busy; retry shortly.")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
	var input struct {
		Question string `json:"question"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil || len(input.Question) > 600 {
		errorJSON(w, 400, "invalid_request", "Provide a question of at most 600 characters.")
		return
	}
	result, err := a.investigation.Investigate(r.Context(), r.PathValue("id"), input.Question)
	if err != nil {
		if err.Error() == "transaction not found" {
			errorJSON(w, 404, "not_found", "Transaction was not found.")
			return
		}
		errorJSON(w, 503, "investigation_unavailable", "Investigation could not be completed.")
		return
	}
	caseItem := a.store.CaseForTransaction(result.Evidence[0].TransactionID)
	a.store.AddEvidence(caseItem.ID, result.Evidence)
	toolSummary, _ := json.Marshal(result.ToolCalls)
	a.store.AppendEvent(caseItem.ID, result.Evidence[0].TransactionID, "agent_investigation_completed", string(toolSummary), "demo_system")
	writeJSON(w, 200, result)
}
func (a *API) compareTransactions(w http.ResponseWriter, r *http.Request) {
	leftID := r.PathValue("id")
	rightID := strings.TrimSpace(r.URL.Query().Get("with_id"))
	if rightID == "" || len(rightID) > 64 || rightID == leftID {
		errorJSON(w, 400, "invalid_comparison", "Provide a different valid transaction ID in with_id.")
		return
	}
	left, lok := a.store.Transaction(leftID)
	right, rok := a.store.Transaction(rightID)
	if !lok || !rok {
		errorJSON(w, 404, "not_found", "One or both transactions were not found.")
		return
	}
	leftEvidence, _, _ := a.investigation.BuildEvidence(leftID)
	rightEvidence, _, _ := a.investigation.BuildEvidence(rightID)
	writeJSON(w, 200, map[string]any{"left": left, "right": right, "comparison": map[string]any{"amount_delta": math.Round((left.Amount-right.Amount)*100) / 100, "same_category": left.Category == right.Category, "risk_band_delta": map[string]string{"left": left.RiskBand, "right": right.RiskBand}, "left_rule_ids": evidenceRuleIDs(leftEvidence), "right_rule_ids": evidenceRuleIDs(rightEvidence)}, "mode": "synthetic_demo", "limitations": "Fixture comparison only; scores are not model outputs and similarity is not a validated peer group."})
}
func (a *API) cases(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, 200, map[string]any{"items": a.store.CasesSnapshot(), "mode": "synthetic_demo"})
}
func (a *API) caseDetail(w http.ResponseWriter, r *http.Request) {
	caseItem, ok := a.store.Case(r.PathValue("id"))
	if !ok {
		errorJSON(w, 404, "not_found", "Case was not found.")
		return
	}
	writeJSON(w, 200, map[string]any{"case": caseItem, "evidence": a.store.EvidenceForCase(caseItem.ID), "events": a.store.EventsForCase(caseItem.ID), "transaction": func() any {
		tx, ok := a.store.Transaction(caseItem.TransactionID)
		if !ok {
			return nil
		}
		return tx
	}()})
}
func (a *API) caseAudit(w http.ResponseWriter, r *http.Request) {
	if _, ok := a.store.Case(r.PathValue("id")); !ok {
		errorJSON(w, 404, "not_found", "Case was not found.")
		return
	}
	writeJSON(w, 200, map[string]any{"items": a.store.EventsForCase(r.PathValue("id")), "durability": "in-memory demo audit history; not tamper-proof"})
}
func (a *API) recordCaseAction(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 8<<10)
	var input struct {
		TransactionID string `json:"transaction_id"`
		Action        string `json:"action"`
		Rationale     string `json:"rationale"`
		Confirmed     bool   `json:"confirmed"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		errorJSON(w, 400, "invalid_request", "Provide a valid analyst action.")
		return
	}
	if !input.Confirmed {
		errorJSON(w, 409, "confirmation_required", "Confirm the analyst action before recording it.")
		return
	}
	event, err := a.investigation.RecordAction(r.PathValue("id"), input.TransactionID, input.Action, input.Rationale, "demo_analyst")
	if err != nil {
		errorJSON(w, 400, "invalid_action", err.Error())
		return
	}
	writeJSON(w, 201, map[string]any{"event": event, "disclaimer": "Application-level in-memory audit event; not tamper-proof."})
}
func (a *API) createReport(w http.ResponseWriter, r *http.Request) {
	caseItem, ok := a.store.Case(r.PathValue("id"))
	if !ok {
		errorJSON(w, 404, "not_found", "Case was not found.")
		return
	}
	evidence := a.store.EvidenceForCase(caseItem.ID)
	if len(evidence) == 0 {
		errorJSON(w, 409, "evidence_unavailable", "Run the investigation agent before generating a report.")
		return
	}
	events := a.store.EventsForCase(caseItem.ID)
	report := map[string]any{"case": caseItem, "transaction_id": caseItem.TransactionID, "evidence": evidence, "audit_events": events, "generated_at": time.Now().UTC(), "provenance": "Synthetic demo case report", "disclaimer": "Investigation support only; not proof of fraud.", "audit_limitations": "Application-level in-memory history is not tamper-proof or durable."}
	encoded, _ := json.Marshal(report)
	sum := sha256.Sum256(encoded)
	report["content_sha256"] = hex.EncodeToString(sum[:])
	a.store.AppendEvent(caseItem.ID, caseItem.TransactionID, "report_generated", fmt.Sprintf("sha256:%x", sum[:]), "demo_analyst")
	writeJSON(w, 200, report)
}
func evidenceRuleIDs(items []models.Evidence) []string {
	ids := []string{}
	for _, item := range items {
		if item.SourceType == "deterministic_rule" {
			ids = append(ids, item.RuleID)
		}
	}
	return ids
}
func (a *API) overview(w http.ResponseWriter, r *http.Request) {
	items, err := a.filtered(query(r))
	if err != "" {
		errorJSON(w, 400, "invalid_filter", err)
		return
	}
	alerts, high, flagged := 0, 0, 0.0
	risk := map[string]int{"low": 0, "medium": 0, "high": 0}
	for _, t := range items {
		risk[t.RiskBand]++
		if t.RiskBand == "high" {
			alerts++
			flagged += t.Amount
		}
		if len(t.Findings) > 0 {
			high++
		}
	}
	writeJSON(w, 200, map[string]any{"total_transactions": len(items), "high_risk_scenarios": alerts, "lower_risk_scenarios": len(items) - alerts, "alert_rate": ratio(alerts, len(items)), "flagged_amount": math.Round(flagged*100) / 100, "rule_review_count": high, "risk_distribution": risk, "mode": "synthetic_demo", "disclaimer": "Fictional demo scenarios; not observed customer transactions or model predictions."})
}
func ratio(a, b int) float64 {
	if b == 0 {
		return 0
	}
	return float64(a) / float64(b)
}
func (a *API) trends(w http.ResponseWriter, r *http.Request) {
	items, err := a.filtered(query(r))
	if err != "" {
		errorJSON(w, 400, "invalid_filter", err)
		return
	}
	daily := map[string]map[string]int{}
	for _, t := range items {
		k := t.Timestamp.Format("2006-01-02")
		if daily[k] == nil {
			daily[k] = map[string]int{"total": 0, "alerts": 0}
		}
		daily[k]["total"]++
		if t.RiskBand == "high" {
			daily[k]["alerts"]++
		}
	}
	keys := make([]string, 0, len(daily))
	for date := range daily {
		keys = append(keys, date)
	}
	sort.Strings(keys)
	out := make([]map[string]any, 0, len(daily))
	for _, date := range keys {
		v := daily[date]
		out = append(out, map[string]any{"date": date, "total": v["total"], "alerts": v["alerts"]})
	}
	writeJSON(w, 200, map[string]any{"items": out, "mode": "synthetic_demo"})
}
func (a *API) categories(w http.ResponseWriter, r *http.Request) {
	items, err := a.filtered(query(r))
	if err != "" {
		errorJSON(w, 400, "invalid_filter", err)
		return
	}
	by := map[string]map[string]any{}
	for _, t := range items {
		if by[t.Category] == nil {
			by[t.Category] = map[string]any{"category": t.Category, "total": 0, "alerts": 0, "amount": 0.0}
		}
		x := by[t.Category]
		x["total"] = x["total"].(int) + 1
		if t.RiskBand == "high" {
			x["alerts"] = x["alerts"].(int) + 1
		}
		x["amount"] = x["amount"].(float64) + t.Amount
	}
	keys := make([]string, 0, len(by))
	for category := range by {
		keys = append(keys, category)
	}
	sort.Strings(keys)
	out := make([]map[string]any, 0, len(by))
	for _, category := range keys {
		out = append(out, by[category])
	}
	writeJSON(w, 200, map[string]any{"items": out, "mode": "synthetic_demo", "generated_at": time.Now().UTC()})
}
