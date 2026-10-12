package fraud

import (
	"fmt"
	"time"

	"github.com/verityflow-ai/verityflow/internal/models"
)

// Findings use only transaction fields and a documented demo threshold; they are not proof of fraud.
const HighAmountThreshold = 1500.0

func Findings(t models.Transaction) []models.RuleFinding {
	findings := make([]models.RuleFinding, 0, 2)
	if t.Amount >= HighAmountThreshold {
		findings = append(findings, models.RuleFinding{Code: "amount_outlier", Title: "High amount review", Evidence: fmt.Sprintf("$%.2f is at or above the demo review threshold of $%.2f.", t.Amount, HighAmountThreshold), Severity: "review"})
	}
	if hour := t.Timestamp.Hour(); hour < 5 || hour >= 23 {
		findings = append(findings, models.RuleFinding{Code: "late_hour", Title: "Unusual local hour", Evidence: fmt.Sprintf("Timestamp hour is %02d:00 in the dataset's local-time representation.", hour), Severity: "review"})
	}
	if findings == nil { return []models.RuleFinding{} }
	return findings
}

func IsUnusualHour(ts time.Time) bool { h := ts.Hour(); return h < 5 || h >= 23 }
