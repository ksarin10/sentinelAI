package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/queue"
)

type recordingQueue struct {
	item   queue.Item
	result queue.EnqueueResult
	err    error
}

func (q *recordingQueue) Enqueue(_ context.Context, item queue.Item) (queue.EnqueueResult, error) {
	q.item = item
	return q.result, q.err
}

func TestIngestRequiresIdempotencyKey(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/traces", strings.NewReader(`{}`))
	request.Header.Set("X-API-Key", "secret")

	New(&recordingQueue{}, metrics.New()).Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
}

func TestIngestInjectsExternalIDAndAccepts(t *testing.T) {
	q := &recordingQueue{}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/traces", strings.NewReader(`{"name":"support.answer"}`))
	request.Header.Set("X-API-Key", "secret")
	request.Header.Set("Idempotency-Key", "app-a/trace-42")
	request.Header.Set("X-Sentinel-Source", "support-api")

	New(q, metrics.New()).Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusAccepted {
		t.Fatalf("status = %d, want %d: %s", recorder.Code, http.StatusAccepted, recorder.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(q.item.Body, &body); err != nil {
		t.Fatal(err)
	}
	if body["externalId"] != "app-a/trace-42" {
		t.Fatalf("externalId = %v", body["externalId"])
	}
	if q.item.SourceApp != "support-api" {
		t.Fatalf("source app = %q", q.item.SourceApp)
	}
}

func TestIngestReturnsRetryableOverload(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/traces", strings.NewReader(`{}`))
	request.Header.Set("X-API-Key", "secret")
	request.Header.Set("Idempotency-Key", "trace-42")

	New(&recordingQueue{err: queue.ErrFull}, metrics.New()).Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable || recorder.Header().Get("Retry-After") != "1" {
		t.Fatalf("status = %d retry-after = %q", recorder.Code, recorder.Header().Get("Retry-After"))
	}
}

func TestIngestReturnsProjectSpecificOverload(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/v1/traces", strings.NewReader(`{}`))
	request.Header.Set("X-Sentinel-API-Key", "secret")
	request.Header.Set("Idempotency-Key", "trace-42")

	New(&recordingQueue{err: queue.ErrTenantFull}, metrics.New()).Handler().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusTooManyRequests || recorder.Header().Get("Retry-After") != "1" {
		t.Fatalf("status = %d retry-after = %q", recorder.Code, recorder.Header().Get("Retry-After"))
	}
}
