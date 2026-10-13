package handlers

import (
	"encoding/json"
	"github.com/verityflow-ai/verityflow/internal/storage"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

func testAPI() *API {
	return New(storage.NewDemoStore(), slog.New(slog.NewTextHandler(io.Discard, nil)), "")
}
func TestTransactionsPaginationAndFilterValidation(t *testing.T) {
	a := testAPI()
	w := httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?page=1&page_size=3", nil))
	var payload map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if len(payload["items"].([]any)) != 3 {
		t.Fatal("expected 3 items")
	}
	w = httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?min_amount=bad", nil))
	if w.Code != 400 {
		t.Fatalf("got %d, want 400", w.Code)
	}
}
func TestModelRoutesAreNotRegistered(t *testing.T) {
	a := testAPI()
	for _, path := range []string{"/api/v1/model/metrics", "/api/v1/predict"} {
		w := httptest.NewRecorder()
		a.Router(nil).ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 404 {
			t.Errorf("%s status %d, want 404", path, w.Code)
		}
	}
}

func TestRouterHealthAndCORS(t *testing.T) {
	a := testAPI()
	r := httptest.NewRequest("GET", "/health", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	w := httptest.NewRecorder()
	a.Router([]string{"http://localhost:5173"}).ServeHTTP(w, r)
	if w.Code != 200 {
		t.Fatalf("health status %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("unexpected CORS origin %q", got)
	}
}

func TestDateFilterAndHugePage(t *testing.T) {
	a := testAPI()
	w := httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?from_date=not-a-date", nil))
	if w.Code != 400 {
		t.Fatalf("date status %d", w.Code)
	}
	w = httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?page=2147483647&page_size=10", nil))
	if w.Code != 200 {
		t.Fatalf("large page status %d", w.Code)
	}
}

func TestAllCategoryAndNonFiniteAmountValidation(t *testing.T) {
	a := testAPI()
	w := httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?category=all&page_size=100", nil))
	var page map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
		t.Fatal(err)
	}
	if int(page["total"].(float64)) != 72 {
		t.Fatalf("category=all returned %v", page["total"])
	}
	w = httptest.NewRecorder()
	a.transactions(w, httptest.NewRequest("GET", "/api/v1/transactions?min_amount=NaN", nil))
	if w.Code != 400 {
		t.Fatalf("nonfinite amount status %d", w.Code)
	}
}

func TestInvestigationEvidenceAndConfirmedActionFlow(t *testing.T) {
	a := testAPI()
	request := httptest.NewRequest("POST", "/api/v1/transactions/VF-DEMO-1000/investigate", strings.NewReader(`{"question":"Explain the signals"}`))
	response := httptest.NewRecorder()
	a.Router([]string{"http://localhost:5173"}).ServeHTTP(response, request)
	if response.Code != 200 {
		t.Fatalf("investigation status %d: %s", response.Code, response.Body.String())
	}
	var report struct {
		CaseID   string           `json:"case_id"`
		Evidence []map[string]any `json:"evidence"`
		Findings []map[string]any `json:"findings"`
		Mode     string           `json:"mode"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &report); err != nil {
		t.Fatal(err)
	}
	if report.Mode != "deterministic_fallback" || len(report.Evidence) == 0 || len(report.Findings) == 0 {
		t.Fatal("expected evidence-backed fallback report")
	}
	body := `{"transaction_id":"VF-DEMO-1000","action":"under_review","rationale":"Reviewed evidence and will verify independently.","confirmed":false}`
	request = httptest.NewRequest("POST", "/api/v1/cases/"+report.CaseID+"/actions", strings.NewReader(body))
	response = httptest.NewRecorder()
	a.Router(nil).ServeHTTP(response, request)
	if response.Code != 409 {
		t.Fatalf("unconfirmed action status %d", response.Code)
	}
	body = `{"transaction_id":"VF-DEMO-1000","action":"under_review","rationale":"Reviewed evidence and will verify independently.","confirmed":true}`
	request = httptest.NewRequest("POST", "/api/v1/cases/"+report.CaseID+"/actions", strings.NewReader(body))
	response = httptest.NewRecorder()
	a.Router(nil).ServeHTTP(response, request)
	if response.Code != 201 {
		t.Fatalf("confirmed action status %d: %s", response.Code, response.Body.String())
	}
	request = httptest.NewRequest("GET", "/api/v1/cases/"+report.CaseID+"/audit", nil)
	response = httptest.NewRecorder()
	a.Router(nil).ServeHTTP(response, request)
	if response.Code != 200 || !strings.Contains(response.Body.String(), "under_review") {
		t.Fatalf("audit event missing: %s", response.Body.String())
	}
	request = httptest.NewRequest("POST", "/api/v1/cases/"+report.CaseID+"/report", strings.NewReader(`{}`))
	response = httptest.NewRecorder()
	a.Router(nil).ServeHTTP(response, request)
	if response.Code != 200 || !strings.Contains(response.Body.String(), "content_sha256") {
		t.Fatalf("report status %d: %s", response.Code, response.Body.String())
	}
}
