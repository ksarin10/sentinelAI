package delivery

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"math/rand/v2"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

type Store interface {
	Claim(context.Context, time.Time) (*spool.Lease, error)
	Ack(*spool.Lease, time.Time) error
	Retry(*spool.Lease, time.Time) error
	DeadLetter(*spool.Lease, string, time.Time) error
}

type Config struct {
	UpstreamURL string
	Workers     int
	MaxAttempts int
	PollEvery   time.Duration
	BaseBackoff time.Duration
	MaxBackoff  time.Duration
	Clock       func() time.Time
	RetryDelay  func(int) time.Duration
}

type Worker struct {
	store   Store
	client  *http.Client
	config  Config
	logger  *slog.Logger
	metrics *metrics.Registry
	now     func() time.Time
	backoff func(int) time.Duration
}

func New(store Store, client *http.Client, config Config, logger *slog.Logger, registry *metrics.Registry) *Worker {
	worker := &Worker{store: store, client: client, config: config, logger: logger, metrics: registry, now: time.Now}
	worker.backoff = worker.exponentialBackoff
	if config.Clock != nil {
		worker.now = config.Clock
	}
	if config.RetryDelay != nil {
		worker.backoff = config.RetryDelay
	}
	return worker
}

func (w *Worker) Run(ctx context.Context) {
	var group sync.WaitGroup
	for id := 0; id < w.config.Workers; id++ {
		group.Add(1)
		go func(workerID int) {
			defer group.Done()
			w.runLoop(ctx, workerID)
		}(id)
	}
	group.Wait()
}

func (w *Worker) RunOnce(ctx context.Context) error {
	lease, err := w.store.Claim(ctx, w.now())
	if err != nil {
		return err
	}
	return w.deliver(ctx, lease)
}

func (w *Worker) runLoop(ctx context.Context, workerID int) {
	for {
		err := w.RunOnce(ctx)
		if err == nil {
			continue
		}
		if !errors.Is(err, spool.ErrEmpty) {
			w.logger.Error("delivery attempt failed", "worker", workerID, "error", err)
		}
		timer := time.NewTimer(w.config.PollEvery)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
	}
}

func (w *Worker) deliver(ctx context.Context, lease *spool.Lease) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(w.config.UpstreamURL, "/")+"/api/ingest/traces", bytes.NewReader(lease.Item.Body))
	if err != nil {
		return w.deadLetter(lease, "build upstream request: "+err.Error())
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Idempotency-Key", lease.Item.ID)
	if lease.Item.Authorization != "" {
		request.Header.Set("Authorization", lease.Item.Authorization)
	}
	if lease.Item.APIKey != "" {
		request.Header.Set("X-Sentinel-API-Key", lease.Item.APIKey)
	}

	response, err := w.client.Do(request)
	if err != nil {
		return w.retry(lease, "upstream request: "+err.Error())
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 64<<10))

	if response.StatusCode >= 200 && response.StatusCode < 300 {
		if err := w.store.Ack(lease, w.now()); err != nil {
			return err
		}
		w.metrics.Delivery("delivered")
		return nil
	}
	if isPermanent(response.StatusCode) {
		return w.deadLetter(lease, fmt.Sprintf("upstream returned %d", response.StatusCode))
	}
	return w.retry(lease, fmt.Sprintf("upstream returned %d", response.StatusCode))
}

func (w *Worker) retry(lease *spool.Lease, reason string) error {
	if lease.Item.Attempts+1 >= w.config.MaxAttempts {
		return w.deadLetter(lease, reason+"; retry budget exhausted")
	}
	nextAttempt := w.now().Add(w.backoff(lease.Item.Attempts + 1))
	if err := w.store.Retry(lease, nextAttempt); err != nil {
		return fmt.Errorf("persist retry after %s: %w", reason, err)
	}
	w.metrics.Delivery("retry")
	return nil
}

func (w *Worker) deadLetter(lease *spool.Lease, reason string) error {
	if err := w.store.DeadLetter(lease, reason, w.now()); err != nil {
		return fmt.Errorf("persist dead letter: %w", err)
	}
	w.logger.Warn("trace moved to dead letter", "id", lease.Item.ID, "reason", reason)
	w.metrics.Delivery("dead_letter")
	return nil
}

func (w *Worker) exponentialBackoff(attempt int) time.Duration {
	exponent := math.Pow(2, float64(max(attempt-1, 0)))
	delay := time.Duration(float64(w.config.BaseBackoff) * exponent)
	if delay > w.config.MaxBackoff {
		delay = w.config.MaxBackoff
	}
	// Jitter prevents all workers from retrying together after an upstream outage.
	return time.Duration(rand.Float64() * float64(delay))
}

func isPermanent(status int) bool {
	return status >= 400 && status < 500 && status != http.StatusRequestTimeout && status != http.StatusTooManyRequests
}
