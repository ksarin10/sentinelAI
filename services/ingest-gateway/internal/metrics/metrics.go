package metrics

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"
)

var latencyBounds = [...]time.Duration{
	100 * time.Microsecond,
	250 * time.Microsecond,
	500 * time.Microsecond,
	1 * time.Millisecond,
	2500 * time.Microsecond,
	5 * time.Millisecond,
	10 * time.Millisecond,
	25 * time.Millisecond,
	50 * time.Millisecond,
}

type Registry struct {
	accepted       atomic.Uint64
	duplicates     atomic.Uint64
	overload       atomic.Uint64
	tenantOverload atomic.Uint64
	invalid        atomic.Uint64
	delivered      atomic.Uint64
	retried        atomic.Uint64
	deadLetters    atomic.Uint64
	ingressLatency [len(latencyBounds) + 1]atomic.Uint64
}

func New() *Registry {
	return &Registry{}
}

func (r *Registry) Ingress(result string, duration time.Duration) {
	switch result {
	case "accepted":
		r.accepted.Add(1)
	case "duplicate":
		r.duplicates.Add(1)
	case "overload":
		r.overload.Add(1)
	case "tenant_overload":
		r.tenantOverload.Add(1)
	default:
		r.invalid.Add(1)
	}
	for index, bound := range latencyBounds {
		if duration <= bound {
			r.ingressLatency[index].Add(1)
			return
		}
	}
	r.ingressLatency[len(latencyBounds)].Add(1)
}

func (r *Registry) Delivery(result string) {
	switch result {
	case "delivered":
		r.delivered.Add(1)
	case "retry":
		r.retried.Add(1)
	case "dead_letter":
		r.deadLetters.Add(1)
	}
}

func (r *Registry) Handler(pending func() int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = fmt.Fprintln(w, "# HELP sentinel_ingest_requests_total Ingestion requests by result.")
		_, _ = fmt.Fprintln(w, "# TYPE sentinel_ingest_requests_total counter")
		writeCounter(w, "sentinel_ingest_requests_total", "accepted", r.accepted.Load())
		writeCounter(w, "sentinel_ingest_requests_total", "duplicate", r.duplicates.Load())
		writeCounter(w, "sentinel_ingest_requests_total", "overload", r.overload.Load())
		writeCounter(w, "sentinel_ingest_requests_total", "tenant_overload", r.tenantOverload.Load())
		writeCounter(w, "sentinel_ingest_requests_total", "invalid", r.invalid.Load())
		_, _ = fmt.Fprintln(w, "# HELP sentinel_ingest_queue_pending Traces waiting or in flight.")
		_, _ = fmt.Fprintln(w, "# TYPE sentinel_ingest_queue_pending gauge")
		_, _ = fmt.Fprintf(w, "sentinel_ingest_queue_pending %d\n", pending())
		_, _ = fmt.Fprintln(w, "# HELP sentinel_ingest_delivery_total Delivery outcomes.")
		_, _ = fmt.Fprintln(w, "# TYPE sentinel_ingest_delivery_total counter")
		writeCounter(w, "sentinel_ingest_delivery_total", "delivered", r.delivered.Load())
		writeCounter(w, "sentinel_ingest_delivery_total", "retry", r.retried.Load())
		writeCounter(w, "sentinel_ingest_delivery_total", "dead_letter", r.deadLetters.Load())
		_, _ = fmt.Fprintln(w, "# HELP sentinel_ingest_request_duration_seconds Durable intake latency.")
		_, _ = fmt.Fprintln(w, "# TYPE sentinel_ingest_request_duration_seconds histogram")
		var cumulative uint64
		for index, bound := range latencyBounds {
			cumulative += r.ingressLatency[index].Load()
			_, _ = fmt.Fprintf(w, "sentinel_ingest_request_duration_seconds_bucket{le=\"%.6f\"} %d\n", bound.Seconds(), cumulative)
		}
		cumulative += r.ingressLatency[len(latencyBounds)].Load()
		_, _ = fmt.Fprintf(w, "sentinel_ingest_request_duration_seconds_bucket{le=\"+Inf\"} %d\n", cumulative)
	})
}

func writeCounter(w http.ResponseWriter, name, result string, value uint64) {
	_, _ = fmt.Fprintf(w, "%s{result=\"%s\"} %d\n", name, result, value)
}
