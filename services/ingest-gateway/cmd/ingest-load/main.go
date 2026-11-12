package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/httpapi"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

type report struct {
	Requests          int     `json:"requests"`
	Concurrency       int     `json:"concurrency"`
	DurationSeconds   float64 `json:"durationSeconds"`
	ThroughputPerSec  float64 `json:"throughputPerSecond"`
	P50Milliseconds   float64 `json:"p50Milliseconds"`
	P95Milliseconds   float64 `json:"p95Milliseconds"`
	P99Milliseconds   float64 `json:"p99Milliseconds"`
	Errors            int64   `json:"errors"`
	PendingAfterRun   int     `json:"pendingAfterRun"`
	PayloadBytes      int     `json:"payloadBytes"`
	Durability        string  `json:"durability"`
	OperatingSystem   string  `json:"operatingSystem"`
	Architecture      string  `json:"architecture"`
	LogicalProcessors int     `json:"logicalProcessors"`
	GoVersion         string  `json:"goVersion"`
}

func main() {
	requests := flag.Int("requests", 500, "number of unique traces")
	concurrency := flag.Int("concurrency", runtime.NumCPU(), "concurrent HTTP clients")
	flag.Parse()
	if *requests < 1 || *concurrency < 1 {
		fmt.Fprintln(os.Stderr, "requests and concurrency must be positive")
		os.Exit(2)
	}

	directory, err := os.MkdirTemp("", "sentinelai-ingest-load-*")
	check(err)
	defer os.RemoveAll(directory)
	store, err := spool.Open(directory, *requests+1)
	check(err)
	server := httptest.NewServer(httpapi.New(store, metrics.New()).Handler())
	defer server.Close()

	payload := []byte(`{"name":"support.answer","provider":"openai","model":"gpt-4.1-mini","prompt":"Where is my order?","response":"It ships today.","latencyMs":125,"tokens":{"promptTokens":12,"completionTokens":8}}`)
	client := &http.Client{Transport: &http.Transport{
		MaxIdleConns:        *concurrency,
		MaxIdleConnsPerHost: *concurrency,
		MaxConnsPerHost:     *concurrency,
	}}

	jobs := make(chan int)
	latencies := make([]time.Duration, *requests)
	var failures atomic.Int64
	var workers sync.WaitGroup
	start := time.Now()
	for workerID := 0; workerID < *concurrency; workerID++ {
		workers.Add(1)
		go func() {
			defer workers.Done()
			for index := range jobs {
				request, err := http.NewRequest(http.MethodPost, server.URL+"/v1/traces", bytes.NewReader(payload))
				if err != nil {
					failures.Add(1)
					continue
				}
				request.Header.Set("Content-Type", "application/json")
				request.Header.Set("X-Sentinel-API-Key", "load-test-key")
				request.Header.Set("Idempotency-Key", fmt.Sprintf("load-test-%d", index))
				requestStart := time.Now()
				response, err := client.Do(request)
				latencies[index] = time.Since(requestStart)
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
	for index := 0; index < *requests; index++ {
		jobs <- index
	}
	close(jobs)
	workers.Wait()
	duration := time.Since(start)

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	result := report{
		Requests:          *requests,
		Concurrency:       *concurrency,
		DurationSeconds:   rounded(duration.Seconds()),
		ThroughputPerSec:  rounded(float64(*requests) / duration.Seconds()),
		P50Milliseconds:   rounded(percentile(latencies, 0.50).Seconds() * 1000),
		P95Milliseconds:   rounded(percentile(latencies, 0.95).Seconds() * 1000),
		P99Milliseconds:   rounded(percentile(latencies, 0.99).Seconds() * 1000),
		Errors:            failures.Load(),
		PendingAfterRun:   store.Pending(),
		PayloadBytes:      len(payload),
		Durability:        "file fsync + atomic rename before HTTP 202",
		OperatingSystem:   runtime.GOOS,
		Architecture:      runtime.GOARCH,
		LogicalProcessors: runtime.NumCPU(),
		GoVersion:         runtime.Version(),
	}
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	check(encoder.Encode(result))
}

func percentile(values []time.Duration, fraction float64) time.Duration {
	index := int(float64(len(values)-1) * fraction)
	return values[index]
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
