package services

import (
	"context"
	"testing"

	"github.com/verityflow-ai/verityflow/internal/storage"
)

func TestInvestigationUsesExplicitDeterministicFallbackAndEvidence(t *testing.T) {
	t.Setenv("GOOGLE_API_KEY", "")
	t.Setenv("GEMINI_API_KEY", "")
	t.Setenv("GOOGLE_GENAI_USE_VERTEXAI", "")
	service := NewInvestigationService(storage.NewDemoStore())
	result, err := service.Investigate(context.Background(), "VF-DEMO-1000", "Explain the alert")
	if err != nil {
		t.Fatal(err)
	}
	if result.Mode != "deterministic_fallback" {
		t.Fatalf("unexpected mode %q", result.Mode)
	}
	known := map[string]bool{}
	for _, item := range result.Evidence {
		known[item.ID] = true
	}
	if len(result.Findings) == 0 {
		t.Fatal("expected supported findings")
	}
	for _, finding := range result.Findings {
		for _, ref := range finding.EvidenceIDs {
			if !known[ref] {
				t.Fatalf("unsupported evidence ref %s", ref)
			}
		}
	}
	if !result.RequiresAnalystConfirmation {
		t.Fatal("analyst confirmation must remain required")
	}
}

func TestInvestigationRejectsMissingTransactionWithoutOpeningCase(t *testing.T) {
	store := storage.NewDemoStore()
	service := NewInvestigationService(store)
	if _, err := service.Investigate(context.Background(), "missing", "review"); err == nil {
		t.Fatal("expected missing transaction error")
	}
	if cases := store.CasesSnapshot(); len(cases) != 0 {
		t.Fatalf("opened %d cases for missing transaction", len(cases))
	}
}

func TestAnalystActionRequiresValidStatusAndRationale(t *testing.T) {
	store := storage.NewDemoStore()
	service := NewInvestigationService(store)
	caseItem := store.CaseForTransaction("VF-DEMO-1000")
	if _, err := service.RecordAction(caseItem.ID, caseItem.TransactionID, "closed", "short", "analyst"); err == nil {
		t.Fatal("expected short rationale validation")
	}
	if _, err := service.RecordAction(caseItem.ID, caseItem.TransactionID, "fraud_proven", "Independent review completed", "analyst"); err == nil {
		t.Fatal("must reject unsupported/conclusive status")
	}
	event, err := service.RecordAction(caseItem.ID, caseItem.TransactionID, "under_review", "Reviewed fixture only", "demo_analyst")
	if err != nil {
		t.Fatal(err)
	}
	if event.Action != "under_review" {
		t.Fatalf("got action %q", event.Action)
	}
}
