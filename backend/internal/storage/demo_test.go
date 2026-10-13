package storage

import (
	"reflect"
	"testing"

	"github.com/verityflow-ai/verityflow/internal/fraud"
)

func TestDemoTransactionsAreStableAndVaried(t *testing.T) {
	first := NewDemoStore().Transactions
	second := NewDemoStore().Transactions
	if len(first) != 72 {
		t.Fatalf("got %d transactions, want 72", len(first))
	}
	if !reflect.DeepEqual(first, second) {
		t.Fatal("demo transactions should be stable across store initialization")
	}

	merchants := make(map[string]bool)
	categories := make(map[string]bool)
	locations := make(map[string]bool)
	hasLargeAmount, hasLateHour := false, false
	for _, transaction := range first {
		merchants[transaction.Merchant] = true
		categories[transaction.Category] = true
		locations[transaction.City+", "+transaction.State] = true
		hasLargeAmount = hasLargeAmount || transaction.Amount >= fraud.HighAmountThreshold
		hasLateHour = hasLateHour || fraud.IsUnusualHour(transaction.Timestamp)
	}
	if len(merchants) < 12 || len(categories) != 6 || len(locations) < 8 {
		t.Fatalf("fixture variety too low: %d merchants, %d categories, %d locations", len(merchants), len(categories), len(locations))
	}
	if !hasLargeAmount || !hasLateHour {
		t.Fatal("fixtures should include high-amount and late-hour rule examples")
	}
}