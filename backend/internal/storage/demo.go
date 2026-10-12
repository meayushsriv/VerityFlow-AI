package storage

import (
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/verityflow-ai/verityflow/internal/fraud"
	"github.com/verityflow-ai/verityflow/internal/models"
)

type Store struct {
	Transactions []models.Transaction
	mu           sync.RWMutex
	Cases        map[string]models.Case
	Events       []models.AuditEvent
	Evidence     map[string][]models.Evidence
}

// NewDemoStore creates clearly labelled, fictional scenarios for UI exploration only.
func NewDemoStore() *Store {
	categories := []string{"grocery_pos", "gas_transport", "shopping_net", "food_dining", "entertainment", "misc_pos"}
	merchants := []string{"Northstar Market", "Pine Street Fuel", "Juniper Outfitters", "Harbor Table", "Cedar Cinema", "Westline Goods"}
	places := [][2]string{{"Austin", "TX"}, {"Raleigh", "NC"}, {"Madison", "WI"}, {"Tucson", "AZ"}, {"Portland", "ME"}}
	base := time.Date(2026, 10, 12, 12, 0, 0, 0, time.UTC)
	items := make([]models.Transaction, 0, 72)
	for i := 0; i < 72; i++ {
		cat := i % len(categories)
		place := places[(i*7+i/4)%len(places)]
		amount := 18.0 + float64((i*83)%620) + float64(i%100)/100
		hour := 7 + (i*5)%15
		if i%17 == 0 {
			amount = 1825.45 + float64(i)
			hour = 2
		}
		if i%11 == 0 {
			amount = 995.0 + float64(i%7)*145
		}
		ts := base.Add(-time.Duration(i*3+i%5) * time.Hour).Add(time.Duration(hour-base.Add(-time.Duration(i*3+i%5)*time.Hour).Hour()) * time.Hour)
		risk := math.Min(0.96, 0.04+float64((i*13)%55)/100)
		if amount >= fraud.HighAmountThreshold || fraud.IsUnusualHour(ts) {
			risk = math.Max(risk, 0.71+float64(i%25)/100)
		}
		band := "low"
		if risk >= 0.70 {
			band = "high"
		} else if risk >= 0.35 {
			band = "medium"
		}
		t := models.Transaction{ID: fmt.Sprintf("VF-DEMO-%04d", 1000+i), Timestamp: ts, Amount: math.Round(amount*100) / 100, Merchant: merchants[cat], Category: categories[cat], City: place[0], State: place[1], RiskBand: band, DemoRisk: math.Round(risk*1000) / 1000}
		t.Findings = fraud.Findings(t)
		items = append(items, t)
	}
	return &Store{Transactions: items, Cases: make(map[string]models.Case), Evidence: make(map[string][]models.Evidence)}
}

func (s *Store) Transaction(id string) (models.Transaction, bool) {
	for _, tx := range s.Transactions {
		if tx.ID == id {
			return tx, true
		}
	}
	return models.Transaction{}, false
}

func (s *Store) CaseForTransaction(transactionID string) models.Case {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, item := range s.Cases {
		if item.TransactionID == transactionID {
			return item
		}
	}
	now := time.Now().UTC()
	id := "CASE-" + transactionID
	item := models.Case{ID: id, TransactionID: transactionID, Status: "open", CreatedAt: now, UpdatedAt: now}
	s.Cases[id] = item
	s.Events = append(s.Events, models.AuditEvent{ID: fmt.Sprintf("AUD-%06d", len(s.Events)+1), CaseID: id, TransactionID: transactionID, Action: "case_opened", Actor: "system", At: now})
	return item
}

func (s *Store) AppendAction(caseID, transactionID, action, rationale, actor string) (models.AuditEvent, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.Cases[caseID]
	if !ok || item.TransactionID != transactionID {
		return models.AuditEvent{}, false
	}
	now := time.Now().UTC()
	item.Status = action
	item.UpdatedAt = now
	s.Cases[caseID] = item
	event := models.AuditEvent{ID: fmt.Sprintf("AUD-%06d", len(s.Events)+1), CaseID: caseID, TransactionID: transactionID, Action: action, Rationale: rationale, Actor: actor, At: now}
	s.Events = append(s.Events, event)
	return event, true
}

func (s *Store) AppendEvent(caseID, transactionID, action, rationale, actor string) (models.AuditEvent, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, ok := s.Cases[caseID]
	if !ok || item.TransactionID != transactionID {
		return models.AuditEvent{}, false
	}
	event := models.AuditEvent{ID: fmt.Sprintf("AUD-%06d", len(s.Events)+1), CaseID: caseID, TransactionID: transactionID, Action: action, Rationale: rationale, Actor: actor, At: time.Now().UTC()}
	s.Events = append(s.Events, event)
	return event, true
}

func (s *Store) EventsForCase(caseID string) []models.AuditEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	events := make([]models.AuditEvent, 0)
	for _, event := range s.Events {
		if event.CaseID == caseID {
			events = append(events, event)
		}
	}
	return events
}

func (s *Store) Case(caseID string) (models.Case, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.Cases[caseID]
	return item, ok
}

func (s *Store) CasesSnapshot() []models.Case {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]models.Case, 0, len(s.Cases))
	for _, item := range s.Cases {
		items = append(items, item)
	}
	return items
}

func (s *Store) AddEvidence(caseID string, items []models.Evidence) {
	s.mu.Lock()
	defer s.mu.Unlock()
	existing := s.Evidence[caseID]
	seen := make(map[string]bool, len(existing)+len(items))
	for _, item := range existing {
		seen[item.ID] = true
	}
	for _, item := range items {
		if !seen[item.ID] {
			existing = append(existing, item)
			seen[item.ID] = true
		}
	}
	s.Evidence[caseID] = existing
}

func (s *Store) EvidenceForCase(caseID string) []models.Evidence {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := append([]models.Evidence(nil), s.Evidence[caseID]...)
	return items
}
