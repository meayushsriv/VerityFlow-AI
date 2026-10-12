package models

import "time"

type RuleFinding struct {
	Code     string `json:"code"`
	Title    string `json:"title"`
	Evidence string `json:"evidence"`
	Severity string `json:"severity"`
}

type Transaction struct {
	ID        string        `json:"id"`
	Timestamp time.Time     `json:"timestamp"`
	Amount    float64       `json:"amount"`
	Merchant  string        `json:"merchant"`
	Category  string        `json:"category"`
	City      string        `json:"city"`
	State     string        `json:"state"`
	RiskBand  string        `json:"risk_band"`
	DemoRisk  float64       `json:"demo_risk"`
	Findings  []RuleFinding `json:"findings"`
}

type Page struct {
	Items    []Transaction `json:"items"`
	Total    int           `json:"total"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
}

type Evidence struct {
	ID            string    `json:"id"`
	SourceType    string    `json:"source_type"`
	TransactionID string    `json:"transaction_id,omitempty"`
	RuleID        string    `json:"rule_id,omitempty"`
	ObservedValue any       `json:"observed_value,omitempty"`
	DerivedValue  any       `json:"derived_value,omitempty"`
	Explanation   string    `json:"explanation"`
	SourceTime    time.Time `json:"source_time,omitempty"`
	Status        string    `json:"status"`
	Limitations   string    `json:"limitations"`
}

type AgentFinding struct {
	Text        string   `json:"text"`
	EvidenceIDs []string `json:"evidence_ids"`
	Kind        string   `json:"kind"`
}

type AgentResult struct {
	CaseID                      string           `json:"case_id"`
	Mode                        string           `json:"mode"`
	Summary                     string           `json:"summary"`
	Findings                    []AgentFinding   `json:"findings"`
	MissingEvidence             []string         `json:"missing_evidence"`
	NextChecks                  []string         `json:"next_checks"`
	Evidence                    []Evidence       `json:"evidence"`
	ToolCalls                   []map[string]any `json:"tool_calls"`
	RequiresAnalystConfirmation bool             `json:"requires_analyst_confirmation"`
	Disclaimer                  string           `json:"disclaimer"`
}

type Case struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AuditEvent struct {
	ID            string    `json:"id"`
	CaseID        string    `json:"case_id"`
	TransactionID string    `json:"transaction_id"`
	Action        string    `json:"action"`
	Rationale     string    `json:"rationale,omitempty"`
	Actor         string    `json:"actor"`
	At            time.Time `json:"at"`
}
