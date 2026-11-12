package delivery

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

func TestWorkerRetriesThenDeliversWithoutLosingTrace(t *testing.T) {
	attempts := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts == 1 {
			http.Error(w, "try later", http.StatusServiceUnavailable)
			return
		}
		if r.Header.Get("X-Sentinel-API-Key") != "project-key" {
			t.Errorf("missing forwarded API key")
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer upstream.Close()

	store := openStore(t)
	_, _ = store.Enqueue(context.Background(), queue.Item{ID: "trace-42", APIKey: "project-key", Body: []byte(`{}`)})
	worker := testWorker(store, upstream.URL)
	worker.backoff = func(int) time.Duration { return 0 }

	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.Pending() != 1 {
		t.Fatalf("pending after retry = %d, want 1", store.Pending())
	}
	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.Pending() != 0 || attempts != 2 {
		t.Fatalf("pending = %d attempts = %d", store.Pending(), attempts)
	}
}

func TestWorkerDeadLettersPermanentFailure(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "bad payload", http.StatusUnprocessableEntity)
	}))
	defer upstream.Close()

	store := openStore(t)
	_, _ = store.Enqueue(context.Background(), queue.Item{ID: "invalid", APIKey: "project-key", Body: []byte(`{}`)})
	worker := testWorker(store, upstream.URL)

	if err := worker.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if store.Pending() != 0 {
		t.Fatalf("pending = %d, want 0", store.Pending())
	}
	result, err := store.Enqueue(context.Background(), queue.Item{ID: "invalid", APIKey: "project-key", Body: []byte(`{}`)})
	if err != nil || !result.Duplicate {
		t.Fatalf("dead letter should suppress duplicate: %+v %v", result, err)
	}
}

func TestWorkerReturnsEmptyWhenNoWorkExists(t *testing.T) {
	worker := testWorker(openStore(t), "http://127.0.0.1:1")
	if err := worker.RunOnce(context.Background()); !errors.Is(err, spool.ErrEmpty) {
		t.Fatalf("error = %v, want spool.ErrEmpty", err)
	}
}

func openStore(t *testing.T) *spool.Spool {
	t.Helper()
	store, err := spool.Open(t.TempDir(), 10)
	if err != nil {
		t.Fatal(err)
	}
	return store
}

func testWorker(store Store, upstreamURL string) *Worker {
	return New(store, http.DefaultClient, Config{
		UpstreamURL: upstreamURL,
		Workers:     1,
		MaxAttempts: 3,
		PollEvery:   time.Millisecond,
		BaseBackoff: time.Millisecond,
		MaxBackoff:  time.Second,
	}, slog.New(slog.NewTextHandler(io.Discard, nil)), metrics.New())
}
