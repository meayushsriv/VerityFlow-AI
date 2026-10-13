package storage

import (
	"fmt"
	"math"
	"math/rand"
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
	type merchantProfile struct {
		name, category string
		average, spread float64
	}
	merchants := []merchantProfile{
		{"Northstar Market", "grocery_pos", 76, 42}, {"Maple & Main Grocer", "grocery_pos", 64, 38},
		{"Green Basket Foods", "grocery_pos", 91, 55}, {"Pine Street Fuel", "gas_transport", 49, 24},
		{"Redtail Petroleum", "gas_transport", 57, 29}, {"Juniper Outfitters", "shopping_net", 148, 110},
		{"Northstar Electronics", "shopping_net", 236, 170}, {"Cedar & Thread", "shopping_net", 112, 78},
		{"Harbor Table", "food_dining", 68, 43}, {"Little Finch Cafe", "food_dining", 24, 14},
		{"Paloma Kitchen", "food_dining", 82, 51}, {"Cedar Cinema", "entertainment", 38, 22},
		{"Lantern Music Hall", "entertainment", 94, 61}, {"Westline Goods", "misc_pos", 87, 68},
		{"Lakeside Pharmacy", "misc_pos", 42, 31}, {"Foundry Home Supply", "misc_pos", 126, 96},
	}
	places := [][2]string{{"Austin", "TX"}, {"Raleigh", "NC"}, {"Madison", "WI"}, {"Tucson", "AZ"}, {"Portland", "ME"}, {"Richmond", "VA"}, {"Boise", "ID"}, {"Cleveland", "OH"}, {"Sacramento", "CA"}, {"Nashville", "TN"}}
	rng := rand.New(rand.NewSource(20261012))
	base := time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC)
	items := make([]models.Transaction, 0, 72)
	for i := 0; i < 72; i++ {
		merchant := merchants[rng.Intn(len(merchants))]
		place := places[rng.Intn(len(places))]
		amount := merchant.average + rng.NormFloat64()*merchant.spread
		if amount < 4.50 {
			amount = 4.50 + rng.Float64()*12
		}
		if i%17 == 0 {
			amount = 1650 + rng.Float64()*3200
		}
		day := rng.Intn(12)
		hour := 7 + rng.Intn(15)
		if i%19 == 0 {
			hour = 1 + rng.Intn(4)
		}
		ts := base.AddDate(0, 0, -day).Add(time.Duration(hour)*time.Hour + time.Duration(rng.Intn(60))*time.Minute)
		risk := 0.12 + (rng.Float64()-0.5)*0.12
		if amount >= 500 {
			risk = 0.43 + rng.Float64()*0.15
		}
		if amount >= fraud.HighAmountThreshold {
			risk = 0.76 + rng.Float64()*0.16
		}
		if fraud.IsUnusualHour(ts) {
			risk += 0.18
		}
		risk = math.Min(0.98, risk)
		band := "low"
		if risk >= 0.70 {
			band = "high"
		} else if risk >= 0.35 {
			band = "medium"
		}
		t := models.Transaction{ID: fmt.Sprintf("VF-DEMO-%04d", 1000+i), Timestamp: ts, Amount: math.Round(amount*100) / 100, Merchant: merchant.name, Category: merchant.category, City: place[0], State: place[1], RiskBand: band, DemoRisk: math.Round(risk*1000) / 1000}
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
