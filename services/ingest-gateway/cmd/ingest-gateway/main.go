package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/delivery"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/httpapi"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/metrics"
	"github.com/ksarin10/sentinelAI/services/ingest-gateway/internal/spool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	spoolSecret := os.Getenv("INGEST_SPOOL_SECRET")
	if len(spoolSecret) < 32 {
		logger.Error("INGEST_SPOOL_SECRET must be set to at least 32 characters")
		os.Exit(1)
	}
	store, err := spool.OpenEncrypted(env("INGEST_SPOOL_DIR", "/var/lib/sentinelai-ingest"), envInt("INGEST_MAX_PENDING", 100_000), spoolSecret)
	if err != nil {
		logger.Error("open durable spool", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	registry := metrics.New()

	worker := delivery.New(store, &http.Client{Timeout: 10 * time.Second}, delivery.Config{
		UpstreamURL: env("INGEST_UPSTREAM_URL", "http://api:4000"),
		Workers:     envInt("INGEST_WORKERS", 8),
		MaxAttempts: envInt("INGEST_MAX_ATTEMPTS", 12),
		PollEvery:   100 * time.Millisecond,
		BaseBackoff: 250 * time.Millisecond,
		MaxBackoff:  30 * time.Second,
	}, logger, registry)
	go worker.Run(ctx)

	server := &http.Server{
		Addr:              env("INGEST_ADDR", ":4100"),
		Handler:           httpapi.New(store, registry).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	go func() {
		logger.Info("ingestion gateway listening", "address", server.Addr, "pending", store.Pending())
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("ingestion gateway stopped", "error", err)
			stop()
		}
	}()

	adminMux := http.NewServeMux()
	adminMux.Handle("GET /metrics", registry.Handler(store.Pending))
	adminMux.HandleFunc("GET /debug/pprof/", pprof.Index)
	adminMux.HandleFunc("GET /debug/pprof/cmdline", pprof.Cmdline)
	adminMux.HandleFunc("GET /debug/pprof/profile", pprof.Profile)
	adminMux.HandleFunc("GET /debug/pprof/symbol", pprof.Symbol)
	adminMux.HandleFunc("GET /debug/pprof/trace", pprof.Trace)
	adminMux.Handle("GET /debug/pprof/goroutine", pprof.Handler("goroutine"))
	adminMux.Handle("GET /debug/pprof/heap", pprof.Handler("heap"))
	adminMux.Handle("GET /debug/pprof/allocs", pprof.Handler("allocs"))
	adminServer := &http.Server{
		Addr:              env("INGEST_ADMIN_ADDR", ":4101"),
		Handler:           adminMux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		logger.Info("ingestion admin server listening", "address", adminServer.Addr)
		if err := adminServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("ingestion admin server stopped", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		logger.Error("graceful shutdown failed", "error", err)
	}
	if err := adminServer.Shutdown(shutdownContext); err != nil {
		logger.Error("admin server graceful shutdown failed", "error", err)
	}
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func envInt(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
