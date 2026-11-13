package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/delivery"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/httpapi"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

const chaosSecret = "chaos-test-secret-with-at-least-32-characters"

type sinkState struct {
	mu             sync.Mutex
	available      bool
	unique         map[string]struct{}
	outageRequests int
	duplicates     int
}

type report struct {
	Accepted                   int     `json:"accepted"`
	OutageRetryAttempts        int     `json:"outageRetryAttempts"`
	RecoveredUniqueEffects     int     `json:"recoveredUniqueEffects"`
	DuplicateTransportDelivery int     `json:"duplicateTransportDelivery"`
	Lost                       int     `json:"lost"`
	PendingAfterRecovery       int     `json:"pendingAfterRecovery"`
	Errors                     int64   `json:"errors"`
	DurationSeconds            float64 `json:"durationSeconds"`
	Scenario                   string  `json:"scenario"`
}

func main() {
	traceCount := flag.Int("traces", 250, "number of traces to accept during the outage")
	concurrency := flag.Int("concurrency", 12, "concurrent ingestion clients")
	flag.Parse()
	if *traceCount < 2 || *concurrency < 1 {
		fmt.Fprintln(os.Stderr, "traces must be at least 2 and concurrency must be positive")
		os.Exit(2)
	}
	started := time.Now()
	root, err := os.MkdirTemp("", "sentinelai-chaos-*")
	check(err)
	defer os.RemoveAll(root)

	store, err := spool.OpenWithLimits(root, *traceCount+1, *traceCount+1, chaosSecret)
	check(err)
	registry := metrics.New()
	gateway := httptest.NewServer(httpapi.New(store, registry).Handler())
	defer gateway.Close()

	var failures atomic.Int64
	submit(gateway.URL, *traceCount, *concurrency, &failures)
	if store.Pending() != *traceCount {
		failures.Add(1)
	}

	sink := &sinkState{unique: make(map[string]struct{})}
	upstream := httptest.NewServer(http.HandlerFunc(sink.handle))
	defer upstream.Close()
	clock := time.Now().UTC()
	worker := chaosWorker(store, upstream.URL, registry, func() time.Time { return clock })
	for index := 0; index < *traceCount; index++ {
		if err := worker.RunOnce(context.Background()); err != nil {
			failures.Add(1)
		}
	}

	// Simulate the hardest ambiguity: upstream accepted a trace, then the
	// process died before it could persist the receipt.
	clock = clock.Add(2 * time.Hour)
	crashedLease, err := store.Claim(context.Background(), clock)
	check(err)
	sink.setAvailable(true)
	sink.accept(crashedLease.Item.Body)

	// Opening the same spool represents a fresh process. Recovery returns the
	// unacknowledged processing file to the ready queue.
	restarted, err := spool.OpenWithLimits(root, *traceCount+1, *traceCount+1, chaosSecret)
	check(err)
	recoveryWorker := chaosWorker(restarted, upstream.URL, registry, func() time.Time { return clock })
	for restarted.Pending() > 0 {
		if err := recoveryWorker.RunOnce(context.Background()); err != nil {
			failures.Add(1)
			break
		}
	}

	sink.mu.Lock()
	unique := len(sink.unique)
	result := report{
		Accepted:                   *traceCount,
		OutageRetryAttempts:        sink.outageRequests,
		RecoveredUniqueEffects:     unique,
		DuplicateTransportDelivery: sink.duplicates,
		Lost:                       *traceCount - unique,
		PendingAfterRecovery:       restarted.Pending(),
		Errors:                     failures.Load(),
		DurationSeconds:            rounded(time.Since(started).Seconds()),
		Scenario:                   "backend outage, retry persistence, success-before-ack crash, process restart",
	}
	sink.mu.Unlock()

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	check(encoder.Encode(result))
	if result.Lost != 0 || result.PendingAfterRecovery != 0 || result.Errors != 0 || result.DuplicateTransportDelivery != 1 {
		os.Exit(1)
	}
}

func submit(baseURL string, count, concurrency int, failures *atomic.Int64) {
	jobs := make(chan int)
	client := &http.Client{Timeout: 10 * time.Second}
	var group sync.WaitGroup
	for workerID := 0; workerID < concurrency; workerID++ {
		group.Add(1)
		go func() {
			defer group.Done()
			for index := range jobs {
				payload := []byte(`{"name":"chaos.trace","provider":"test","model":"test","prompt":"survive the outage","latencyMs":1}`)
				request, err := http.NewRequest(http.MethodPost, baseURL+"/v1/traces", bytes.NewReader(payload))
				if err != nil {
					failures.Add(1)
					continue
				}
				request.Header.Set("X-Sentinel-API-Key", "chaos-project-key")
				request.Header.Set("Idempotency-Key", fmt.Sprintf("chaos-%06d", index))
				response, err := client.Do(request)
				if err != nil {
					failures.Add(1)
					continue
				}
				_, _ = io.Copy(io.Discard, response.Body)
				_ = response.Body.Close()
				if response.StatusCode != http.StatusAccepted {
					failures.Add(1)
				}
			}
		}()
	}
	for index := 0; index < count; index++ {
		jobs <- index
	}
	close(jobs)
	group.Wait()
}

func chaosWorker(store delivery.Store, upstreamURL string, registry *metrics.Registry, clock func() time.Time) *delivery.Worker {
	return delivery.New(store, &http.Client{Timeout: 5 * time.Second}, delivery.Config{
		UpstreamURL: upstreamURL,
		Workers:     1,
		MaxAttempts: 5,
		PollEvery:   time.Millisecond,
		BaseBackoff: time.Hour,
		MaxBackoff:  time.Hour,
		Clock:       clock,
		RetryDelay:  func(int) time.Duration { return time.Hour },
	}, slog.New(slog.NewTextHandler(io.Discard, nil)), registry)
}

func (s *sinkState) handle(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "read request", http.StatusBadRequest)
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.available {
		s.outageRequests++
		http.Error(w, "database unavailable", http.StatusServiceUnavailable)
		return
	}
	duplicate := s.acceptLocked(body)
	if duplicate {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (s *sinkState) accept(body []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.acceptLocked(body)
}

func (s *sinkState) acceptLocked(body []byte) bool {
	var payload struct {
		ExternalID string `json:"externalId"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || payload.ExternalID == "" {
		return false
	}
	if _, exists := s.unique[payload.ExternalID]; exists {
		s.duplicates++
		return true
	}
	s.unique[payload.ExternalID] = struct{}{}
	return false
}

func (s *sinkState) setAvailable(available bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.available = available
}

func rounded(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}

func check(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
