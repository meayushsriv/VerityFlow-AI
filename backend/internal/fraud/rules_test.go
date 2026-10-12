package fraud

import (
	"testing"
	"time"
	"github.com/verityflow-ai/verityflow/internal/models"
)
func TestFindingsHighAmountAndLateHour(t *testing.T) { tx:=models.Transaction{Amount:1600,Timestamp:time.Date(2026,1,1,2,0,0,0,time.UTC)}; got:=Findings(tx);if len(got)!=2{t.Fatalf("got %d findings, want 2",len(got))} }
func TestFindingsNormalTransaction(t *testing.T) { tx:=models.Transaction{Amount:20,Timestamp:time.Date(2026,1,1,14,0,0,0,time.UTC)};if got:=Findings(tx);len(got)!=0{t.Fatalf("got %d findings, want none",len(got))} }
