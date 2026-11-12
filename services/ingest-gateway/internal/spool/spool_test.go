package spool

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

func TestEnqueueIsDurableAndIdempotentAcrossRestart(t *testing.T) {
	root := t.TempDir()
	item := queue.Item{ID: "trace-42", APIKey: "project-key", Body: []byte(`{"name":"test"}`)}

	first := openTestSpool(t, root, 10)
	result, err := first.Enqueue(context.Background(), item)
	if err != nil || result.Duplicate {
		t.Fatalf("first enqueue = %+v, %v", result, err)
	}

	reopened := openTestSpool(t, root, 10)
	result, err = reopened.Enqueue(context.Background(), item)
	if err != nil || !result.Duplicate {
		t.Fatalf("duplicate enqueue = %+v, %v", result, err)
	}
	if reopened.Pending() != 1 {
		t.Fatalf("pending = %d, want 1", reopened.Pending())
	}
}

func TestRecoveryReturnsClaimedWorkToReadyQueue(t *testing.T) {
	root := t.TempDir()
	spool := openTestSpool(t, root, 10)
	item := queue.Item{ID: "trace-42", APIKey: "project-key", Body: []byte(`{}`)}
	_, _ = spool.Enqueue(context.Background(), item)
	claimed, err := spool.Claim(context.Background(), time.Now())
	if err != nil || claimed.Item.ID != item.ID {
		t.Fatalf("claim = %+v, %v", claimed, err)
	}

	reopened := openTestSpool(t, root, 10)
	recovered, err := reopened.Claim(context.Background(), time.Now())
	if err != nil || recovered.Item.ID != item.ID {
		t.Fatalf("recovered claim = %+v, %v", recovered, err)
	}
}

func TestAckLeavesReceiptThatSuppressesRedelivery(t *testing.T) {
	root := t.TempDir()
	spool := openTestSpool(t, root, 10)
	item := queue.Item{ID: "trace-42", APIKey: "project-key", Body: []byte(`{}`)}
	_, _ = spool.Enqueue(context.Background(), item)
	claimed, _ := spool.Claim(context.Background(), time.Now())
	if err := spool.Ack(claimed, time.Now()); err != nil {
		t.Fatal(err)
	}

	reopened := openTestSpool(t, root, 10)
	result, err := reopened.Enqueue(context.Background(), item)
	if err != nil || !result.Duplicate {
		t.Fatalf("enqueue after ack = %+v, %v", result, err)
	}
	if reopened.Pending() != 0 {
		t.Fatalf("pending = %d, want 0", reopened.Pending())
	}
}

func TestCapacityRejectsWithoutDroppingAcceptedWork(t *testing.T) {
	spool := openTestSpool(t, t.TempDir(), 1)
	_, err := spool.Enqueue(context.Background(), queue.Item{ID: "one", APIKey: "key", Body: []byte(`{}`)})
	if err != nil {
		t.Fatal(err)
	}
	_, err = spool.Enqueue(context.Background(), queue.Item{ID: "two", APIKey: "key", Body: []byte(`{}`)})
	if !errors.Is(err, queue.ErrFull) {
		t.Fatalf("error = %v, want queue.ErrFull", err)
	}
	if spool.Pending() != 1 {
		t.Fatalf("pending = %d, want 1", spool.Pending())
	}
}

func TestRetryPersistsAttemptAndDelay(t *testing.T) {
	spool := openTestSpool(t, t.TempDir(), 10)
	_, _ = spool.Enqueue(context.Background(), queue.Item{ID: "trace-42", APIKey: "key", Body: []byte(`{}`)})
	lease, _ := spool.Claim(context.Background(), time.Now())
	next := time.Now().Add(time.Minute)
	if err := spool.Retry(lease, next); err != nil {
		t.Fatal(err)
	}
	if _, err := spool.Claim(context.Background(), next.Add(-time.Second)); !errors.Is(err, ErrEmpty) {
		t.Fatalf("early claim error = %v, want ErrEmpty", err)
	}
	retried, err := spool.Claim(context.Background(), next.Add(time.Second))
	if err != nil || retried.Item.Attempts != 1 {
		t.Fatalf("retried lease = %+v, %v", retried, err)
	}
}

func openTestSpool(t *testing.T, root string, capacity int) *Spool {
	t.Helper()
	spool, err := Open(root, capacity)
	if err != nil {
		t.Fatal(err)
	}
	return spool
}
